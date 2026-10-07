/**
 * PaperTradingContext.tsx
 *
 * A simulated ("paper") trading account for LEARNING — fake money, no real
 * orders. Supports BOTH directions like real intraday:
 *   - LONG  : buy to open, sell to close  (profit if price rises)
 *   - SHORT : sell to open, buy to close   (profit if price falls)
 *
 * INTRADAY LEVERAGE (5x): opening a position only reserves MARGIN = value / 5
 * from the balance (not the full value), mirroring how intraday margin works —
 * a small deposit controls a larger position. Profit/loss is on the FULL
 * position, so gains and losses are amplified relative to the margin. Closing
 * returns the margin adjusted by the full P&L.
 *
 * NOTE (taught in the intraday lessons): real brokers vary leverage by stock
 * and volatility (e.g. up to ~8x); we use a flat 5x here for simplicity. Fills
 * here happen at the live price with no slippage — real large market orders can
 * fill at a worse average price because they consume the order book.
 *
 * Stored in the browser (localStorage): per-device, persists until reset.
 * Educational only — it records what happened, never judges or advises.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { computeCharges } from "@/lib/charges";
import { isMarketLive, isPastSquareOff } from "@/lib/market-hours";

const STARTING_BALANCE = 100000; // INR 1,00,000 virtual
const STORAGE_KEY = "stocksahi-paper";
const LEVERAGE = 5; // flat 5x intraday leverage

export type Direction = "long" | "short";

export interface OpenPosition {
  id: string;
  symbol: string;
  name: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  entryTime: number; // unix ms
  leverage: number;
  marginUsed: number; // capital reserved at open (value / leverage)
  note?: string;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  name: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  leverage: number;
  marginUsed: number;
  grossPnl: number; // P&L from price move alone, before charges
  charges: number; // simulated broker charges (what a real broker would deduct)
  pnl: number; // NET P&L = grossPnl - charges
  pnlPercent: number; // return on the margin you put up (leveraged), net of charges
  holdMs: number;
  autoExited?: boolean; // true if the broker auto-squared-off at the 3:05 cutoff
  note?: string;
}

interface PaperState {
  balance: number;
  open: OpenPosition[];
  closed: ClosedTrade[];
}

interface PaperContextValue extends PaperState {
  ready: boolean;
  invested: number;  // total margin currently tied up
  exposure: number;  // total position value controlled
  leverage: number;  // current leverage (5x)
  openPosition: (args: {
    symbol: string;
    name: string;
    direction: Direction;
    quantity: number;
    price: number;
    note?: string;
    leverage?: number;
  }) => { ok: boolean; error?: string };
  closePosition: (positionId: string, price: number) => { ok: boolean; error?: string };
  autoSquareOff: (positionId: string, price: number) => { ok: boolean; error?: string };
  reset: () => void;
}

const PaperContext = createContext<PaperContextValue | null>(null);

const freshState = (): PaperState => ({
  balance: STARTING_BALANCE,
  open: [],
  closed: [],
});

/** P&L for a position given an exit price. Long profits when price rises; short when it falls. */
function pnlFor(direction: Direction, entry: number, exit: number, qty: number): number {
  return direction === "long" ? (exit - entry) * qty : (entry - exit) * qty;
}

// Migrate older saved positions that predate leverage fields.
function migrate(state: PaperState): PaperState {
  return {
    ...state,
    open: (state.open || []).map((p) => ({
      ...p,
      leverage: p.leverage ?? 1,
      marginUsed: p.marginUsed ?? p.quantity * p.entryPrice,
    })),
    closed: (state.closed || []).map((t) => ({
      ...t,
      leverage: t.leverage ?? 1,
      marginUsed: t.marginUsed ?? t.quantity * t.entryPrice,
      // Trades closed before charges existed: no charges were applied, so the
      // recorded pnl was already the gross (and net) figure.
      charges: t.charges ?? 0,
      grossPnl: t.grossPnl ?? t.pnl,
    })),
  };
}

