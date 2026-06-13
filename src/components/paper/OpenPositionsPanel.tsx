/**
 * OpenPositionsPanel.tsx
 *
 * One place to see and manage ALL open paper positions across every stock —
 * longs and shorts together — each with live profit/loss and a close button.
 * Each row subscribes to its own stock's live price.
 *
 * Educational only — virtual money.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLivePrice } from "@/hooks/useLivePrice";
import {
  usePaperTrading,
  pnlFor,
  type OpenPosition,
} from "@/components/paper/PaperTradingContext";
import { TrendingUp, TrendingDown, Layers } from "lucide-react";

export function OpenPositionsPanel() {
  const { open, ready } = usePaperTrading();
  if (!ready) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Open Positions
          {open.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({open.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No open positions yet. Open a long or short from the trade panel to
            practise — they&apos;ll appear here to manage.
          </p>
        ) : (
          <div className="space-y-2">
            {open.map((p) => (
              <OpenPositionRow key={p.id} position={p} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/80 mt-3">
          Live profit/loss updates with the price. Closing a position moves it to
          your trade history. Virtual money for practice only.
        </p>
      </CardContent>
    </Card>
  );
}

function OpenPositionRow({ position: p }: { position: OpenPosition }) {
  const { closePosition } = usePaperTrading();
  const live = useLivePrice(p.symbol);
  const { toast } = useToast();

  const price = live.ltp ?? 0;
  const livePnl = price > 0 ? pnlFor(p.direction, p.entryPrice, price, p.quantity) : 0;
  const basis = p.marginUsed ?? p.quantity * p.entryPrice;
  const livePnlPct = basis > 0 ? (livePnl / basis) * 100 : 0;
  const positive = livePnl >= 0;
  const isLong = p.direction === "long";

  const close = () => {
    if (price <= 0) {
      toast({ title: "No live price", description: "Can't close without a live price right now.", variant: "destructive" });
      return;
    }
    const res = closePosition(p.id, price);
    if (res.ok) {
      toast({ title: "Position closed", description: `${p.symbol} closed at INR ${price.toLocaleString("en-IN")}.` });
    } else {
      toast({ title: "Couldn't close", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{p.symbol}</span>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              isLong ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"
            }`}
          >
            {p.direction}
          </span>
          {p.leverage > 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
              {p.leverage}x
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {p.quantity} @ INR {p.entryPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          {price > 0 && (
            <> · now INR {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</>
          )}
        </div>
        {price > 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-medium mt-0.5 ${positive ? "text-emerald-600" : "text-rose-500"}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}INR {livePnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            {" "}({positive ? "+" : ""}{livePnlPct.toFixed(2)}%)
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={close}
        className={isLong ? "border-rose-500/40 text-rose-500 hover:bg-rose-500/10" : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"}
      >
        {isLong ? "Sell" : "Cover"}
      </Button>
    </div>
  );
}
