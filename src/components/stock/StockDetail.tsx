/**
 * StockDetail.tsx
 * 
 * The full stock detail view — the main page when a stock is selected.
 * Shows: price header, price chart, fundamentals grid, quality scorecard,
 * "What does this mean?" panel, and recent news.
 */

"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChart } from "./PriceChart";
import { IntradayChart } from "./IntradayChart";
import { IntradayWorkspace } from "./IntradayWorkspace";
import { useMode } from "@/components/mode/ModeContext";
import { FundamentalsGrid } from "./FundamentalsGrid";
import { SectorComparison } from "./SectorComparison";
import { QualityScorecard } from "./QualityScorecard";
import { NewsPanel } from "./NewsPanel";
import { ExplanationTooltip } from "./ExplanationTooltip";
import { HowToReadThisStock } from "./HowToReadThisStock";
import { SessionStats } from "./SessionStats";
import { IntradayLessons } from "./IntradayLessons";
import { IntradayMechanics } from "./IntradayMechanics";
import { IntradayDiscipline } from "./IntradayDiscipline";
import { IntradayStrategy } from "./IntradayStrategy";
import { useLivePrice } from "@/hooks/useLivePrice";
import type { StockDetail as StockDetailType } from "@/lib/stock-types";
import { metricExplanationMap } from "@/lib/explanations";

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
}

export function StockDetailView({ symbol, onBack }: StockDetailProps) {
  const [stock, setStock] = useState<StockDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live price stream (browser -> our SSE endpoint -> server WebSocket).
  const live = useLivePrice(symbol);
  const { mode } = useMode();

  useEffect(() => {
    async function fetchStock() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/stocks/detail?symbol=${encodeURIComponent(symbol)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch stock");
        }
        const data = await res.json();
        setStock(data.stock);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStock();
  }, [symbol]);

  if (isLoading) {
    return <StockDetailSkeleton onBack={onBack} />;
  }

  if (error || !stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">
          {error || "Stock not found"}
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  // Prefer live values when the stream is active; fall back to the snapshot.
  const displayPrice = live.ltp ?? stock.price;
  const displayChange = live.change ?? stock.change;
  const displayChangePercent = live.changePercent ?? stock.changePercent;
  const isPositive = displayChange >= 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to search
      </Button>

      {/* Stock header — name, price, change */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {stock.name}
              </h1>
              <Badge variant="secondary" className="text-xs">
                NSE: {stock.symbol}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>
                {stock.sector} · {stock.industry}
              </span>
            </div>
          </div>

          {/* Price block */}
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <div className="text-3xl font-bold tracking-tight">
                ₹{displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              {live.status === "live" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:justify-end mt-0.5">
              <span
                className={`flex items-center gap-0.5 text-sm font-medium ${
                  isPositive ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isPositive ? "+" : ""}
                {displayChange.toFixed(2)} ({isPositive ? "+" : ""}
                {displayChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Market Cap: ₹{(stock.marketCap / 100000).toFixed(2)} Lakh Cr</span>
            <ExplanationTooltip
              explanation={metricExplanationMap.marketCap.shortExplanation}
              longExplanation={metricExplanationMap.marketCap.longExplanation}
              term="Market Cap"
              size="sm"
            />
          </div>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          {mode === "intraday" ? (
            <SessionStats symbol={stock.symbol} fallbackPrevClose={stock.price - (stock.change ?? 0)} />
          ) : (
            <>
              <span>
                52W H: ₹{stock.high52w.toLocaleString("en-IN")} / L: ₹
                {stock.low52w.toLocaleString("en-IN")}
              </span>
              <ExplanationTooltip
                explanation={metricExplanationMap.high52w.shortExplanation}
                longExplanation={metricExplanationMap.high52w.longExplanation}
                term="52-Week High/Low"
                size="sm"
              />
            </>
          )}
        </div>
      </div>

      {mode === "intraday" ? (
        /* INTRADAY — the live session is the whole focus. Below the workspace we
           keep only Key Fundamentals (a quick "what is this company" glance) and
           News (today's catalysts). The deeper investing material (6-month
           history, sector comparison, how-to-read, quality factors) is a swing
           concern and is intentionally left out here. */
        <>
          <IntradayWorkspace
            symbol={stock.symbol}
            name={stock.name}
            fallbackPrice={stock.price}
          />

          <IntradayLessons />

          <IntradayMechanics />

          <IntradayDiscipline />

          <IntradayStrategy />

          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">Key Fundamentals</h2>
            <p className="text-xs text-muted-foreground/80 mb-3">
              A quick glance at the company behind the ticker. For intraday you&apos;re
              trading price and volume, not these numbers — but it helps to know what
              you&apos;re trading.
            </p>
            <FundamentalsGrid fundamentals={stock.fundamentals} />
          </div>

          <NewsPanel news={stock.news} symbol={stock.symbol} />
        </>
      ) : (
        /* SWING / INVESTING — lead with the business: price history and
           fundamentals first, chart as a study tool. */
        <>
          <Card className="border-border/60">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Price History (6 months)
              </h2>
              <PriceChart data={stock.priceHistory} symbol={stock.symbol} />
            </CardContent>
          </Card>

          <IntradayChart symbol={stock.symbol} />

          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">Key Fundamentals</h2>
            <p className="text-xs text-muted-foreground/80 mb-3">
              Most figures (revenue, net profit, P/E, ROE, EPS, book value) are from
              company filings via Upstox. Debt-to-equity and dividend yield are
              indicative and may differ slightly from your broker.
            </p>
            <FundamentalsGrid fundamentals={stock.fundamentals} />
          </div>

          {stock.sectorComparison && stock.sectorComparison.length > 0 && (
            <SectorComparison rows={stock.sectorComparison} />
          )}
          <HowToReadThisStock stock={stock} />
          <QualityScorecard factors={stock.qualityFactors} />
          <NewsPanel news={stock.news} symbol={stock.symbol} />
        </>
      )}
    </div>
  );
}

/** Loading skeleton for the stock detail view */
function StockDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to search
      </Button>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
