/**
 * SessionStats.tsx
 *
 * Today's session snapshot for the intraday header: Open, High, Low, and
 * Previous Close. Open/High/Low come from today's intraday candles; the live
 * price stretches the day's High/Low and gives the previous close. Shows "—"
 * honestly when the session hasn't started or data isn't available.
 */

"use client";

import { useEffect, useState } from "react";
import { useLivePrice } from "@/hooks/useLivePrice";

interface SessionStatsProps {
  symbol: string;
  fallbackPrevClose?: number;
}

interface DayOHL { open: number | null; high: number | null; low: number | null }

// Start of today in IST, as unix seconds (candle times are real unix).
function todayStartUnixIST(): number {
  const now = new Date();
  // Shift to IST, zero the time, shift back.
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return Math.floor((ist.getTime() - 5.5 * 3600 * 1000) / 1000);
}

export function SessionStats({ symbol, fallbackPrevClose }: SessionStatsProps) {
  const live = useLivePrice(symbol);
  const [ohl, setOhl] = useState<DayOHL>({ open: null, high: null, low: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&tf=5m`);
        const data = await res.json();
        const candles: { time: number; open: number; high: number; low: number; close: number }[] = data?.candles ?? [];
        const start = todayStartUnixIST();
        const today = candles.filter((c) => c.time >= start);
        if (cancelled) return;
        if (today.length === 0) { setOhl({ open: null, high: null, low: null }); return; }
        setOhl({
          open: today[0].open,
          high: Math.max(...today.map((c) => c.high)),
          low: Math.min(...today.map((c) => c.low)),
        });
      } catch {
        if (!cancelled) setOhl({ open: null, high: null, low: null });
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  // Live price stretches the day's high/low.
  const ltp = live.ltp;
  const high = ohl.high != null && ltp != null ? Math.max(ohl.high, ltp) : ohl.high;
  const low = ohl.low != null && ltp != null ? Math.min(ohl.low, ltp) : ohl.low;
  const prevClose = live.cp ?? fallbackPrevClose ?? null;

  const fmt = (n: number | null) =>
    n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const Item = ({ label, value }: { label: string; value: string }) => (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <Item label="Open" value={fmt(ohl.open)} />
      <Item label="High" value={fmt(high)} />
      <Item label="Low" value={fmt(low)} />
      <Item label="Prev Close" value={fmt(prevClose)} />
      <span className="text-[11px] text-muted-foreground/70">Today&apos;s session</span>
    </div>
  );
}
