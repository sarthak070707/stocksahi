/**
 * IntradayMechanics.tsx
 *
 * A deliberately BRIEF lesson set on how intraday trading actually works in
 * practice: order types, fills/slippage, costs, and the session/square-off.
 * Kept short and plain on purpose — a beginner needs to know these exist and
 * roughly how they work, not a deep dive that would only confuse. This also
 * closes the honesty loop on the things we chose not to simulate (slippage,
 * limit orders, real costs): we teach them instead of faking them.
 *
 * Concepts only — no "use X order to do Y". Plain prose, clean spacing.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonCard, type Lesson } from "./IntradayLessons";
import { ArrowLeftRight, Shuffle, Receipt, CalendarClock, Cog } from "lucide-react";

const MECHANICS_LESSONS: Lesson[] = [
  {
    id: "order-types",
    icon: ArrowLeftRight,
    title: "Market vs limit orders",
    teaser: "The two basic ways to place a trade.",
    body: (
      <>
        <p>
          A market order says fill me now at whatever the current price is. It happens
          immediately, which is why this app uses it — your paper trades fill at the live
          price.
        </p>
        <p>
          A limit order says only fill me at my price or better. It waits, and may never
          fill if price does not reach it. So a market order gets you in for sure but not at
          a guaranteed price; a limit order guarantees the price but not the fill.
        </p>
      </>
    ),
  },
  {
    id: "fills",
    icon: Shuffle,
    title: "How fills work (and slippage)",
    teaser: "Why a real fill can differ from the price you saw.",
    body: (
      <>
        <p>
          In this app your order fills exactly at the live price. In real trading, a large
          market order can fill at a slightly worse average price, because it uses up the
          cheapest shares available and reaches into higher-priced ones. That gap is called
          slippage.
        </p>
        <p>
          For small orders it is tiny; for big orders in thinly-traded stocks it can add up.
          Worth knowing so your real results are not a surprise compared with your paper
          practice here.
        </p>
      </>
    ),
  },
  {
    id: "costs",
    icon: Receipt,
    title: "The cost of trading",
    teaser: "Small charges that add up fast when you trade often.",
    body: (
      <>
        <p>
          Every trade carries costs: brokerage, government charges like STT, and a few other
          small fees. On a single trade they are minor.
        </p>
        <p>
          But intraday means many trades, and these costs repeat every single time, quietly
          eating into returns. It is one real reason frequent trading is harder to win at
          than it looks. Paper trading here does not charge them, so real results would be a
          bit lower than what you see.
        </p>
      </>
    ),
  },
  {
    id: "session",
    icon: CalendarClock,
    title: "The session & square-off",
    teaser: "How the day is shaped, and why intraday closes by evening.",
    body: (
      <>
        <p>
          The Indian market runs from 9:15am to 3:30pm. The open is usually the most
          volatile part of the day, the middle tends to quieten down, and activity picks up
          again near the close.
        </p>
        <p>
          Intraday means a position is meant to close the same day. If you do not close it
          yourself, your broker automatically squares it off before the market shuts — you
          cannot carry an intraday position overnight.
        </p>
      </>
    ),
  },
];

export function IntradayMechanics() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Cog className="h-5 w-5 text-amber-600" />
          How intraday actually works
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The practical plumbing, in short — good to know before you trade. Tap any topic.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {MECHANICS_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} />)}
      </CardContent>
    </Card>
  );
}
