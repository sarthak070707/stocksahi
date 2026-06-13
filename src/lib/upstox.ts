/**
 * upstox.ts
 *
 * Upstox data access — currently used for ACCURATE consolidated fundamentals
 * (net profit, revenue, growth) that free sources can't provide reliably.
 *
 * Two pieces:
 *  1. Instrument map (symbol -> instrument_key + ISIN), loaded from the
 *     instruments-nse.json file in the project root (built by build_instruments.mjs).
 *  2. Income statement fetch (consolidated, annual) by ISIN.
 *
 * The access token is read from the UPSTOX_ACCESS_TOKEN environment variable
 * (set in .env). It is server-side only and never exposed to the browser.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

interface Instrument {
  instrument_key: string;
  isin: string;
  name: string;
}

let instrumentMap: Record<string, Instrument> | null = null;

/** Load (and cache) the symbol -> instrument map from the JSON file. */
function loadInstruments(): Record<string, Instrument> {
  if (instrumentMap) return instrumentMap;
  try {
    const p = join(process.cwd(), "instruments-nse.json");
    instrumentMap = JSON.parse(readFileSync(p, "utf-8")) as Record<string, Instrument>;
  } catch {
    instrumentMap = {};
  }
  return instrumentMap;
}

/** Look up a stock's Upstox instrument_key + ISIN by its NSE symbol. */
export function getInstrument(symbol: string): Instrument | null {
  const map = loadInstruments();
  return map[symbol.toUpperCase()] ?? null;
}

export interface UpstoxLTP {
  ltp: number | null; // last traded price
  cp: number | null; // previous close (V3 LTP "cp" field)
}

/**
 * Fetch the latest price for a symbol via the Upstox V3 LTP quote endpoint.
 * V3 returns last_price AND cp (previous close) in one call, which is exactly
 * what the live-price hook needs. Used by polling (serverless-friendly) in
 * place of the WebSocket stream. Returns null if unavailable.
 */
