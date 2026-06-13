/**
 * API Route: GET /api/stocks/search
 * 
 * Search for stocks by name, symbol, sector, or industry.
 * Query params: ?q=search+term
 * 
 * Returns: Array of StockSummary objects
 */

import { NextRequest, NextResponse } from "next/server";
import { searchStocks, getAllStocks } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { key: "search", limit: 150, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const query = request.nextUrl.searchParams.get("q") || "";

    // If no query, return all stocks
    const results = query.trim() ? await searchStocks(query) : await getAllStocks();

    return NextResponse.json({ stocks: results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search stocks" },
      { status: 500 }
    );
  }
}
