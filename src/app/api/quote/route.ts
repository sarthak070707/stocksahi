/**
 * API Route: GET /api/quote?symbol=RELIANCE
 *
 * Returns the latest price and previous close for a symbol, via the Upstox V3
 * LTP endpoint. This is the serverless-friendly replacement for the WebSocket
 * stream: the browser polls this every few seconds (see useLivePrice). The
 * Upstox token stays server-side and is never exposed to the browser.
 *
 * Response: { ltp: number|null, cp: number|null }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchUpstoxLTP } from "@/lib/upstox";
import { checkRateLimit, cached } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Generous per-IP cap: a normal client polls a few symbols every 3s; this
  // allows that comfortably but blocks a tight abusive loop.
  const limited = checkRateLimit(req, { key: "quote", limit: 240, windowMs: 60_000 });
  if (limited) return limited;

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  // Cache per symbol for 2s so many clients polling the same symbol collapse
  // into a single upstream Upstox call — this is what protects the token.
  const quote = await cached(`quote:${symbol.toUpperCase()}`, 2000, () =>
    fetchUpstoxLTP(symbol)
  );
  if (!quote) {
    // No data available (market data unavailable, bad symbol, or missing token).
    return NextResponse.json({ ltp: null, cp: null }, { status: 200 });
  }

  return NextResponse.json(
    { ltp: quote.ltp, cp: quote.cp },
    { headers: { "Cache-Control": "no-store" } }
  );
}
