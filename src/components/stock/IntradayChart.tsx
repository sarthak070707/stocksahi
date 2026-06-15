/**
 * IntradayChart.tsx
 *
 * Candlestick chart (TradingView Lightweight Charts v5) that starts CLEAN —
 * just candles. The user adds indicators via the picker (button top-right).
 * Overlays (moving averages, Bollinger) draw on the price pane; oscillators
 * (RSI, MACD, ADX, Stochastic, ATR, ROC) each draw in their own sub-pane.
 *
 * Indicators are educational tools the user chooses — nothing is auto-applied,
 * and none of it is a buy/sell signal.
 *
 * Data: daily candles from /api/candles. (Live intraday updates come next.)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlidersHorizontal, X, Maximize2, Minimize2, Plus, Minus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { IndicatorPicker } from "./IndicatorPicker";
import { INDICATOR_BY_ID, mergeParams, type ParamValues } from "@/lib/indicator-registry";
import { IndicatorSettings } from "./IndicatorSettings";
import { useLivePrice } from "@/hooks/useLivePrice";
import { TradePanel, type TradeSide } from "@/components/paper/TradePanel";
import type { Candle } from "@/lib/indicators";

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "1d": 86400,
};

interface IntradayChartProps {
  symbol: string;
  height?: number;
  name?: string;
  fallbackPrice?: number;
}

export function IntradayChart({ symbol, height = 420, name, fallbackPrice }: IntradayChartProps) {
  const priceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [indicatorParams, setIndicatorParams] = useState<Record<string, ParamValues>>({});
  const [restored, setRestored] = useState(false);
  const updateParams = (id: string, params: ParamValues) =>
    setIndicatorParams((prev) => ({ ...prev, [id]: params }));

  // Horizontal-line helpers
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const addHLine = (pane: string) => {
    let price = 0;
    if (pane === "price") {
      price = live.ltp ?? fallbackPrice ?? (candles?.length ? candles[candles.length - 1].close : 0);
    } else {
      const def = INDICATOR_BY_ID[pane];
      if (def && candles) {
        const ls = def.compute(candles, mergeParams(def, indicatorParams[pane]));
        const d = ls[0]?.data;
        price = d && d.length ? d[d.length - 1].value : 0;
      }
    }
    setHLines((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, pane, price: round2(price), color: "#eab308" },
    ]);
  };
  const updateHLine = (id: string, price: number) =>
    setHLines((prev) => prev.map((l) => (l.id === id ? { ...l, price } : l)));
  const removeHLine = (id: string) =>
    setHLines((prev) => prev.filter((l) => l.id !== id));

  // Panes available for lines: price + any active separate-pane indicators.
  const linePaneOptions = [
    { key: "price", label: "Price" },
    ...activeIds
      .map((id) => INDICATOR_BY_ID[id])
      .filter((d) => d && d.pane === "separate")
      .map((d) => ({ key: d.id, label: d.name.replace(/ \(.*\)/, "") })),
  ];
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tf, setTf] = useState<string>("5m");
  const [overlaySide, setOverlaySide] = useState<TradeSide | null>(null);
  const [fsPlaced, setFsPlaced] = useState(false);
  const [legend, setLegend] = useState<{ top: number; rows: { name: string; values: { text: string; color: string }[] }[] }[]>([]);

  // Horizontal lines (support/resistance levels), saved per stock.
  interface HLine { id: string; pane: string; price: number; color: string }
  const [hLines, setHLines] = useState<HLine[]>([]);
  const [linesOpen, setLinesOpen] = useState(false);
  const paneSeriesRef = useRef<Record<string, import("lightweight-charts").ISeriesApi<"Candlestick" | "Line">>>({});
  const createdLinesRef = useRef<{ series: import("lightweight-charts").ISeriesApi<"Candlestick" | "Line">; line: import("lightweight-charts").IPriceLine }[]>([]);
  const [drawNonce, setDrawNonce] = useState(0);

  // Live price stream + refs for merging ticks into the latest candle.
  const live = useLivePrice(symbol);

  // Restore the saved indicator setup (global, across stocks) once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("stocksahi-indicators");
      if (raw) {
        const saved = JSON.parse(raw) as { activeIds?: string[]; params?: Record<string, ParamValues> };
        if (Array.isArray(saved.activeIds)) {
          // Keep only ids that still exist in the registry.
          setActiveIds(saved.activeIds.filter((id) => INDICATOR_BY_ID[id]));
        }
        if (saved.params && typeof saved.params === "object") {
          setIndicatorParams(saved.params);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setRestored(true);
  }, []);

  // Persist the setup whenever it changes (after the initial restore).
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        "stocksahi-indicators",
        JSON.stringify({ activeIds, params: indicatorParams })
      );
    } catch {
      /* ignore */
    }
  }, [activeIds, indicatorParams, restored]);

  // Lines are intentionally NOT persisted — they're "in-the-moment" levels, so
  // they reset per stock and clear when the app closes. This nudges a fresh
  // read of the chart each time rather than anchoring on a stale old level.
  useEffect(() => {
    setHLines([]);
  }, [symbol]);
  const candleSeriesRef = useRef<import("lightweight-charts").ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleRef = useRef<Candle | null>(null);
  const chartRef = useRef<import("lightweight-charts").IChartApi | null>(null);

  const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1d"];

  // Fetch candles when symbol or timeframe changes.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setCandles(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`
        );
        const data = await res.json();
        const c: Candle[] = data?.candles ?? [];
        if (cancelled) return;
        if (c.length === 0) { setStatus("empty"); return; }
        setCandles(c);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, tf]);

  // Build / rebuild the chart whenever candles or active indicators change.
  useEffect(() => {
    if (!candles || candles.length === 0) return;
    let chart: import("lightweight-charts").IChartApi | null = null;
    let disposed = false;
    let cleanupResize: (() => void) | null = null;

    (async () => {
      try {
        const LWC = await import("lightweight-charts");
        const { createChart, CandlestickSeries, LineSeries, ColorType } = LWC;
        if (disposed || !priceRef.current) return;

        const isDark = document.documentElement.classList.contains("dark");
        const textColor = isDark ? "#cbd5e1" : "#475569";
        const gridColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.18)";

        // How many separate panes do we need?
        const separateActive = activeIds
          .map((id) => INDICATOR_BY_ID[id])
          .filter((d) => d && d.pane === "separate");

        // In fullscreen, fill the viewport; otherwise use the fixed height.
        const baseHeight = document.fullscreenElement
          ? Math.max(360, window.innerHeight - 120)
          : height + separateActive.length * 120;

        chart = createChart(priceRef.current, {
          height: baseHeight,
          layout: {
            textColor,
            background: { type: ColorType.Solid, color: "transparent" },
            attributionLogo: true,
          },
          grid: {
            vertLines: { color: gridColor },
            horzLines: { color: gridColor },
          },
          rightPriceScale: { borderColor: gridColor },
          timeScale: {
            borderColor: gridColor,
            timeVisible: true,
            secondsVisible: false,
            // Render tick labels in IST (UTC+5:30) instead of UTC.
            tickMarkFormatter: (time: number) => {
              const d = new Date((time + 5.5 * 3600) * 1000);
              const hh = String(d.getUTCHours()).padStart(2, "0");
              const mm = String(d.getUTCMinutes()).padStart(2, "0");
              return `${hh}:${mm}`;
            },
          },
          localization: {
            // Crosshair tooltip time in IST.
            timeFormatter: (time: number) => {
              const d = new Date((time + 5.5 * 3600) * 1000);
              const day = d.getUTCDate();
              const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
              const hh = String(d.getUTCHours()).padStart(2, "0");
              const mm = String(d.getUTCMinutes()).padStart(2, "0");
              return `${day} ${month}, ${hh}:${mm}`;
            },
          },
          crosshair: { mode: 0 },
          // Smoother trackpad interaction: enable pinch zoom, keep panning clean.
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            mouseWheel: true,
            pinch: true,
            axisPressedMouseMove: true,
            axisDoubleClickReset: true,
          },
          kineticScroll: {
            touch: true,
            mouse: false,
          },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#16a34a",
          downColor: "#dc2626",
          borderVisible: false,
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
        });
        candleSeries.setData(candles as never);
        candleSeriesRef.current = candleSeries;
        chartRef.current = chart;
        lastCandleRef.current = candles[candles.length - 1];

        // Draw active indicators. Overlays -> pane 0; each separate -> own pane.
        // Also collect Groww-style legend rows (name + settings + latest value).
        const legendByPane: Record<number, { name: string; values: { text: string; color: string }[] }[]> = {};
        const codeOf = (name: string) => {
          const m = name.match(/\(([^)]+)\)\s*$/);
          return m ? m[1] : name;
        };
        const settingsStr = (def: typeof INDICATOR_BY_ID[string], pv: ParamValues) =>
          (def.params || [])
            .filter((s) => s.control === "number")
            .filter((s) => !(s.key === "smoothingLength" && pv["smoothingType"] === "none"))
            .map((s) => pv[s.key])
            .join(" ");
        const fmt = (n: number) =>
          Math.abs(n) >= 1000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : n.toFixed(2);

        let nextPane = 1;
        const paneSeries: Record<string, import("lightweight-charts").ISeriesApi<"Candlestick" | "Line">> = {
          price: candleSeries,
        };
        for (const id of activeIds) {
          const def = INDICATOR_BY_ID[id];
          if (!def) continue;
          const pv = mergeParams(def, indicatorParams[id]);
          const lines = def.compute(candles, pv);
          const paneIndex = def.pane === "price" ? 0 : nextPane++;

          let firstSeries: import("lightweight-charts").ISeriesApi<"Line"> | null = null;
          for (const ln of lines) {
            const s = chart.addSeries(
              LineSeries,
              { color: ln.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: def.pane !== "price" },
              paneIndex
            );
            s.setData(ln.data as never);
            if (!firstSeries) firstSeries = s;
          }
          // For a separate pane, remember its series so lines can attach there.
          if (def.pane === "separate" && firstSeries) paneSeries[id] = firstSeries;

          // Build one legend row for this indicator: NAME settings  v1 v2...
          const code = codeOf(def.name);
          const setStr = settingsStr(def, pv);
          const values = lines.map((ln) => {
            const last = ln.data.length ? ln.data[ln.data.length - 1].value : null;
            return { text: last != null ? fmt(last) : "—", color: ln.color };
          });
          (legendByPane[paneIndex] ||= []).push({
            name: setStr ? `${code} ${setStr}` : code,
            values,
          });
        }

        chart.timeScale().fitContent();
        setStatus("ready");
        paneSeriesRef.current = paneSeries;
        createdLinesRef.current = []; // series were recreated; old line refs are stale
        setDrawNonce((n) => n + 1);

        // Position legend labels at the top of each pane. We defer to the next
        // frame so all sub-panes are registered and laid out before we measure.
        const paneKeys = Object.keys(legendByPane).map(Number);
        requestAnimationFrame(() => {
          if (disposed || !chart) return;
          try {
            const panes = chart.panes();
            const tops: number[] = [];
            let cum = 0;
            for (let i = 0; i < panes.length; i++) {
              tops[i] = cum;
              cum += panes[i].getHeight();
            }
            const built = paneKeys.map((idx) => ({
              top: tops[idx] ?? 0,
              rows: legendByPane[idx],
            }));
            setLegend(built);
          } catch {
            const rows = Object.values(legendByPane).flat();
            setLegend(rows.length ? [{ top: 0, rows }] : []);
          }
        });

        const onResize = () => {
          if (chart && priceRef.current) {
            chart.applyOptions({ width: priceRef.current.clientWidth });
          }
        };
        onResize();
        window.addEventListener("resize", onResize);
        cleanupResize = () => window.removeEventListener("resize", onResize);
      } catch (err) {
        console.error("Chart build error:", err);
        if (!disposed) setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      if (cleanupResize) cleanupResize();
      candleSeriesRef.current = null;
      chartRef.current = null;
      if (chart) { chart.remove(); chart = null; }
    };
  }, [candles, activeIds, height, isFullscreen, indicatorParams]);

  // Apply horizontal lines to their panes (reapplied after every chart rebuild).
  useEffect(() => {
    for (const { series, line } of createdLinesRef.current) {
      try { series.removePriceLine(line); } catch { /* series gone */ }
    }
    createdLinesRef.current = [];
    for (const hl of hLines) {
      const series = paneSeriesRef.current[hl.pane];
      if (!series) continue;
      try {
        const line = series.createPriceLine({
          price: hl.price,
          color: hl.color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "",
        } as never);
        createdLinesRef.current.push({ series, line });
      } catch { /* ignore */ }
    }
  }, [hLines, drawNonce]);

  // Merge live ticks into the latest candle (intraday timeframes only).
  useEffect(() => {
    if (tf === "1d") return; // daily chart isn't a live intraday view
    const ltp = live.ltp;
    const series = candleSeriesRef.current;
    const last = lastCandleRef.current;
    if (ltp == null || !series || !last) return;

    const intervalSec = TF_SECONDS[tf] ?? 300;
    const nowUnix = Math.floor(Date.now() / 1000);

    if (nowUnix < last.time + intervalSec) {
      // Still within the current candle → update it.
      const updated: Candle = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, ltp),
        low: Math.min(last.low, ltp),
        close: ltp,
      };
      lastCandleRef.current = updated;
      try { series.update(updated as never); } catch { /* series gone */ }
    } else {
      // Interval rolled over → start a new candle aligned to the session grid.
      const steps = Math.floor((nowUnix - last.time) / intervalSec);
      const newTime = last.time + steps * intervalSec;
      const fresh: Candle = {
        time: newTime,
        open: ltp,
        high: ltp,
        low: ltp,
        close: ltp,
      };
      lastCandleRef.current = fresh;
      try { series.update(fresh as never); } catch { /* series gone */ }
    }
  }, [live.ltp, tf]);

  const toggle = (id: string) =>
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const applyPreset = (ids: string[]) => {
    setActiveIds((prev) => Array.from(new Set([...prev, ...ids])));
    setPickerOpen(false);
  };

  // Fullscreen: toggle the chart container in/out of native fullscreen.
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Zoom by changing how many candles are visible. Smaller range = zoomed in.
  const zoom = (factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const center = (range.from + range.to) / 2;
    const newSpan = Math.max(8, span * factor); // never fewer than ~8 candles
    ts.setVisibleLogicalRange({
      from: center - newSpan / 2,
      to: center + newSpan / 2,
    });
  };
  const zoomIn = () => zoom(0.6); // show fewer candles
  const zoomOut = () => zoom(1.6); // show more candles
  const resetZoom = () => chartRef.current?.timeScale().fitContent();

  // Keep the button in sync (e.g. when the user presses Esc) and resize chart.
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Let the layout settle, then nudge the chart to refill the space.
      setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? "bg-background p-3 overflow-auto h-screen w-screen relative" : ""}
    >
    {/* Fullscreen trade overlay (opened by the B/S toolbar buttons) */}
    {isFullscreen && overlaySide && name && (
      <div className="absolute top-3 right-3 z-30 w-[320px] max-w-[90vw]">
        <div className="relative">
          <button
            onClick={() => setOverlaySide(null)}
            className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground hover:text-foreground shadow"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <TradePanel
            symbol={symbol}
            name={name}
            fallbackPrice={fallbackPrice}
            side={overlaySide}
            onSideChange={setOverlaySide}
            onPlaced={() => {
              setOverlaySide(null);
              setFsPlaced(true);
              setTimeout(() => setFsPlaced(false), 2600);
            }}
          />
        </div>
      </div>
    )}

    {/* Fullscreen-visible "trade placed" confirmation (toasts live outside the
        fullscreen element, so we show our own here). */}
    {isFullscreen && fsPlaced && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
        Trade placed ✓ — see Open Positions after exiting fullscreen
      </div>
    )}
    <Card className={isFullscreen ? "h-full border-0 shadow-none" : ""}>
      <CardHeader className="pb-2 flex flex-col items-stretch gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">Chart</CardTitle>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-secondary p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-smooth ${
                  tf === t
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Indicators
            {activeIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {activeIds.length}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLinesOpen(true)} className="gap-1.5 shrink-0">
            <span className="text-base leading-none">—</span>
            Lines
            {hLines.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {hLines.length}
              </Badge>
            )}
          </Button>
          {isFullscreen && name && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setOverlaySide("buy")}
                title="Buy (paper)"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-smooth"
              >
                B
              </button>
              <button
                onClick={() => setOverlaySide("sell")}
                title="Sell (paper)"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-smooth"
              >
                S
              </button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1.5 shrink-0"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active indicator chips */}
        {activeIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeIds.map((id) => {
              const def = INDICATOR_BY_ID[id];
              if (!def) return null;
              const hasSettings = !!def.params && def.params.length > 0;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                >
                  {def.name.replace(/ \(.*\)/, "")}
                  {hasSettings && (
                    <button
                      onClick={() => setSettingsId(id)}
                      title="Settings"
                      className="text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      <Settings2 className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => toggle(id)}
                    title="Remove"
                    className="text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="relative">
          <div ref={priceRef} style={{ width: "100%" }} />

          {/* Groww-style indicator labels at the top-left of each pane */}
          {status === "ready" && legend.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-[5]">
              {legend.map((pane, i) => (
                <div
                  key={i}
                  className="absolute left-2 flex flex-col gap-0.5"
                  style={{ top: pane.top + 4 }}
                >
                  {pane.rows.map((row, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-[11px] leading-tight">
                      <span className="text-muted-foreground font-medium">{row.name}</span>
                      {row.values.map((v, k) => (
                        <span key={k} style={{ color: v.color }} className="font-semibold">
                          {v.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Floating zoom controls — bottom-left, clear of the legend */}
          {status === "ready" && (
            <div className="absolute bottom-3 left-3 z-10 flex gap-1">
              <button
                onClick={zoomIn}
                title="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 backdrop-blur text-foreground shadow-sm hover:bg-secondary transition-smooth"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={zoomOut}
                title="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 backdrop-blur text-foreground shadow-sm hover:bg-secondary transition-smooth"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={resetZoom}
                title="Reset zoom"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 backdrop-blur text-foreground shadow-sm hover:bg-secondary transition-smooth"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {status === "loading" && (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading chart…</p>
          )}
          {status === "empty" && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No candle data available for this stock.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-rose-500 py-8 text-center">
              Couldn&apos;t load the chart. Try refreshing.
            </p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/80 mt-2">
          Add indicators with the button above. They&apos;re educational tools for
          studying price history — not buy or sell signals.
        </p>
      </CardContent>

      <IndicatorPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeIds={activeIds}
        onToggle={toggle}
        onApplyPreset={applyPreset}
        portalContainer={isFullscreen ? containerRef.current : null}
      />

      <IndicatorSettings
        def={settingsId ? INDICATOR_BY_ID[settingsId] : null}
        open={settingsId !== null}
        onOpenChange={(o) => { if (!o) setSettingsId(null); }}
        values={settingsId ? mergeParams(INDICATOR_BY_ID[settingsId], indicatorParams[settingsId]) : {}}
        onChange={(params) => { if (settingsId) updateParams(settingsId, params); }}
        portalContainer={isFullscreen ? containerRef.current : null}
      />

      <Dialog open={linesOpen} onOpenChange={setLinesOpen}>
        <DialogContent className="max-w-sm" portalContainer={isFullscreen ? containerRef.current : null}>
          <DialogHeader>
            <DialogTitle className="text-base">Horizontal Lines</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add a level on the price chart or an indicator pane, then type its exact
              value. Lines are saved for this stock.
            </p>

            {/* Add buttons per available pane */}
            <div className="flex flex-wrap gap-1.5">
              {linePaneOptions.map((opt) => (
                <Button key={opt.key} variant="outline" size="sm" onClick={() => addHLine(opt.key)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Existing lines */}
            {hLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No lines yet.</p>
            ) : (
              <div className="space-y-2">
                {hLines.map((l) => {
                  const paneLabel = linePaneOptions.find((o) => o.key === l.pane)?.label
                    ?? (l.pane === "price" ? "Price" : l.pane);
                  return (
                    <div key={l.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={l.color}
                        onChange={(e) => setHLines((prev) => prev.map((x) => x.id === l.id ? { ...x, color: e.target.value } : x))}
                        className="h-8 w-9 cursor-pointer rounded-md border border-input bg-background p-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 truncate">{paneLabel}</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={String(l.price)}
                        onChange={(e) => updateHLine(l.id, Number(e.target.value))}
                        className="h-8 flex-1"
                      />
                      <button
                        onClick={() => removeHLine(l.id)}
                        title="Remove"
                        className="text-muted-foreground hover:text-rose-500 transition-smooth"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
