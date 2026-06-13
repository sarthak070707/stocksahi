/**
 * ModeSwitch.tsx
 *
 * Segmented toggle in the header to flip between Intraday and Swing modes.
 * Always visible so the user can switch anytime.
 */

"use client";

import { Zap, LineChart } from "lucide-react";
import { useMode, type TradingMode } from "./ModeContext";

export function ModeSwitch() {
  const { mode, setMode, ready } = useMode();
  if (!ready) return null;

  const item = (m: TradingMode, label: string, Icon: typeof Zap, activeColor: string) => {
    const active = mode === m;
    return (
      <button
        onClick={() => setMode(m)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-smooth ${
          active
            ? `bg-background shadow-sm ${activeColor}`
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={active}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
      {item("swing", "Swing", LineChart, "text-emerald-600")}
      {item("intraday", "Intraday", Zap, "text-amber-600")}
    </div>
  );
}
