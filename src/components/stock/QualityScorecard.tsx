/**
 * QualityScorecard.tsx
 * 
 * A neutral factor breakdown for a stock.
 * Shows factors like "Debt: Low", "Growth: Steady" with color indicators.
 * 
 * IMPORTANT: This is a NEUTRAL breakdown — NEVER a verdict or recommendation.
 * Each factor is explained so beginners understand what it means.
 * 
 * Badge colors use CSS variable-based classes (badge-green, badge-yellow,
 * badge-red) so they adapt properly to dark mode.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExplanationTooltip } from "./ExplanationTooltip";
import type { QualityFactor } from "@/lib/stock-types";

interface QualityScorecardProps {
  factors: QualityFactor[];
}

/** Theme-aware CSS class names for quality badges */
const colorMap = {
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
};

const dotColorMap = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

export function QualityScorecard({ factors }: QualityScorecardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Quality Factors</CardTitle>
          <ExplanationTooltip
            explanation="These are neutral observations about the company, not recommendations. Each factor describes one aspect of the business."
            term="Quality Factors"
            size="sm"
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A neutral breakdown of key business factors. These describe how the
          company looks on each dimension — they are NOT a verdict on whether
          to invest.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {factors.map((factor) => (
            <div
              key={factor.name}
              className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3"
            >
              {/* Color dot indicator */}
              <div className="mt-1.5 shrink-0">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${dotColorMap[factor.color]}`}
                />
              </div>

              {/* Factor info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{factor.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${colorMap[factor.color]}`}
                  >
                    {factor.value}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {factor.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
