/**
 * FundamentalsGrid.tsx
 * 
 * A grid of key fundamental metrics for a stock.
 * Each metric card has:
 *   - The metric name
 *   - A "?" tooltip explaining what it means
 *   - The value, clearly formatted
 * 
 * Designed for beginners — no jargon without explanation.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ExplanationTooltip } from "./ExplanationTooltip";
import type { Fundamentals, MetricExplanation } from "@/lib/stock-types";
import { metricExplanationMap } from "@/lib/explanations";

interface FundamentalsGridProps {
  fundamentals: Fundamentals;
}

/** Format a number as Indian currency (₹ with commas, in crores/lakhs) */
function formatCurrency(value: number | null): string {
  if (value == null) return "Not available";
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh Cr`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K Cr`;
  return `₹${value.toLocaleString("en-IN")} Cr`;
}

export function FundamentalsGrid({ fundamentals }: FundamentalsGridProps) {
  const metrics: {
    key: string;
    label: string;
    value: string;
    expl: MetricExplanation;
    note?: string;
  }[] = [
    {
      key: "revenue",
      label: "Revenue",
      value: formatCurrency(fundamentals.revenue),
      expl: metricExplanationMap.revenue,
      note: fundamentals.revenue != null ? fundamentals.incomePeriod ?? undefined : undefined,
    },
    {
      key: "profit",
      label: "Net Profit",
      value: formatCurrency(fundamentals.profit),
      expl: metricExplanationMap.profit,
      note: fundamentals.profit != null ? fundamentals.incomePeriod ?? undefined : undefined,
    },
    {
      key: "pe",
      label: "P/E Ratio",
      value: fundamentals.pe.toFixed(1),
      expl: metricExplanationMap.pe,
    },
    {
      key: "debtToEquity",
      label: "Debt-to-Equity",
      value: fundamentals.debtToEquity.toFixed(2),
      expl: metricExplanationMap.debtToEquity,
    },
    {
      key: "roe",
      label: "ROE",
      value: `${fundamentals.roe.toFixed(1)}%`,
      expl: metricExplanationMap.roe,
    },
    {
      key: "dividendYield",
      label: "Dividend Yield",
      value: `${fundamentals.dividendYield.toFixed(2)}%`,
      expl: metricExplanationMap.dividendYield,
    },
    {
      key: "eps",
      label: "EPS",
      value: `₹${fundamentals.eps.toFixed(2)}`,
      expl: metricExplanationMap.eps,
    },
    {
      key: "bookValue",
      label: "Book Value",
      value: `₹${fundamentals.bookValue.toFixed(2)}`,
      expl: metricExplanationMap.bookValue,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
      {metrics.map((m) => (
        <Card
          key={m.key}
          className="card-hover bg-card border-border/60"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {m.label}
              </span>
              <ExplanationTooltip
                explanation={m.expl.shortExplanation}
                longExplanation={m.expl.longExplanation}
                term={m.label}
                size="sm"
              />
            </div>
            <div className="text-base sm:text-lg font-semibold tracking-tight">
              {m.value}
            </div>
            {m.note && (
              <div className="mt-0.5 text-[10px] leading-tight text-amber-600/90">
                {m.note}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
