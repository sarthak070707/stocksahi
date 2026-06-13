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
  pnl: number;
  pnlPercent: number; // return on the margin you put up (leveraged)
  holdMs: number;
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

  const closePosition: PaperContextValue["closePosition"] = (positionId, price) => {
    if (!Number.isFinite(price) || price <= 0)
      return { ok: false, error: "No live price available right now." };
    const pos = state.open.find((p) => p.id === positionId);
    if (!pos) return { ok: false, error: "Position not found." };

    const pnl = pnlFor(pos.direction, pos.entryPrice, price, pos.quantity);
    const closed: ClosedTrade = {
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
      pnl,
      // Return is measured on the margin you actually put up (leveraged %).
      pnlPercent: pos.marginUsed > 0 ? (pnl / pos.marginUsed) * 100 : 0,
      holdMs: Date.now() - pos.entryTime,
      note: pos.note,
    };
    setState((s) => ({
      balance: s.balance + pos.marginUsed + pnl, // return margin adjusted by full P&L
      open: s.open.filter((p) => p.id !== positionId),
      closed: [closed, ...s.closed],
    }));
    return { ok: true };
  };

  const reset = () => setState(freshState());

  const invested = state.open.reduce((sum, p) => sum + p.marginUsed, 0);
  const exposure = state.open.reduce((sum, p) => sum + p.quantity * p.entryPrice, 0);

  return (
    <PaperContext.Provider value={{ ...state, ready, invested, exposure, leverage: LEVERAGE, openPosition, closePosition, reset }}>
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
