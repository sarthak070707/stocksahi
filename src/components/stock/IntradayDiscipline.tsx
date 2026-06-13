/**
 * IntradayDiscipline.tsx
 *
 * The most important — and most protective — teaching in StockSahi: risk and
 * discipline. Honest that intraday trading is hard and most beginners lose.
 * Concepts only — never specific trade instructions, never a number to act on.
 *
 * FORMATTING: plain prose, no scattered emphasis-bold, clean spacing.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonCard, type Lesson } from "./IntradayLessons";
import { ShieldAlert, Ban, Scale, HeartPulse, OctagonPause, ShieldCheck } from "lucide-react";

const RISK_LESSONS: Lesson[] = [
  {
    id: "most-lose",
    icon: ShieldAlert,
    title: "The honest truth: most intraday traders lose",
    teaser: "Start here. This is the most important thing on the page.",
    body: (
      <>
        <p>
          This is uncomfortable but it is the truth, and you deserve to hear it before you
          risk a rupee. Study after study, including research published by SEBI, has
          repeatedly found that the large majority of individual intraday and derivatives
          traders lose money over time. Not a few — the majority.
        </p>
        <p>
          Why? You are competing against full-time professionals and algorithms that are
          faster and better-resourced than you. Every trade has costs — brokerage, taxes and
          slippage — that quietly eat into returns. And the hardest opponent is your own
          brain, which is wired to feel fear and greed at exactly the wrong moments.
        </p>
        <p>
          None of this means never learn. It means treating intraday as a difficult skill to
          study carefully, not a shortcut to money. That is the entire reason StockSahi makes
          you practise with virtual money first — so the lessons cost you learning, not your
          savings.
        </p>
      </>
    ),
  },
  {
    id: "stoploss",
    icon: Ban,
    title: "The stop-loss: your seatbelt",
    teaser: "What it is, and why disciplined traders never skip it.",
    body: (
      <>
        <p>
          A stop-loss is a price you decide in advance at which you will exit a losing trade
          — no debating, no hoping. It is the line where you admit this is not working and
          protect your capital so you are still in the game tomorrow.
        </p>
        <p>
          Why it matters so much: a small loss you planned for is survivable; a large loss
          you kept hoping would recover is what wipes accounts. The classic beginner mistake
          is moving the stop further away as price approaches it, turning a small planned
          loss into a big unplanned one. The discipline is deciding your exit before emotion
          is involved, and then respecting it.
        </p>
        <p>
          A useful mental frame many traders use: before entering, ask where you would be
          proven wrong. That price is your stop. If you cannot answer it, you do not have a
          plan yet, just a hope.
        </p>
      </>
    ),
  },
  {
    id: "sizing",
    icon: Scale,
    title: "Position sizing & how leverage cuts both ways",
    teaser: "The maths that keeps one bad trade from ending your account.",
    body: (
      <>
        <p>
          Position sizing is deciding how much to put into a trade. The core principle
          disciplined traders follow is to risk only a small fraction of your capital on any
          single trade, so that no one trade, or even a run of losing ones, can do serious
          damage. Survival comes first; profit is only possible if you are still trading.
        </p>
        <p>
          Now the part that traps beginners: leverage cuts both ways. The 5x intraday
          leverage in this app, and at real brokers, means a position five times larger than
          your cash. People focus on the 5x gains, but a 5% move against a 5x position is a
          25% loss of your margin. Leverage does not just amplify profit; it amplifies losses
          identically, and it does it fast.
        </p>
        <p>
          Real brokers also auto square-off intraday positions if losses eat your margin, or
          by the end of the day, so you do not always choose your exit. This is exactly why
          position sizing and stop-losses matter more with leverage, not less. Real brokers
          vary leverage by stock and volatility, sometimes up to about 8x, but more leverage
          means more of all of this, not a better deal.
        </p>
      </>
    ),
  },
  {
    id: "emotions",
    icon: HeartPulse,
    title: "Fear, greed & your own brain",
    teaser: "Why the hardest opponent is the one holding the mouse.",
    body: (
      <>
        <p>
          Most losing trades are not bad analysis — they are bad behaviour. Greed makes you
          chase a stock that has already run, which is the fear of missing out, or hold a
          winner too long until it reverses. Fear makes you cut a good trade early, or freeze
          and refuse to take a planned loss.
        </p>
        <p>
          A well-documented pattern is that people tend to cut winners early and let losers
          run — the exact opposite of what protects an account. It feels right in the moment
          because taking a small profit feels safe and taking a loss feels like failure.
          Recognising that pull is half the battle.
        </p>
        <p>
          The antidote is not to be less emotional — it is to have a plan written before you
          enter, covering the entry, the stop and the reason, so the decisions are made when
          you are calm rather than when money is moving on the screen. This is also why the
          paper-trading note asks why this trade: to make you state your reasoning before
          emotion takes over.
        </p>
      </>
    ),
  },
  {
    id: "when-to-stop",
    icon: OctagonPause,
    title: "Knowing when to stop",
    teaser: "Over-trading, revenge trading, and the daily limit.",
    body: (
      <>
        <p>
          Two of the most damaging habits both come from not knowing when to stop.
          Over-trading is taking trade after trade out of boredom or the urge to do
          something — every one carries cost and risk, and they add up. Revenge trading is
          worse: after a loss, jumping into a bigger, hasty trade to win it back, usually
          losing more.
        </p>
        <p>
          A simple guardrail many disciplined traders use is a daily loss limit — a point at
          which you stop for the day, no exceptions. The market is open tomorrow; your
          capital and your head are worth protecting today. Walking away after a loss is not
          weakness, it is the skill.
        </p>
        <p>
          The same applies to winning days — quitting while ahead is also discipline. The
          goal is not to trade as much as possible; it is to trade well and survive long
          enough to get good.
        </p>
      </>
    ),
  },
];

export function IntradayDiscipline() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          Discipline &amp; risk — read this first
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The most valuable lessons here are not about finding trades — they are about not
          getting hurt while you learn. Tap any topic.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {RISK_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} />)}

        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">A genuine word of care.</strong> Trading can
            become compulsive, much like gambling — chasing losses, trading money you cannot
            afford to lose, or feeling unable to stop. If any of that sounds familiar, please
            step back, and consider talking to someone you trust or a professional. Practise
            here with virtual money for as long as you like — there is no rush, and no real
            money is ever at stake in StockSahi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
