/**
 * HomePageContent.tsx
 * 
 * The main content component for the home page.
 * Separated from page.tsx so it can be wrapped in Suspense
 * (required for useSearchParams in Next.js App Router).
 */

"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StockSearch } from "@/components/stock/StockSearch";
import { StockDetailView } from "@/components/stock/StockDetail";
import { ScreenerPresets } from "@/components/screener/ScreenerPresets";
import { IntradayHome } from "@/components/IntradayHome";
import { useMode } from "@/components/mode/ModeContext";
import { Sparkles, BookOpen, Target, BarChart3 } from "lucide-react";

export function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSymbol = searchParams.get("symbol");
  const { mode } = useMode();

  // Navigate to a stock detail view
  const viewStock = useCallback(
    (symbol: string) => {
      router.push(`?symbol=${encodeURIComponent(symbol)}`);
    },
    [router]
  );

  // Go back to home view
  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header onLogoClick={goHome} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {selectedSymbol ? (
            /* ── STOCK DETAIL VIEW ── */
            <StockDetailView symbol={selectedSymbol} onBack={goHome} />
          ) : mode === "intraday" ? (
            /* ── INTRADAY HOME VIEW ── */
            <IntradayHome onSelectStock={viewStock} />
          ) : (
            /* ── HOME VIEW ── */
            <div className="relative space-y-16 sm:space-y-20">
              {/* Subtle ambient glow behind the hero (pure decoration) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] max-w-[120vw] -translate-x-1/2"
                style={{
                  background:
                    "radial-gradient(ellipse 50% 50% at 50% 35%, var(--color-primary), transparent 70%)",
                  opacity: 0.12,
                }}
              />

              {/* Hero section with search */}
              <section className="flex flex-col items-center text-center pt-6 pb-4 sm:pt-12 sm:pb-8">
                <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Built for beginners
                </span>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Understand stocks,
                  <br className="hidden sm:block" />{" "}
                  <span className="text-primary">without the jargon</span>
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  StockSahi puts everything in one clean place and explains it
                  in plain English — so you learn while you research Indian
                  stocks.
                </p>

                {/* Search bar */}
                <div className="mt-9 w-full max-w-2xl">
                  <StockSearch onSelectStock={viewStock} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Try searching for &quot;Reliance&quot;, &quot;TCS&quot;, or
                    &quot;HDFC&quot;
                  </p>
                </div>
              </section>

              {/* How it works — 3-step guide */}
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    How it works
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Three steps from &quot;no idea&quot; to confident research.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                  <HowItWorksCard
                    icon={<Target className="h-5 w-5" />}
                    step="1"
                    title="Search a stock"
                    description="Type a company name or NSE symbol. See price, fundamentals, and news — all in one place."
                  />
                  <HowItWorksCard
                    icon={<BookOpen className="h-5 w-5" />}
                    step="2"
                    title="Learn as you go"
                    description='Every metric has a "?" tooltip explaining it in plain English. No jargon without explanation.'
                  />
                  <HowItWorksCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    step="3"
                    title="Use the screener"
                    description='Pick a preset like "Low Debt" or "Steady Growers" to discover stocks matching common patterns.'
                  />
                </div>
              </section>

              {/* Screener */}
              <section>
                <ScreenerPresets onSelectStock={viewStock} />
              </section>

              {/* Bottom educational note */}
              <section className="text-center pb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Start by searching a stock above, or try the screener to
                  explore
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** A small card explaining one step of "How it works" */
function HowItWorksCard({
  icon,
  step,
  title,
  description,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-6 card-hover">
      {/* Faint step number watermark */}
      <span className="pointer-events-none absolute right-5 top-4 text-3xl font-bold text-muted-foreground/10 select-none">
        {step}
      </span>

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
