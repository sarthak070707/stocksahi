/**
 * IndicatorPicker.tsx
 *
 * Groww/TradingView-style popup for choosing indicators. Search box, indicators
 * grouped by category, each with a plain-English explainer and an on/off toggle.
 * Strategy presets at the top apply a named combination at once (educational
 * lenses for learning how indicators work together — never buy/sell advice).
 *
 * The user is fully in control: nothing is applied unless they pick it.
 */

"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Plus, Sparkles } from "lucide-react";
import {
  INDICATORS,
  INDICATOR_PRESETS,
  type IndicatorCategory,
} from "@/lib/indicator-registry";

interface IndicatorPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeIds: string[];
  onToggle: (id: string) => void;
  onApplyPreset: (ids: string[]) => void;
  portalContainer?: HTMLElement | null;
}

const CATEGORY_ORDER: IndicatorCategory[] = [
  "Moving Averages",
  "Momentum",
  "Trend",
  "Volatility",
  "Volume",
];

export function IndicatorPicker({
  open,
  onOpenChange,
  activeIds,
  onToggle,
  onApplyPreset,
  portalContainer,
}: IndicatorPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? INDICATORS.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.short.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q)
        )
      : INDICATORS;
    // group by category
    const groups: Record<string, typeof INDICATORS> = {};
    for (const i of list) (groups[i.category] ||= []).push(i);
    return groups;
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" portalContainer={portalContainer}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg">Indicators</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search indicators…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-5 pb-5">
            {/* Presets */}
            {!query && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Strategy presets
                  <span className="font-normal">— combinations to learn from</span>
                </p>
                <div className="space-y-1.5">
                  {INDICATOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onApplyPreset(p.indicatorIds)}
                      className="w-full text-left rounded-lg border border-border/60 px-3 py-2 hover:bg-secondary/60 transition-smooth"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{p.name}</span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Indicator list grouped by category */}
            {CATEGORY_ORDER.filter((cat) => filtered[cat]?.length).map((cat) => (
              <div key={cat} className="mb-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-medium mb-1.5 mt-2">
                  {cat}
                </p>
                <div className="space-y-0.5">
                  {filtered[cat].map((ind) => {
                    const isActive = activeIds.includes(ind.id);
                    return (
                      <button
                        key={ind.id}
                        onClick={() => onToggle(ind.id)}
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-secondary/60 transition-smooth flex items-start gap-3"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isActive
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border"
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium block">
                            {ind.name}
                          </span>
                          <span className="text-xs text-muted-foreground block leading-snug mt-0.5">
                            {ind.short}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {Object.keys(filtered).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No indicators match “{query}”.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/60 px-5 py-2.5">
          <p className="text-[11px] text-muted-foreground/80">
            Indicators are educational tools for studying price history — not buy
            or sell signals.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
