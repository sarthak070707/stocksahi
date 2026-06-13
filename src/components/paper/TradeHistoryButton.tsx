/**
 * TradeHistoryButton.tsx
 *
 * A header button that opens the Trade History modal. Shown in intraday mode
 * (where paper trading lives). Self-contained so the header stays simple.
 */

"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { useMode } from "@/components/mode/ModeContext";
import { TradeHistory } from "@/components/paper/TradeHistory";

export function TradeHistoryButton() {
  const { mode, ready } = useMode();
  const [open, setOpen] = useState(false);

  if (!ready || mode !== "intraday") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-smooth"
        title="Trade history"
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Trade History</span>
      </button>
      <TradeHistory open={open} onOpenChange={setOpen} />
    </>
  );
}
