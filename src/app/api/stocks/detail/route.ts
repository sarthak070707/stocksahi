/**
 * API Route: GET /api/stocks/detail
 * 
 * Get full detail for a single stock.
 * Query params: ?symbol=RELIANCE
 * 
 * Returns: StockDetail object or 404
 */

import { NextRequest, NextResponse } from "next/server";
import { getStock } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/api-guard";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, { key: "detail", limit: 90, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const symbol = request.nextUrl.searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    const stock = await getStock(symbol);

    if (!stock) {
      return NextResponse.json(
        { error: `Stock "${symbol}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ stock });
  } catch (error) {
    console.error("Stock detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock details" },
      { status: 500 }
    );
  }
}
