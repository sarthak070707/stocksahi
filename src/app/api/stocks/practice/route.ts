/**
 * API Route: GET /api/stocks/practice
 *
 * Returns a curated set of liquid, well-known large-caps with live prices —
 * "practice stocks" for the intraday learning experience. Study material for
 * learning to read charts, not trade recommendations.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPracticeStocks } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { key: "practice", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const stocks = await getPracticeStocks();
    return NextResponse.json({ stocks });
  } catch {
    return NextResponse.json({ stocks: [] }, { status: 200 });
  }
}
