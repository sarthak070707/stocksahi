/**
 * IntradayWorkspace.tsx
 *
 * Lays out the live chart and the paper-trading panel side by side (like a
 * broker terminal). The chart's B/S toolbar buttons switch the panel's
 * BUY/SELL tab. On narrow screens it stacks (panel below the chart).
 */

"use client";

import { useState } from "react";
import { IntradayChart } from "./IntradayChart";
import { TradePanel, type TradeSide } from "@/components/paper/TradePanel";
import { OpenPositionsPanel } from "@/components/paper/OpenPositionsPanel";

interface IntradayWorkspaceProps {
  symbol: string;
  name: string;
  fallbackPrice?: number;
}

export function IntradayWorkspace({ symbol, name, fallbackPrice }: IntradayWorkspaceProps) {
  const [side, setSide] = useState<TradeSide>("buy");

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <IntradayChart symbol={symbol} name={name} fallbackPrice={fallbackPrice} />
        </div>
        <div className="w-full lg:w-[330px] lg:shrink-0">
          <TradePanel
            symbol={symbol}
            name={name}
            fallbackPrice={fallbackPrice}
            side={side}
            onSideChange={setSide}
          />
        </div>
      </div>

      <OpenPositionsPanel />
    </div>
  );
}