export async function fetchUpstoxLTP(symbol: string): Promise<UpstoxLTP | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;
  const inst = getInstrument(symbol);
  if (!inst) return null;

  try {
    const key = inst.instrument_key;
    const url = `https://api.upstox.com/v3/market-quote/ltp?instrument_key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      status?: string;
      data?: Record<string, { last_price?: number; instrument_token?: string; cp?: number }>;
    };
    const data = body?.data;
    if (!data) return null;

    // The response is keyed by EXCHANGE:SYMBOL, so match by instrument_token
    // (which equals the key we sent); fall back to the only entry present.
    const entries = Object.values(data);
    const entry = entries.find((v) => v.instrument_token === key) ?? entries[0];
    if (!entry) return null;

    return {
      ltp: typeof entry.last_price === "number" ? entry.last_price : null,
      cp: typeof entry.cp === "number" ? entry.cp : null,
    };
  } catch {
    return null;
  }
}

const UPSTOX_BASE = "https://api.upstox.com/v2";

export interface UpstoxIncome {
  revenueCr?: number; // latest annual revenue, ₹ crores
  netProfitCr?: number; // latest annual net profit, ₹ crores
  revenueGrowthFraction?: number; // latest YoY revenue growth (e.g. 0.1053)
  period?: string; // the fiscal period used, e.g. "Mar 2026"
  basis?: "consolidated" | "standalone"; // which statement the figures came from
  stale?: boolean; // true when the only data available is too old to show
}

interface ParsedIncome {
  revenueCr?: number;
  netProfitCr?: number;
  revenueGrowthFraction?: number;
  period?: string;
  latestYear: number;
}

/** Pull the 4-digit year out of a period label like "Mar 2026". */
function yearOfPeriod(period?: string): number {
  if (!period) return 0;
  const m = period.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Fetch + parse one income statement (consolidated OR standalone). */
async function fetchIncomeStatement(
  isin: string,
  token: string,
  type: "consolidated" | "standalone"
): Promise<ParsedIncome | null> {
  try {
    const url = `${UPSTOX_BASE}/fundamentals/${isin}/income-statement?statement_type=${type}&period=annual`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      // financials change rarely; let Next cache for an hour
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: {
        income_statement?: {
          category?: string;
          history?: { value?: number; change?: string; period?: string }[];
        }[];
      };
    };

    const rows = body?.data?.income_statement;
    if (!Array.isArray(rows)) return null;

    const histOf = (cat: string) => rows.find((r) => r?.category === cat)?.history;

    const out: ParsedIncome = { latestYear: 0 };

    const revenue = histOf("revenue");
    if (revenue?.[0] && typeof revenue[0].value === "number") {
      out.revenueCr = Math.round(revenue[0].value);
      out.period = revenue[0].period;
      out.latestYear = yearOfPeriod(revenue[0].period);
      const change = revenue[0].change;
      if (typeof change === "string") {
        const n = parseFloat(change.replace(/[%+\s]/g, ""));
        if (!Number.isNaN(n)) out.revenueGrowthFraction = n / 100;
      }
    }

    const profit = histOf("net_profit");
    if (profit?.[0] && typeof profit[0].value === "number") {
      out.netProfitCr = Math.round(profit[0].value);
    }

    return out;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest annual revenue, net profit, and revenue growth.
 *
 * Prefers CONSOLIDATED figures (the fuller picture, incl. subsidiaries) when
 * they are current, falling back to STANDALONE when consolidated is missing.
 *
 * HONESTY GUARD: for some stocks (e.g. Colgate) Upstox has no recent income
 * data at all — both statement types end years ago (Colgate stops at 2010).
 * Showing decade-old numbers as if current is worse than showing nothing, so
 * if the newest figure we can find is stale (older than STALE_AFTER_YEARS), we
 * return null and the UI shows "not available" instead of misleading data.
 * Returns null if nothing usable (or only stale data) is found.
 */
const STALE_AFTER_YEARS = 2; // keep data up to ~2 years old; older = treat as unavailable

export async function fetchUpstoxIncome(isin: string): Promise<UpstoxIncome | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;

  const currentYear = new Date().getFullYear();
  const recentThreshold = currentYear - 1; // consolidated this fresh -> use as-is
  const staleCutoff = currentYear - STALE_AFTER_YEARS; // older than this -> unavailable

  const consolidated = await fetchIncomeStatement(isin, token, "consolidated");
  let chosen = consolidated;
  let basis: UpstoxIncome["basis"] = consolidated ? "consolidated" : undefined;

  // Reach for standalone when consolidated is missing or not current.
  if (!consolidated || consolidated.latestYear < recentThreshold) {
    const standalone = await fetchIncomeStatement(isin, token, "standalone");
    if (standalone && (!chosen || standalone.latestYear > chosen.latestYear)) {
      chosen = standalone;
      basis = "standalone";
    }
  }

  if (!chosen) return null;

  // Honesty guard: if the best available figure is stale (years old), flag it
  // so the caller shows "not available" instead of misleading old numbers.
  if (chosen.latestYear > 0 && chosen.latestYear < staleCutoff) {
    return { stale: true, period: chosen.period };
  }

  return {
    revenueCr: chosen.revenueCr,
    netProfitCr: chosen.netProfitCr,
    revenueGrowthFraction: chosen.revenueGrowthFraction,
    period: chosen.period,
    basis,
  };
}

export interface UpstoxRatios {
  pe?: number;
  pb?: number;
  roe?: number; // %
  roce?: number; // %
  roa?: number; // %
  evEbitda?: number;
  // sector comparison values (same units), for context display
  sector?: {
    pe?: number;
    pb?: number;
    roe?: number;
    roce?: number;
    roa?: number;
    evEbitda?: number;
  };
}

/** Parse a value like "10.94%" or "22.52" into a number. */
function numOf(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined;
  const n = parseFloat(v.replace(/[%,\s]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

/** Fetch key ratios (P/E, P/B, ROE, ROCE, ROA, EV/EBITDA) plus sector values. */
export async function fetchUpstoxRatios(isin: string): Promise<UpstoxRatios | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url = `${UPSTOX_BASE}/fundamentals/${isin}/key-ratios`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: { name?: string; company_value?: string; sector_value?: string }[];
    };
    const rows = body?.data;
    if (!Array.isArray(rows)) return null;

    const out: UpstoxRatios = { sector: {} };
    for (const r of rows) {
      const c = numOf(r.company_value);
      const s = numOf(r.sector_value);
      switch (r.name) {
        case "P/E":
          out.pe = c;
          out.sector!.pe = s;
          break;
        case "P/B":
          out.pb = c;
          out.sector!.pb = s;
          break;
        case "ROE":
          out.roe = c;
          out.sector!.roe = s;
          break;
        case "ROCE":
          out.roce = c;
          out.sector!.roce = s;
          break;
        case "ROA":
          out.roa = c;
          out.sector!.roa = s;
          break;
        case "EV/EBITDA":
          out.evEbitda = c;
          out.sector!.evEbitda = s;
          break;
      }
    }
    return out;
  } catch {
    return null;
  }
}

/** A single daily candle / price point (matches the app's chart shape). */
export interface UpstoxCandle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  price: number; // = close, for the line chart
}

/**
 * Fetch ~6 months of daily OHLC candles for an instrument_key.
 * Upstox returns candles newest-first as [ts, open, high, low, close, vol, oi];
 * we return them oldest-first in the app's point shape. Null on failure.
 */
export async function fetchUpstoxCandles(
  instrumentKey: string
): Promise<UpstoxCandle[] | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;

  const today = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    const url = `https://api.upstox.com/v3/historical-candle/${encodeURIComponent(
      instrumentKey
    )}/days/1/${fmt(today)}/${fmt(from)}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: { candles?: [string, number, number, number, number, number, number][] };
    };
    const raw = body?.data?.candles;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const points: UpstoxCandle[] = raw
      .slice()
      .reverse() // newest-first -> oldest-first
      .map((c) => ({
        date: String(c[0]).split("T")[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        price: c[4],
      }))
      .filter(
        (p) =>
          typeof p.open === "number" &&
          typeof p.high === "number" &&
          typeof p.low === "number" &&
          typeof p.close === "number"
      );

    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

/**
 * Fetch historical candles at any unit/interval over a date range (V3).
 * unit: "minutes"|"hours"|"days"; interval e.g. "5"; dates "YYYY-MM-DD".
 * Returns oldest-first in the app's candle shape. Null on failure.
 */
export async function fetchUpstoxHistoricalV3(
  instrumentKey: string,
  unit: string,
  interval: string,
  fromDate: string,
  toDate: string
): Promise<UpstoxCandle[] | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.upstox.com/v3/historical-candle/${encodeURIComponent(
      instrumentKey
    )}/${unit}/${interval}/${toDate}/${fromDate}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: { candles?: [string, number, number, number, number, number, number][] };
    };
    const raw = body?.data?.candles;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const points: UpstoxCandle[] = raw
      .slice()
      .reverse()
      .map((c) => ({
        date: String(c[0]),
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        price: c[4],
      }))
      .filter(
        (p) =>
          typeof p.open === "number" &&
          typeof p.high === "number" &&
          typeof p.low === "number" &&
          typeof p.close === "number"
      );

    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

/**
 * Fetch TODAY's intraday candles for an instrument at a given interval.
 * unit: "minutes" | "hours" ; interval: e.g. "1","5","15" (minutes) or "1" (hours).
 * Returns oldest-first in the app's candle shape. Null on failure.
 */
export async function fetchUpstoxIntradayCandles(
  instrumentKey: string,
  unit: "minutes" | "hours" = "minutes",
  interval: string = "5"
): Promise<UpstoxCandle[] | null> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.upstox.com/v3/historical-candle/intraday/${encodeURIComponent(
      instrumentKey
    )}/${unit}/${interval}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: { candles?: [string, number, number, number, number, number, number][] };
    };
    const raw = body?.data?.candles;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const points: UpstoxCandle[] = raw
      .slice()
      .reverse() // newest-first -> oldest-first
      .map((c) => ({
        date: String(c[0]), // full ISO timestamp (intraday needs time, not just date)
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        price: c[4],
      }))
      .filter(
        (p) =>
          typeof p.open === "number" &&
          typeof p.high === "number" &&
          typeof p.low === "number" &&
          typeof p.close === "number"
      );

    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}
