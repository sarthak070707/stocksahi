/**
 * SectorComparison.tsx
 *
 * Shows how a company's key ratios compare to its sector average.
 * This is CONTEXT, not advice — it helps a beginner judge whether a number
 * is high or low relative to peers, without telling them what to do.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { SectorComparisonRow } from "@/lib/stock-types";

function fmt(n: number, unit?: string) {
  const v = Math.round(n * 100) / 100;
  return unit === "%" ? `${v}%` : `${v}`;
}

export function SectorComparison({ rows }: { rows: SectorComparisonRow[] }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          How it compares to its sector
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground/80">
          Each ratio shown against its sector average — for context, not a
          verdict on whether to invest.
        </p>

        <div className="space-y-4">
          {rows.map((row) => {
            const max = Math.max(row.company, row.sector, 0.0001);
            const companyPct = Math.min((row.company / max) * 100, 100);
            const sectorPct = Math.min((row.sector / max) * 100, 100);
            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {fmt(row.company, row.unit)}
                    </span>{" "}
                    <span className="text-xs">
                      vs {fmt(row.sector, row.unit)} sector
                    </span>
                  </span>
                </div>

                {/* Company bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${companyPct}%` }}
                  />
                </div>
                {/* Sector bar (muted) */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${sectorPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> This company
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Sector
            average
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
