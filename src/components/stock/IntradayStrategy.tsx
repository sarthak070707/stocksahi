/**
 * IntradayStrategy.tsx
 *
 * How traders THINK about building a strategy. The most line-sensitive lesson
 * set, so strictly conceptual: what a strategy is, how people reason about
 * combining tools, why exits/risk and testing matter — never a concrete
 * "buy/sell when X" rule, even as an example. No signals, no recommendations.
 *
 * FORMATTING: plain prose, no scattered emphasis-bold, clean spacing.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonCard, type Lesson } from "./IntradayLessons";
import { ClipboardList, GitMerge, LogOut, FlaskConical, Scale, Route } from "lucide-react";

const STRATEGY_LESSONS: Lesson[] = [
  {
    id: "what",
    icon: ClipboardList,
    title: "What a strategy actually is",
    teaser: "Not a secret formula — a written, repeatable set of rules.",
    body: (
      <>
        <p>
          Beginners imagine a strategy is a magic combination of indicators that prints
          money. It is not. A strategy is simply a written, repeatable set of rules you
          decide in advance: what conditions interest you, where you will exit if you are
          wrong, where you will exit if you are right, and how much you will risk.
        </p>
        <p>
          The value is not the rules being right — it is that they are consistent. Writing
          them down means you act the same calm way each time instead of improvising under
          pressure, and it lets you review later whether the approach actually works for you.
        </p>
        <p>
          StockSahi does not hand you a strategy, and you should be sceptical of anyone who
          sells one as a sure thing. What we can do is explain how thoughtful traders
          structure their own thinking, so you can build and test your own.
        </p>
      </>
    ),
  },
  {
    id: "confluence",
    icon: GitMerge,
    title: "Confluence: letting tools agree",
    teaser: "Why traders combine different families instead of stacking similar ones.",
    body: (
      <>
        <p>
          Confluence is the idea of waiting for a few independent things to point the same
          way before you act, rather than relying on a single tool. The key word is
          independent: a trend read and a momentum read tell you different things, so when
          they agree it is more meaningful than five momentum indicators, which mostly repeat
          each other, lining up.
        </p>
        <p>
          That is why the indicator families matter. A sensible approach usually draws on
          different families — say one for direction, one for momentum, and one for context —
          rather than piling on similar ones.
        </p>
        <p>
          The honest caveat is that agreement adds context, not certainty. Tools can all
          agree and price can still do the opposite, because they describe the past and the
          past does not bind the future. Confluence improves the quality of your reasoning;
          it never removes risk.
        </p>
      </>
    ),
  },
  {
    id: "exit",
    icon: LogOut,
    title: "An entry is the easy half",
    teaser: "Exits, stops and sizing are what decide if you survive.",
    body: (
      <>
        <p>
          Beginners spend most of their energy on the entry — when to get in. But entries
          are the easy half. What actually determines whether an approach works over time is
          the part most people skip: where you exit, both when wrong and when right, and how
          much you risk.
        </p>
        <p>
          A strategy that is only an entry idea is not a strategy — it is a guess with a
          start button. A complete approach always answers three things: where is my stop if
          I am wrong, what would make me take profit, and how small must the position be so a
          loss does not hurt. Those last two tie straight back to the discipline lessons
          above.
        </p>
        <p>
          A simple test for any idea: if you cannot state its exit and its risk before you
          enter, it is not ready to trade — not even on paper.
        </p>
      </>
    ),
  },
  {
    id: "test",
    icon: FlaskConical,
    title: "Test before you trust it",
    teaser: "Check an idea against history and on paper — before real money.",
    body: (
      <>
        <p>
          An idea that sounds clever in your head means nothing until it is tested. Traders
          check an approach two ways: backtesting, which asks whether it held up across past
          data, and forward-testing on paper, which asks whether it holds up on live prices
          with no real money at stake.
        </p>
        <p>
          This is exactly what the paper-trading and trade-history tools in StockSahi are
          for. Trade your idea with virtual money, then open your history and look honestly:
          are you actually following your own rules, and where do the losses cluster? Your
          own trade log is the most useful feedback you will get, far more than any tip.
        </p>
        <p>
          Watch for one trap called curve-fitting: tweaking rules until they fit the past
          perfectly. A rule tuned to look great on old data often falls apart on new data.
          Simpler, robust ideas tend to survive better than over-polished ones.
        </p>
      </>
    ),
  },
  {
    id: "expectancy",
    icon: Scale,
    title: "You don't need to be right often",
    teaser: "Why it's the balance over many trades, not any single one.",
    body: (
      <>
        <p>
          Here is a mindset shift that surprises beginners: you can be wrong more often than
          right and still come out fine, and you can be right most of the time and still
          lose. What matters is the balance over many trades — how big your wins are versus
          how big your losses are, combined with how often each happens.
        </p>
        <p>
          This is why the phrase cut losers and let winners run is repeated so often, and why
          a tight stop with a larger potential gain can work even with a modest hit-rate. No
          approach wins every time; chasing a strategy that is always right is chasing
          something that does not exist.
        </p>
        <p>
          So judge an approach over a series of trades, not the last one. One loss does not
          mean the plan is broken, and one win does not mean it is brilliant. Consistency and
          patience are the actual edge.
        </p>
      </>
    ),
  },
];

export function IntradayStrategy() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Route className="h-5 w-5 text-amber-600" />
          Building an approach
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How thoughtful traders structure their thinking — not a formula to follow. Tap any
          topic.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {STRATEGY_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} />)}

        <div className="mt-3 rounded-lg border border-border/60 bg-secondary/40 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">To be clear:</strong> StockSahi does not
            provide strategies, signals, or recommendations. These lessons explain how people
            reason so you can build and test your own approach — always on paper first. Any
            rules you make are your own decision and responsibility.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
