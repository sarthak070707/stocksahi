/**
 * PriceChart.tsx
 *
 * Price chart for a stock with TWO views the user can toggle between:
 *   - Line: a clean 6-month area chart (the default — friendliest for beginners)
 *   - Candles: a candlestick chart for those who want open/high/low/close detail
 *
 * When in Candles mode, a short "how to read a candle" explainer appears.
 * Recharts has no built-in candlestick, so candles are drawn with a custom shape.
 */

"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PricePoint } from "@/lib/stock-types";

interface PriceChartProps {
  data: PricePoint[];
  symbol: string;
}

const chartConfig: ChartConfig = {
  price: { label: "Price (₹)", color: "var(--color-primary)" },
};

const UP_COLOR = "#059669"; // emerald-600 — closed higher than it opened
const DOWN_COLOR = "#e11d48"; // rose-600 — closed lower than it opened

const formatXAxis = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", { month: "short" });
const formatYAxis = (value: number) => `₹${Math.round(value)}`;

/** Custom candle shape. Recharts gives us the pixel box for the [low, high]
 *  range bar; we map open/close into that box to draw the body. */
function Candle(props: any) {
  const { x, width, y, height, payload } = props;
  const high = payload.high ?? payload.price;
  const low = payload.low ?? payload.price;
  const open = payload.open ?? payload.price;
  const close = payload.price;
  if (high === low) return null;

  const ratio = height / (high - low);
  const openY = y + (high - open) * ratio;
  const closeY = y + (high - close) * ratio;
  const isUp = close >= open;
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const cx = x + width / 2;
  const candleW = Math.max(width * 0.6, 2);
  const bodyY = Math.min(openY, closeY);
  const bodyH = Math.max(Math.abs(closeY - openY), 1);

  return (
    <g stroke={color} fill={color}>
      {/* wick: full high-to-low line */}
      <line x1={cx} x2={cx} y1={y} y2={y + height} strokeWidth={1} />
      {/* body: open-to-close rectangle */}
      <rect x={cx - candleW / 2} y={bodyY} width={candleW} height={bodyH} />
    </g>
  );
}

function CandleTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as PricePoint;
  const row = (label: string, val?: number) => (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">₹{(val ?? p.price).toLocaleString("en-IN")}</span>
    </div>
  );
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium">
        {new Date(p.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
      {row("Open", p.open)}
      {row("High", p.high)}
      {row("Low", p.low)}
      {row("Close", p.price)}
    </div>
  );
}

export function PriceChart({ data, symbol }: PriceChartProps) {
  const [mode, setMode] = useState<"line" | "candles">("line");

  const chartData = data.map((point) => ({
    date: point.date,
    price: point.price,
    open: point.open,
    high: point.high,
    low: point.low,
    // [low, high] range powers the candle bar's vertical extent
    range: [point.low ?? point.price, point.high ?? point.price] as [number, number],
  }));

  const lows = chartData.map((d) => d.low ?? d.price);
  const highs = chartData.map((d) => d.high ?? d.price);
  const yMin = Math.min(...lows);
  const yMax = Math.max(...highs);
  const pad = (yMax - yMin) * 0.05 || 1;

  // Candles need REAL open/high/low. If a live fetch failed, those are absent —
  // we never fabricate them, so we show an honest message instead.
  const hasCandleData =
    chartData.length > 0 &&
    chartData.every(
      (d) => d.open != null && d.high != null && d.low != null
    );

  return (
    <div className="w-full">
      {/* View toggle */}
      <div className="mb-3 flex items-center justify-end">
        <div className="inline-flex rounded-lg border border-border/60 p-0.5">
          {(["line", "candles"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "line" ? "Line" : "Candles"}
            </button>
          ))}
        </div>
      </div>

      {mode === "line" ? (
        <ChartContainer config={chartConfig} className="h-[280px] sm:h-[320px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={70}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Price"]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill={`url(#gradient-${symbol})`}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      ) : hasCandleData ? (
        <div className="h-[280px] sm:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={70}
                domain={[yMin - pad, yMax + pad]}
              />
              <Tooltip content={<CandleTooltip />} />
              <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[280px] sm:h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-border/60">
          <div className="px-6 text-center">
            <p className="text-sm font-medium text-foreground">
              Candlestick data isn&apos;t available right now
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Live market data couldn&apos;t be loaded at the moment. You can switch to
              the Line view to see the price trend, or try again shortly.
            </p>
            <button
              type="button"
              onClick={() => setMode("line")}
              className="mt-3 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Show line chart
            </button>
          </div>
        </div>
      )}

      {/* Beginner explainer — only in candle mode */}
      {mode === "candles" && hasCandleData && (
        <div className="mt-3 rounded-lg bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1.5 font-medium text-foreground">How to read a candle</p>
          <p>
            Each candle shows one day. The thick{" "}
            <span className="font-medium" style={{ color: UP_COLOR }}>
              green
            </span>{" "}
            body means the price closed higher than it opened; a{" "}
            <span className="font-medium" style={{ color: DOWN_COLOR }}>
              red
            </span>{" "}
            body means it closed lower. The body spans the open-to-close range,
            and the thin lines above and below (the &quot;wicks&quot;) reach the
            day&apos;s highest and lowest prices. Candles show how price moved
            within each day — useful for short-term timing, but for long-term
            investing the company&apos;s fundamentals matter far more than any
            single candle.
          </p>
        </div>
      )}
    </div>
  );
}
