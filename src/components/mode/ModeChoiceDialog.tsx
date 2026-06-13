/**
 * ModeChoiceDialog.tsx
 *
 * Shown once, the first time someone opens the app (until they choose). Asks
 * which mode they want to explore — Intraday or Swing — and remembers it.
 * They can change it anytime from the header afterward.
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Zap, LineChart } from "lucide-react";
import { useMode } from "./ModeContext";

export function ModeChoiceDialog() {
  const { setMode, chosen, ready } = useMode();
  const [remember, setRemember] = useState(false);

  // Only show after we've read storage and only if no choice made yet.
  const open = ready && !chosen;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg"
        // Prevent dismissing without choosing.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            How do you want to explore StockSahi?
          </DialogTitle>
          <DialogDescription>
            Two very different styles of the market. Pick one to start — you can
            switch anytime from the top bar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => setMode("swing", remember)}
            className="text-left rounded-xl border border-border/60 p-4 hover:border-emerald-500/60 hover:bg-secondary/40 transition-smooth"
          >
            <LineChart className="h-6 w-6 text-emerald-600 mb-2" />
            <div className="font-semibold mb-1">Swing / Long-term</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Understand companies over weeks to years — fundamentals, news, and
              the big picture. Calmer, research-led, no need to watch every day.
            </p>
          </button>

          <button
            onClick={() => setMode("intraday", remember)}
            className="text-left rounded-xl border border-border/60 p-4 hover:border-emerald-500/60 hover:bg-secondary/40 transition-smooth"
          >
            <Zap className="h-6 w-6 text-amber-500 mb-2" />
            <div className="font-semibold mb-1">Intraday</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Learn how to read live charts, candlesticks and indicators — plus
              the discipline and psychology it demands. Fast-paced and hands-on.
            </p>
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-emerald-500"
          />
          <span className="text-sm text-muted-foreground">
            Remember my choice on this device
          </span>
        </label>

        <p className="text-[11px] text-muted-foreground/80 mt-1">
          StockSahi is educational only — it helps you understand the market, and
          never tells you what to buy or sell.
        </p>
      </DialogContent>
    </Dialog>
  );
}