export function PaperTradingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaperState>(freshState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PaperState;
        if (
          typeof parsed.balance === "number" &&
          Array.isArray(parsed.open) &&
          Array.isArray(parsed.closed)
        ) {
          setState(migrate(parsed));
        }
      }
    } catch {
      /* start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const openPosition: PaperContextValue["openPosition"] = ({
    symbol, name, direction, quantity, price, note, leverage = LEVERAGE,
  }) => {
    if (!Number.isFinite(quantity) || quantity <= 0)
      return { ok: false, error: "Enter a valid quantity." };
    if (!Number.isFinite(price) || price <= 0)
      return { ok: false, error: "No live price available right now." };

    const value = quantity * price;          // full position value (exposure)
    const margin = value / leverage;         // what you must put up
    if (margin > state.balance)
      return { ok: false, error: `Not enough margin (need INR ${margin.toLocaleString("en-IN", { maximumFractionDigits: 0 })}).` };

    const position: OpenPosition = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol, name, direction, quantity,
      entryPrice: price,
      entryTime: Date.now(),
      leverage,
      marginUsed: margin,
      note: note?.trim() || undefined,
    };
    setState((s) => ({
      ...s,
      balance: s.balance - margin, // reserve only the margin
      open: [position, ...s.open],
    }));
    return { ok: true };
  };

  // Build the ClosedTrade record for a position exiting at `price`.
  //  - `applyCharges`: false for after-hours practice closes (no real broker would
  //     execute, so no charges — matches our honest "practice only" rule).
  //  - `autoSquaredOff`: true when the broker auto-closed it at the 3:05 cutoff,
  //     which adds the Rs 59 auto square-off fee on top of normal charges.
  function buildClose(
    pos: OpenPosition,
    price: number,
    opts: { applyCharges: boolean; autoSquaredOff: boolean }
  ): ClosedTrade {
    const grossPnl = pnlFor(pos.direction, pos.entryPrice, price, pos.quantity);

    // A long buys at entry & sells at exit; a short sells at entry & buys at exit.
    const buyValue =
      pos.direction === "long" ? pos.entryPrice * pos.quantity : price * pos.quantity;
    const sellValue =
      pos.direction === "long" ? price * pos.quantity : pos.entryPrice * pos.quantity;

    const charges = opts.applyCharges
      ? computeCharges(buyValue, sellValue, opts.autoSquaredOff).total
      : 0;
    const pnl = grossPnl - charges;

    return {
      id: pos.id,
      symbol: pos.symbol,
      name: pos.name,
      direction: pos.direction,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: price,
      entryTime: pos.entryTime,
      exitTime: Date.now(),
      leverage: pos.leverage,
      marginUsed: pos.marginUsed,
      grossPnl,
      charges,
      pnl,
      pnlPercent: pos.marginUsed > 0 ? (pnl / pos.marginUsed) * 100 : 0,
      holdMs: Date.now() - pos.entryTime,
      autoExited: opts.autoSquaredOff || undefined,
      note: pos.note,
    };
  }

  const closePosition: PaperContextValue["closePosition"] = (positionId, price) => {
    if (!Number.isFinite(price) || price <= 0)
      return { ok: false, error: "No live price available right now." };
    const pos = state.open.find((p) => p.id === positionId);
    if (!pos) return { ok: false, error: "Position not found." };

    // Charges apply whenever the market is live (9:15 AM–3:30 PM) — including the
    // 3:05–3:30 window, where prices still move and a close is a real trade. Only
    // a close after 3:30 / on a weekend is after-hours practice with no charge
    // (the panel already explains P&L stays flat then).
    const applyCharges = isMarketLive();
    const closed = buildClose(pos, price, { applyCharges, autoSquaredOff: false });

    setState((s) => ({
      balance: s.balance + pos.marginUsed + closed.pnl,
      open: s.open.filter((p) => p.id !== positionId),
      closed: [closed, ...s.closed],
    }));
    return { ok: true };
  };

  // Broker auto square-off at the 3:05 cutoff: closes an open intraday position
  // at the given (last traded) price, applies full charges PLUS the Rs 59 auto
  // square-off fee, and marks it as auto-exited. Called by the position row once
  // the market is past 3:05, using the live price it already holds — so we close
  // at a real price, never a made-up one.
  const autoSquareOff: PaperContextValue["autoSquareOff"] = (positionId, price) => {
    if (!Number.isFinite(price) || price <= 0)
      return { ok: false, error: "No price available to square off." };
    const pos = state.open.find((p) => p.id === positionId);
    if (!pos) return { ok: false, error: "Position not found." };

    // Auto square-off is a real broker action, so charges always apply here.
    const closed = buildClose(pos, price, { applyCharges: true, autoSquaredOff: true });

    setState((s) => ({
      balance: s.balance + pos.marginUsed + closed.pnl,
      open: s.open.filter((p) => p.id !== positionId),
      closed: [closed, ...s.closed],
    }));
    return { ok: true };
  };

  const reset = () => setState(freshState());

  const invested = state.open.reduce((sum, p) => sum + p.marginUsed, 0);
  const exposure = state.open.reduce((sum, p) => sum + p.quantity * p.entryPrice, 0);

  return (
    <PaperContext.Provider value={{ ...state, ready, invested, exposure, leverage: LEVERAGE, openPosition, closePosition, autoSquareOff, reset }}>
      {children}
    </PaperContext.Provider>
  );
}

export function usePaperTrading(): PaperContextValue {
  const ctx = useContext(PaperContext);
  if (!ctx) throw new Error("usePaperTrading must be used within PaperTradingProvider");
  return ctx;
}

export { STARTING_BALANCE, pnlFor, LEVERAGE };
