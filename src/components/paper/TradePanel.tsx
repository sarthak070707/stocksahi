/**
 * TradePanel.tsx
 *
 * Paper-trading panel with BUY / SELL tabs supporting BOTH directions:
 *   BUY tab  -> open a LONG (buy to open), and "buy to cover" any open shorts
 *   SELL tab -> open a SHORT (sell to open), and "sell to close" any open longs
 *
 * Educational only — virtual money, no real orders.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLivePrice } from "@/hooks/useLivePrice";
import { usePaperTrading } from "@/components/paper/PaperTradingContext";
import { Wallet, ArrowDownCircle } from "lucide-react";

export type TradeSide = "buy" | "sell";

interface TradePanelProps {
  symbol: string;
  name: string;
  fallbackPrice?: number;
  side: TradeSide;
  onSideChange: (s: TradeSide) => void;
  compact?: boolean;
  onPlaced?: () => void; // called after a successful trade (used by fullscreen overlay)
}

export function TradePanel({
  symbol, name, fallbackPrice, side, onSideChange, compact, onPlaced,
}: TradePanelProps) {
  const { balance, openPosition, leverage, ready } = usePaperTrading();
  const live = useLivePrice(symbol);
  const { toast } = useToast();

  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const price = live.ltp ?? fallbackPrice ?? 0;
  const quantity = parseInt(qty, 10);
  const value = Number.isFinite(quantity) && quantity > 0 ? quantity * price : 0; // full position value
  const margin = value / leverage; // what you actually put up at 5x
  const notEnough = margin > balance && value > 0;

  const isBuy = side === "buy";

  const handleOpen = (direction: "long" | "short") => {
    const res = openPosition({ symbol, name, direction, quantity, price, note });
    if (res.ok) {
      toast({
        title: "Trade placed ✓",
        description: `${direction === "long" ? "Bought" : "Sold short"} ${quantity} ${symbol} at INR ${price.toLocaleString("en-IN")}. Check it in Open Positions below the chart.`,
      });
      setQty(""); setNote("");
      onPlaced?.();
    } else {
      toast({ title: "Couldn't place trade", description: res.error, variant: "destructive" });
    }
  };

  if (!ready) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm truncate">{name}</div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Wallet className="h-3.5 w-3.5" />
            INR {balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {price > 0 ? `INR ${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
          {live.status === "live" && <span className="ml-1.5 text-[10px] text-emerald-600">LIVE</span>}
        </div>
      </div>

      <div className="grid grid-cols-2">
        <button
          onClick={() => onSideChange("buy")}
          className={`py-2 text-sm font-semibold border-b-2 transition-smooth ${
            isBuy ? "border-emerald-500 text-emerald-600" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => onSideChange("sell")}
          className={`py-2 text-sm font-semibold border-b-2 transition-smooth ${
            !isBuy ? "border-rose-500 text-rose-500" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          SELL
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Open form for this side's direction */}
        <Input type="number" min="1" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input placeholder="Why this trade? (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Order value</span>
          <span className="font-medium">
            {value > 0 ? `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            Margin
            <span className="rounded bg-amber-500/15 text-amber-600 text-[10px] font-bold px-1.5 py-0.5">{leverage}x</span>
          </span>
          <span className="font-semibold">
            {value > 0 ? `INR ${margin.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
          </span>
        </div>

        {isBuy ? (
          <Button
            onClick={() => handleOpen("long")}
            disabled={price <= 0 || !(quantity > 0) || notEnough}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Buy to open (long)
          </Button>
        ) : (
          <Button
            onClick={() => handleOpen("short")}
            disabled={price <= 0 || !(quantity > 0) || notEnough}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white"
          >
            Sell to open (short)
          </Button>
        )}
        {notEnough && (
          <p className="text-xs text-rose-500">Not enough margin for this quantity.</p>
        )}

        {!isBuy && (
          <p className="text-[11px] text-muted-foreground/90 flex items-start gap-1.5">
            <ArrowDownCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Short selling = sell first, buy back later. You profit if the price
            falls, and lose if it rises. Higher risk — losses can grow if the
            price keeps climbing.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground/80">
          Intraday uses {leverage}x leverage — you only put up {Math.round(100 / leverage)}% as margin,
          so profit and loss are magnified against that margin. Virtual money for
          practice; manage and close trades in Open Positions below.
        </p>
      </div>
    </Card>
  );
}
