/**
 * API Route: GET /api/candles?symbol=RELIANCE&tf=5m
 *
 * Returns OHLC candles for the chart with unix-second timestamps.
 *   tf = 1m | 5m | 15m | 30m | 1h  -> last few days of intraday candles + today
 *   tf = 1d                         -> ~6 months of daily candles
 * Sourced from Upstox (historical-V3 for past days + intraday for today).
 *
 * Response: { candles: [{ time, open, high, low, close }, ...] }  (oldest-first)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getInstrument,
  fetchUpstoxCandles,
  fetchUpstoxIntradayCandles,
  fetchUpstoxHistoricalV3,
  type UpstoxCandle,
} from "@/lib/upstox";
import { checkRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

interface TfConfig {
  kind: "intraday" | "daily";
  unit?: "minutes" | "hours";
  interval?: string;
  historyDays?: number; // how many days of past intraday candles to include
}

function parseTf(tf: string): TfConfig {
  switch (tf) {
    case "1m": return { kind: "intraday", unit: "minutes", interval: "1", historyDays: 2 };
    case "5m": return { kind: "intraday", unit: "minutes", interval: "5", historyDays: 5 };
    case "15m": return { kind: "intraday", unit: "minutes", interval: "15", historyDays: 10 };
    case "30m": return { kind: "intraday", unit: "minutes", interval: "30", historyDays: 15 };
    case "1h": return { kind: "intraday", unit: "hours", interval: "1", historyDays: 30 };
    case "1d":
    default: return { kind: "daily" };
  }
}

const fmtDate = (d: Date) => d.toISOString().split("T")[0];

function toUnixSeconds(dateStr: string): number {
  if (dateStr.length <= 10) {
    return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
  }
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { key: "candles", limit: 90, windowMs: 60_000 });
  if (limited) return limited;

  const symbol = request.nextUrl.searchParams.get("symbol");
  const tf = request.nextUrl.searchParams.get("tf") || "1d";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const inst = getInstrument(symbol);
  if (!inst) {
    return NextResponse.json({ error: "unknown symbol" }, { status: 404 });
  }

  const cfg = parseTf(tf);
  let raw: UpstoxCandle[] | null = null;

  if (cfg.kind === "daily") {
    raw = await fetchUpstoxCandles(inst.instrument_key);
  } else {
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (cfg.historyDays ?? 5));

    // Past days (historical) + today (intraday), then stitch & dedupe.
    const [history, todayCandles] = await Promise.all([
      fetchUpstoxHistoricalV3(
        inst.instrument_key,
        cfg.unit!,
        cfg.interval!,
        fmtDate(from),
        fmtDate(today)
      ),
      fetchUpstoxIntradayCandles(inst.instrument_key, cfg.unit!, cfg.interval!),
    ]);

    const seen = new Set<string>();
    const merged: UpstoxCandle[] = [];
    for (const c of [...(history ?? []), ...(todayCandles ?? [])]) {
      if (seen.has(c.date)) continue; // historical may already include today
      seen.add(c.date);
      merged.push(c);
    }
    merged.sort((a, b) => toUnixSeconds(a.date) - toUnixSeconds(b.date));
    raw = merged.length > 0 ? merged : null;
  }

  if (!raw || raw.length === 0) {
    return NextResponse.json({ candles: [] });
  }

  const candles = raw.map((c) => ({
    time: toUnixSeconds(c.date),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  return NextResponse.json({ candles });
}
