/**
 * API Route: GET /api/stocks/screener
 * 
 * Screen stocks using a preset filter or get available presets.
 * 
 * Query params:
 *   ?presets=true        — Get list of available screener presets
 *   ?preset=large-stable  — Screen using a preset ID
 * 
 * Returns: Array of ScreenerPreset or Array of StockSummary
 */

import { NextRequest, NextResponse } from "next/server";
import { getScreenerPresets, screenStocks } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { key: "screener", limit: 90, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const params = request.nextUrl.searchParams;
    const wantPresets = params.get("presets") === "true";
    const presetId = params.get("preset");

    // If asking for presets list, return that
    if (wantPresets) {
      const presets = getScreenerPresets();
      return NextResponse.json({ presets });
    }

    // If providing a preset ID, screen with it
    if (presetId) {
      const results = await screenStocks(presetId);
      return NextResponse.json({ stocks: results, presetId });
    }

    // Default: return presets list
    const presets = getScreenerPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Screener API error:", error);
    return NextResponse.json(
      { error: "Failed to screen stocks" },
      { status: 500 }
    );
  }
}
