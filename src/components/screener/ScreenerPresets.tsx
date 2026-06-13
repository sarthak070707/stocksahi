/**
 * ScreenerPresets.tsx
 * 
 * Beginner-friendly stock screener with preset filters.
 * Instead of complex filter forms, beginners pick from named presets
 * like "Large stable companies" or "Low debt companies".
 */

"use client";

import { useEffect, useState } from "react";
import {
  Gem,
  Tag,
  Sprout,
  Landmark,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScreenerPreset, StockSummary } from "@/lib/stock-types";
import { ExplanationTooltip } from "@/components/stock/ExplanationTooltip";

interface ScreenerPresetsProps {
  onSelectStock: (symbol: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Gem,
  Tag,
  Sprout,
  Landmark,
};

export function ScreenerPresets({ onSelectStock }: ScreenerPresetsProps) {
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [results, setResults] = useState<StockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available presets on mount
  useEffect(() => {
    async function fetchPresets() {
      try {
        const res = await fetch("/api/stocks/screener?presets=true");
        const data = await res.json();
        setPresets(data.presets || []);
      } catch {
        // Silently fail — presets will just be empty
      }
    }
    fetchPresets();
  }, []);

  // Apply a preset filter
  const applyPreset = async (presetId: string) => {
    if (activePreset === presetId) {
      // Toggle off if same preset clicked
      setActivePreset(null);
      setResults([]);
      return;
    }

    setActivePreset(presetId);
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/stocks/screener?preset=${encodeURIComponent(presetId)}`
      );
      const data = await res.json();
      setResults(data.stocks || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          Beginner Screener
          <ExplanationTooltip
            explanation="A screener helps you filter stocks based on simple criteria. Pick a preset that matches what you're curious about."
            term="Screener"
            size="md"
          />
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Not sure where to start? Pick a filter below to discover stocks that
          match common patterns.
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          Screens ~100 of India's major listed companies using accurate
          fundamentals from company filings. Use search above for any other
          stock.
        </p>
      </div>

      {/* Preset filter cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {presets.map((preset) => {
          const Icon = iconMap[preset.icon] || Shield;
          const isActive = activePreset === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`text-left rounded-xl border-2 p-4 transition-smooth card-hover ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filtered results */}
      {activePreset && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Matching Stocks</h3>
            <Badge variant="secondary" className="text-xs">
              {isLoading ? "..." : results.length} found
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No stocks match this filter. Try a different preset.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((stock) => (
                <StockResultCard
                  key={stock.symbol}
                  stock={stock}
                  onClick={() => onSelectStock(stock.symbol)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Individual stock card in screener results */
function StockResultCard({
  stock,
  onClick,
}: {
  stock: StockSummary;
  onClick: () => void;
}) {
  const isPositive = stock.change >= 0;

  return (
    <Card
      className="card-hover cursor-pointer border-border/60"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{stock.symbol}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {stock.sector}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stock.name}
            </p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="text-sm font-semibold">
              ₹{stock.price.toLocaleString("en-IN")}
            </div>
            <span
              className={`text-xs font-medium ${
                isPositive ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Market Cap: ₹{(stock.marketCap / 100000).toFixed(2)} Lakh Cr
        </div>
      </CardContent>
    </Card>
  );
}
