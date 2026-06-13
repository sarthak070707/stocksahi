/**
 * HowToReadThisStock.tsx
 *
 * A step-by-step guided walkthrough that teaches a beginner HOW to read this
 * stock's numbers and think for themselves — using the company's ACTUAL data.
 *
 * IMPORTANT (legal): This is EDUCATION, not advice. It walks through the
 * questions a careful investor asks and what each number means. It must NEVER
 * tell the user to buy, sell, or hold, and never says a stock is "good" or
 * "bad" as an investment. It teaches the thinking; the user decides.
 */

"use client";

import { useState } from "react";
import {
  TrendingUp,
  Scale,
  Tag,
  Sprout,
  Compass,
  Repeat,
  Users,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StockDetail } from "@/lib/stock-types";

interface Step {
  id: string;
  title: string;
  icon: React.ReactNode;
  /** The key number(s) from THIS stock, shown as a highlight */
  stat: { label: string; value: string };
  /** Beginner-friendly, tailored explanation — teaches how to read it */
  body: string;
  /** What a careful investor checks next — the "skill" takeaway */
  checkThis: string;
}

/** Build the walkthrough steps from this stock's real numbers. */
function buildSteps(stock: StockDetail): Step[] {
  const f = stock.fundamentals;
  const isBank =
    /bank/i.test(stock.industry) || stock.sector === "Financial Services";

  // --- Step 1: Profitability (ROE) ---
  const roe = f.roe;
  const roeReading =
    roe >= 15 ? "strong" : roe >= 10 ? "fairly healthy" : "on the lower side";

  // --- Step 2: Debt ---
  const dte = f.debtToEquity;
  const debtReading = isBank
    ? "bank"
    : dte < 0.3
    ? "low"
    : dte <= 1
    ? "moderate"
    : "high";

  // --- Step 3: Valuation (P/E) ---
  const pe = f.pe;

  // --- Optional peer-comparison step (only if we have sector data) ---
  const sc = stock.sectorComparison;
  const peRow = sc?.find((r) => r.label === "P/E");
  const roeRow = sc?.find((r) => r.label === "ROE");
  const firstName = stock.name.split(" ")[0];
  const peerStep: Step | null =
    peRow && roeRow
      ? {
          id: "peers",
          title: "How does it stack up against peers?",
          icon: <Users className="h-5 w-5" />,
          stat: {
            label: "P/E vs sector",
            value: `${peRow.company} vs ${peRow.sector}`,
          },
          body: `A number means much more in context. Compared with its sector, ${firstName}'s P/E is ${peRow.company} against a sector average of ${peRow.sector}, and its ROE is ${roeRow.company}% against ${roeRow.sector}%. Being above or below the sector isn't automatically good or bad: a higher P/E than peers can mean the market expects faster growth — or simply that it's pricier; an ROE below peers is worth asking about. Use the comparison to raise questions, not to reach a verdict.`,
          checkThis: `Always compare a company with others in the SAME sector. Comparing across different industries — say a bank against an IT firm — is misleading, because each sector has its own normal ranges.`,
        }
      : null;

  return [
    {
      id: "profitability",
      title: "Is the company actually making money?",
      icon: <TrendingUp className="h-5 w-5" />,
      stat: { label: "Return on Equity (ROE)", value: `${roe}%` },
      body: `Start with the most basic question: does this business earn a good profit? A useful gauge is Return on Equity (ROE) — how much profit the company squeezes out of the money shareholders put in. ${stock.name.split(" ")[0]}'s ROE is ${roe}%, which is considered ${roeReading}. As a rough rule, investors treat 15%+ as strong, around 10–15% as decent, and below that as weaker.`,
      checkThis: `Check that profit is consistent over several years, not just one good year. A single number never tells the full story.`,
    },
    {
      id: "debt",
      title: "Can it handle what it owes?",
      icon: <Scale className="h-5 w-5" />,
      stat: {
        label: "Debt-to-Equity",
        value: isBank ? "N/A (bank)" : dte.toFixed(2),
      },
      body: isBank
        ? `Next, debt — but ${stock.name.split(" ")[0]} is a bank, and banks work differently. They use customer deposits to lend money, so the usual debt-to-equity ratio doesn't apply the same way. For banks, you'd instead look at things like bad-loan levels (NPAs) and capital adequacy.`
        : `A company with too much debt is fragile if business slows. Debt-to-equity compares what it owes to what shareholders own. Here it's ${dte.toFixed(
            2
          )}, which is ${debtReading}. A rough guide for most companies: under ~0.3 is low, up to ~1 is moderate, and above 1 deserves a closer look — though capital-heavy industries like telecom or infrastructure naturally carry more.`,
      checkThis: isBank
        ? `For any bank, look up its NPA (bad loans) percentage — lower is healthier.`
        : `Compare the debt level to other companies in the same industry, not across different ones.`,
    },
    {
      id: "valuation",
      title: "Is it cheap or expensive right now?",
      icon: <Tag className="h-5 w-5" />,
      stat: { label: "P/E Ratio", value: pe.toFixed(1) },
      body: `A great company can still be a poor entry if you overpay. The P/E ratio shows how much you're paying for every ₹1 of the company's yearly earnings. ${stock.name.split(
        " "
      )[0]}'s P/E is ${pe.toFixed(
        1
      )} — meaning the market values it at about ₹${pe.toFixed(
        0
      )} for each ₹1 it earns. A high P/E can mean investors expect strong growth, or simply that it's pricey; a low P/E can mean a bargain, or that the market is worried.`,
      checkThis: `P/E only makes sense compared within the same industry. Compare this against other ${stock.sector} companies — never against a bank or an IT firm.`,
    },
    {
      id: "growth",
      title: "Is the business growing?",
      icon: <Sprout className="h-5 w-5" />,
      stat: { label: "Revenue", value: f.revenue == null ? "Not available" : `₹${(f.revenue / 100000).toFixed(2)} Lakh Cr` },
      body: `Profit today matters, but you also want to know where it's heading. Look at whether revenue and profit have been climbing over recent years. Steady, repeatable growth is usually healthier than one explosive year that may not repeat. The "Quality Factors" above give a plain-English read on this company's growth.`,
      checkThis: `Look for a trend across 3–5 years, and ask why it's growing — a durable reason (more customers, new products) beats a one-off.`,
    },
    ...(peerStep ? [peerStep] : []),
    {
      id: "decide",
      title: "Putting it all together",
      icon: <Compass className="h-5 w-5" />,
      stat: { label: "The takeaway", value: "It's your call" },
      body: `Now weigh these together — profitability, debt, price, and growth — like a checklist, not a single score. A company might be very profitable but expensive, or cheap but heavily indebted. There's rarely a perfect stock; investing is about judging the trade-offs against your own goals, how long you plan to hold, and how much risk you're comfortable with.`,
      checkThis: `This guide teaches you HOW to evaluate a stock — it is not a recommendation to buy or sell anything. Always do your own research and consider speaking to a SEBI-registered advisor before investing.`,
    },
    {
      id: "buy-sell",
      title: "When investors generally buy and sell",
      icon: <Repeat className="h-5 w-5" />,
      stat: { label: "Applies to", value: "Any stock" },
      body: `These are general principles, not advice about this or any specific stock. Before BUYING, experienced investors usually settle a few questions first: Does this fit my goal and how long I plan to invest? Do I understand how the business actually earns money? Is the price reasonable compared with similar companies? And could I stay calm if it fell 20% in the short term? When CONSIDERING SELLING, the common reasons are: the original reason you invested no longer holds (the business has fundamentally changed), you need the money, you've reached your goal, or you're rebalancing. The single most common beginner mistake is panic-selling on a temporary dip — price drops alone are not a reason if nothing about the business has changed.`,
      checkThis: `This is general education on how investors think — not a signal to buy or sell anything here. Your decision depends on your own situation; a SEBI-registered advisor can give personal guidance.`,
    },
  ];
}

export function HowToReadThisStock({ stock }: { stock: StockDetail }) {
  const steps = buildSteps(stock);
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const isLast = current === steps.length - 1;
  const isFirst = current === 0;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            How to read this stock
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            A guided walkthrough to help you make sense of the numbers above —
            and decide for yourself.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-6 bg-emerald-600"
                  : i < current
                  ? "w-1.5 bg-emerald-600/50"
                  : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
              {step.icon}
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground">
                Step {current + 1} of {steps.length}
              </div>
              <h3 className="text-base font-semibold leading-snug">
                {step.title}
              </h3>
            </div>
          </div>

          {/* The relevant number from this stock */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {step.stat.label}
            </span>
            <Badge variant="secondary" className="text-sm font-semibold">
              {step.stat.value}
            </Badge>
          </div>

          {/* Explanation */}
          <p className="text-sm leading-relaxed text-foreground/90">
            {step.body}
          </p>

          {/* What to check next */}
          <div className="flex items-start gap-2 rounded-lg bg-emerald-600/5 px-3 py-2.5">
            <Info className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {step.checkThis}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={isFirst}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {isLast ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrent(0)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Start over
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
