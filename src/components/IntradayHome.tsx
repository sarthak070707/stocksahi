/**
 * IntradayHome.tsx
 *
 * The home view shown in INTRADAY mode (distinct from the Swing home). Instead
 * of fundamental screener cards, it teaches what intraday traders look for when
 * choosing a stock — framed as education ("what to look for and why"), never as
 * "today's stocks to trade". Also surfaces the discipline/psychology side that
 * makes intraday different.
 */

"use client";

import { StockSearch } from "@/components/stock/StockSearch";
import { PracticeStocks } from "@/components/PracticeStocks";
import {
  Zap,
  Droplets,
  Activity,
  Newspaper,
  Building2,
  Brain,
  ShieldAlert,
} from "lucide-react";

interface IntradayHomeProps {
  onSelectStock: (symbol: string) => void;
}

export function IntradayHome({ onSelectStock }: IntradayHomeProps) {
  return (
    <div className="relative space-y-16 sm:space-y-20">
      {/* Ambient glow (amber-tinted to distinguish from swing's green) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] max-w-[120vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 35%, #f59e0b, transparent 70%)",
          opacity: 0.1,
        }}
      />

      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-6 pb-4 sm:pt-12 sm:pb-8">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-600">
          <Zap className="h-3.5 w-3.5" />
          Intraday mode
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Learn to read
          <br className="hidden sm:block" />{" "}
          <span className="text-amber-500">the market, live</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Intraday means buying and selling within the same day. It moves fast
          and demands discipline. StockSahi helps you understand the charts,
          indicators, and — just as importantly — the mindset.
        </p>

        <div className="mt-9 w-full max-w-2xl">
          <StockSearch onSelectStock={onSelectStock} />
          <p className="mt-3 text-xs text-muted-foreground">
            Search a stock to open its live chart and indicators
          </p>
        </div>
      </section>

      {/* What intraday traders look for */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            What intraday traders look for in a stock
          </h2>
          <p className="text-sm text-muted-foreground">
            Different from long-term investing. These are concepts to understand
            — not a list of stocks to trade today.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <ConceptCard
            icon={<Droplets className="h-5 w-5" />}
            title="Liquidity & Volume"
            description="Intraday traders favour stocks that trade in large volumes, so they can enter and exit quickly without the price jumping against them. Thinly-traded stocks can be hard to get out of."
          />
          <ConceptCard
            icon={<Activity className="h-5 w-5" />}
            title="Volatility (price movement)"
            description="Intraday profit comes from price moving within the day. Stocks with a wider daily range offer more opportunity — but with more risk. Bigger swings cut both ways."
          />
          <ConceptCard
            icon={<Newspaper className="h-5 w-5" />}
            title="News & catalysts"
            description="Stocks reacting to fresh news — results, announcements, sector moves — often see active intraday trading. Understanding the 'why' behind a move matters more than the move itself."
          />
          <ConceptCard
            icon={<Building2 className="h-5 w-5" />}
            title="Familiar, liquid large-caps"
            description="Many beginners start with well-known, heavily-traded large-caps because they're liquid and easy to find information on — making them simpler to study while you learn."
          />
        </div>
      </section>

      {/* Stocks to practice on */}
      <PracticeStocks onSelectStock={onSelectStock} />

      {/* The part most apps skip: discipline & psychology */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            The part that matters most: discipline
          </h2>
          <p className="text-sm text-muted-foreground">
            Intraday is as much about controlling yourself as reading the chart.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <ConceptCard
            accent
            icon={<Brain className="h-5 w-5" />}
            title="Emotions move money"
            description="Fear and greed drive most poor decisions — chasing a stock that's already run, or holding a loser hoping it bounces back. Recognising these urges is the first skill an intraday trader builds."
          />
          <ConceptCard
            accent
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Knowing when to stop"
            description="A stop-loss is a pre-decided point to exit if a trade goes against you, so a small loss doesn't become a big one. Equally important: knowing when to stop for the day. Discipline beats prediction."
          />
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          StockSahi teaches these concepts to help you understand intraday
          trading. It is educational only and never tells you what or when to
          buy, sell, or set a stop.
        </p>
      </section>
    </div>
  );
}

function ConceptCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-5 hover:border-amber-500/40 transition-smooth">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg mb-3 ${
          accent
            ? "bg-amber-500/10 text-amber-600"
            : "bg-secondary text-foreground"
        }`}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
