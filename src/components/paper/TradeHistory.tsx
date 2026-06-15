/**
 * TradeHistory.tsx
 *
 * A modal showing all CLOSED paper trades so the user can review and learn from
 * them. Includes honest summary stats (total trades, win rate, net P&L) and a
 * list of each trade: stock, direction, entry/exit, P&L, how long held, and
 * their own "why" note.
 *
 * It reflects what happened factually — it never judges decisions or advises.
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { usePaperTrading } from "@/components/paper/PaperTradingContext";
import { TrendingUp, TrendingDown, RotateCcw } from "lucide-react";

interface TradeHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradeHistory({ open, onOpenChange }: TradeHistoryProps) {
  const { closed, balance, reset } = usePaperTrading();

  const total = closed.length;
  const wins = closed.filter((t) => t.pnl > 0).length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const netPnl = closed.reduce((sum, t) => sum + t.pnl, 0);
  const netPositive = netPnl >= 0;

  const handleReset = () => {
    if (
      confirm(
        "Reset your paper trading account? This clears all open positions, trade history, and resets the virtual balance to ₹1,00,000."
      )
    ) {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg">Trade History</DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-px bg-border/60 border-y border-border/60">
          <Stat label="Trades" value={String(total)} />
          <Stat label="Win rate" value={total > 0 ? `${winRate.toFixed(0)}%` : "—"} />
          <Stat
            label="Net P&L"
            value={
              total > 0
                ? `${netPositive ? "+" : ""}₹${netPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                : "—"
            }
            valueClass={total > 0 ? (netPositive ? "text-emerald-600" : "text-rose-500") : ""}
          />
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="p-5 space-y-2">
            {closed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No closed trades yet. Open and close a paper trade, and it&apos;ll
                appear here for you to review.
              </p>
            ) : (
              closed.map((t) => {
                const positive = t.pnl >= 0;
                const isLong = t.direction === "long";
                return (
                  <div key={t.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{t.symbol}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isLong ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"
                            }`}
                          >
                            {t.direction}
                          </span>
                          {t.leverage > 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                              {t.leverage}x
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t.quantity} qty · held {formatDuration(t.holdMs)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          In ₹{t.entryPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })} → Out ₹{t.exitPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {formatWhen(t.entryTime)} → {formatWhen(t.exitTime)}
                        </div>
                        {t.note && (
                          <div className="text-xs mt-1.5 italic text-muted-foreground">
                            “{t.note}”
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-0.5 text-sm font-semibold shrink-0 ${positive ? "text-emerald-600" : "text-rose-500"}`}>
                        {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {positive ? "+" : ""}₹{t.pnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        <span className="text-xs font-normal ml-1">
                          ({positive ? "+" : ""}{t.pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Balance: ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset account
          </Button>
        </div>

        <p className="px-5 pb-4 text-[11px] text-muted-foreground/80">
          This is a factual record of your practice trades to help you learn from
          your own decisions. It isn&apos;t advice, and past results don&apos;t
          predict future ones.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-background px-4 py-3 text-center">
      <div className={`text-lg font-semibold ${valueClass || ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
