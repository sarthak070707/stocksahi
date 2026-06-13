/**
 * IntradayLessons.tsx
 *
 * Beginner teaching for intraday mode: expandable lesson cards covering how to
 * read a candlestick chart and what the indicator families actually measure.
 *
 * STRICT LINE: this teaches CONCEPTS only — what each tool describes and how
 * traders think about it. It never says "buy/sell when X", never gives signals.
 *
 * FORMATTING: bold is used sparingly — only for the key term a card introduces,
 * placed mid-line so JSX never drops the surrounding spaces. No emphasis-bold.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CandlestickChart, BarChart3, Clock, TrendingUp, Activity, Gauge,
  Layers, Lightbulb, ChevronDown, GraduationCap, History,
} from "lucide-react";

export interface Lesson {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  teaser: string;
  body: React.ReactNode;
}

const CHART_LESSONS: Lesson[] = [
  {
    id: "candle",
    icon: CandlestickChart,
    title: "How to read a candlestick",
    teaser: "What the body and the wicks are actually telling you.",
    body: (
      <>
        <p>
          Each candle covers one slice of time — on a 5-minute chart, one candle is 5
          minutes. It packs four prices into one shape: where it opened, the highest and
          lowest it traded, and where it closed.
        </p>
        <p>
          The thick part is the body — the distance between the open and the close. Usually
          green means it closed higher than it opened, and red means it closed lower. The
          thin lines above and below are the wicks: the furthest price reached before
          buyers or sellers pushed it back.
        </p>
        <p>
          A long body means one side was firmly in control for that slice. A small body
          with long wicks means price moved around but ended near where it started, which
          shows indecision. That is all a candle is: a compact picture of the tug-of-war
          between buyers and sellers in that window.
        </p>
      </>
    ),
  },
  {
    id: "volume",
    icon: BarChart3,
    title: "What volume tells you",
    teaser: "How many shares changed hands — and why it matters.",
    body: (
      <>
        <p>
          Volume is simply how many shares were traded in that period. On its own it is
          neither good nor bad — it is a measure of participation.
        </p>
        <p>
          A price move on high volume means a lot of people acted on it, so there was
          conviction behind it. The same move on thin volume means very few were involved,
          so it can be less reliable and easier to reverse. Many traders read volume as
          context for a price move, not as a move of its own.
        </p>
        <p>
          Volume is usually highest near the open and close of the session and quieter in
          the middle of the day — worth knowing so a midday lull does not surprise you.
        </p>
      </>
    ),
  },
  {
    id: "timeframes",
    icon: Clock,
    title: "Timeframes (1m, 5m, 15m…)",
    teaser: "Why the same stock looks different on different timeframes.",
    body: (
      <>
        <p>
          The timeframe sets how much time each candle covers. A 1-minute chart shows every
          tiny wiggle; a 15-minute chart smooths those into bigger, calmer candles. Same
          stock, same day, very different picture.
        </p>
        <p>
          Shorter timeframes show more detail but also more noise — lots of small moves
          that do not mean much. Longer timeframes show the broader shape but react slower.
          Neither is correct on its own; they answer different questions, and many traders
          glance at more than one to keep perspective.
        </p>
        <p>
          For learning, 5-minute is a comfortable middle ground — enough detail to see what
          is happening without drowning in every tick.
        </p>
      </>
    ),
  },
];

const INDICATOR_LESSONS: Lesson[] = [
  {
    id: "families",
    icon: Layers,
    title: "The four families of indicators",
    teaser: "Trend, Momentum, Volatility, Volume — what each is for.",
    body: (
      <>
        <p>
          The 50+ indicators in the picker look overwhelming, but almost all fall into four
          families, and each answers a different question.
        </p>
        <p>
          Trend tools, like moving averages, ADX and SuperTrend, describe which way price
          has been heading and how strongly. Momentum tools, like RSI, MACD and Stochastic,
          describe how fast it has been moving. Volatility tools, like Bollinger Bands and
          ATR, describe how much it is swinging. Volume tools, like OBV and MFI, describe
          how much participation is behind the moves.
        </p>
        <p>
          You do not need many. Picking one from a couple of families tells you more than
          stacking five that all measure the same thing.
        </p>
      </>
    ),
  },
  {
    id: "trend",
    icon: TrendingUp,
    title: "Trend tools",
    teaser: "Moving averages, ADX, SuperTrend — reading direction.",
    body: (
      <>
        <p>
          A moving average is just the average price over the last several candles, redrawn
          each candle — it smooths the jitter so the underlying direction is easier to see.
          A shorter average hugs price closely; a longer one is slower and steadier.
        </p>
        <p>
          ADX describes how strong a trend is, not its direction, on a 0 to 100 scale, where
          higher means a more decisive move. SuperTrend draws a line that sits below or
          above price to make the current direction visual.
        </p>
        <p>
          One important caveat: these are lagging tools. They are built from prices that
          already happened, so they describe the trend — they do not predict when it ends.
        </p>
      </>
    ),
  },
  {
    id: "momentum",
    icon: Activity,
    title: "Momentum tools",
    teaser: "RSI, MACD, Stochastic — the speed of a move.",
    body: (
      <>
        <p>
          Momentum tools measure how quickly and forcefully price has been moving. RSI runs
          from 0 to 100; readings above about 70 are often called overbought, meaning price
          rose quickly, and below about 30 oversold.
        </p>
        <p>
          Here is the honest catch beginners miss: overbought does not mean a stock must
          fall. In a strong trend it can stay overbought for a long time. These labels
          describe what already happened — they are not a countdown to a reversal.
        </p>
        <p>
          MACD and Stochastic are variations on the same idea: comparing recent movement to
          longer movement to show whether momentum is building or fading.
        </p>
      </>
    ),
  },
  {
    id: "volvol",
    icon: Gauge,
    title: "Volatility & volume tools",
    teaser: "Bollinger, ATR, OBV — how much it swings, how much trades.",
    body: (
      <>
        <p>
          Volatility tools describe how much price is moving around. Bollinger Bands draw a
          channel around an average — price spends most of its time inside, and the bands
          widen when things get wild and narrow when they calm down. ATR puts a single
          number on the typical move size, which traders often use to size a stop-loss
          sensibly.
        </p>
        <p>
          Volume tools like OBV and MFI combine price with volume to show whether
          participation is flowing in or out.
        </p>
        <p>
          None of these tell you direction by themselves — they add context to what the
          price and trend tools are showing.
        </p>
      </>
    ),
  },
  {
    id: "using",
    icon: Lightbulb,
    title: "How to actually use indicators",
    teaser: "The mindset that keeps them useful (and honest).",
    body: (
      <>
        <p>
          Three things are worth keeping in mind. First, indicators describe the past. Every
          one is calculated from prices that already happened, so they summarise and add
          context — they do not see the future.
        </p>
        <p>
          Second, more is not better. Five momentum indicators all say the same thing and
          crowd your screen. One trend read plus one momentum read usually tells you more
          than a wall of lines.
        </p>
        <p>
          Third, they confirm, they do not command. Traders use them to add evidence to what
          they are already seeing in price and volume, not as a button that says act now.
          That is the difference between a tool and a crutch.
        </p>
      </>
    ),
  },
  {
    id: "review",
    icon: History,
    title: "Learn by reviewing past charts",
    teaser: "The best practice habit — study closed charts with hindsight.",
    body: (
      <>
        <p>
          The fastest way to build intuition is to study charts after the moment has passed
          — previous days, or today&apos;s chart once the session ends. Pick a stock, follow
          how price moved through the day, and watch how each indicator behaved alongside it:
          where a trend tool turned, what momentum did at the highs and lows, and where it
          would have misled you. Because indicators describe the past, a closed chart is a
          free, risk-free teacher, and you can do this any time — even when the market is
          shut.
        </p>
        <p>
          One honest caveat: hindsight makes everything look obvious. The goal is to learn
          how the tools actually behave, not to find a rule that would have worked on that
          one chart — that trap is exactly the curve-fitting the strategy lessons warn about.
          Study to understand the tools, not to convince yourself you have cracked the market.
        </p>
      </>
    ),
  },
];

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  const Icon = lesson.icon;
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-secondary/50 transition-smooth"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">{lesson.title}</span>
          <span className="block text-xs text-muted-foreground truncate">{lesson.teaser}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-4 pt-1 space-y-3 text-sm text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
          {lesson.body}
        </div>
      )}
    </div>
  );
}

export function IntradayLessons() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-amber-600" />
          Learn: reading intraday charts
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tap any topic to learn it. These explain how the tools work — they describe what
          price has done, and never tell you what to buy or sell.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chart basics</p>
          <div className="space-y-2">
            {CHART_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} />)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Understanding indicators</p>
          <div className="space-y-2">
            {INDICATOR_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} />)}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          More lessons — building a strategy, stop-losses, and trading psychology — are
          covered in the sections below. Everything here is educational; StockSahi is not an
          investment adviser.
        </p>
      </CardContent>
    </Card>
  );
}
