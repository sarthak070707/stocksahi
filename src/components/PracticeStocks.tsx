/**
 * PracticeStocks.tsx
 *
 * Shows a curated set of liquid, well-known large-caps (with live prices) for
 * the intraday home. Framed explicitly as stocks to PRACTICE reading charts on
 * while learning — not trade picks. Tapping one opens its chart + indicators.
 */

"use client";

import { useEffect, useState } from "react";
import type { StockSummary } from "@/lib/stock-types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PracticeStocksProps {
  onSelectStock: (symbol: string) => void;
}

export function PracticeStocks({ onSelectStock }: PracticeStocksProps) {
  const [stocks, setStocks] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stocks/practice");
        const data = await res.json();
        if (!cancelled) setStocks(data?.stocks ?? []);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Stocks to practice on
        </h2>
        <p className="text-sm text-muted-foreground">
          Liquid, heavily-traded large-caps — good for learning to read live
          charts and indicators because they&apos;re active and easy to follow.
          Shown to study, not as recommendations.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border/60 animate-pulse bg-secondary/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stocks.map((s) => {
            const positive = s.changePercent >= 0;
            return (
              <button
                key={s.symbol}
                onClick={() => onSelectStock(s.symbol)}
                className="text-left rounded-xl border border-border/60 p-3 hover:border-amber-500/40 hover:bg-secondary/40 transition-smooth"
              >
                <div className="font-semibold text-sm">{s.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.sector}
                </div>
                <div className="mt-2 text-sm font-medium">
                  ₹
                  {s.price > 0
                    ? s.price.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </div>
                {s.price > 0 && (
                  <div
                    className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${
                      positive ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {positive ? "+" : ""}
                    {s.changePercent.toFixed(2)}%
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
