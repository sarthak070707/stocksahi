/**
 * Footer.tsx
 * 
 * Sticky footer with the LEGAL DISCLAIMER.
 * This is required — the app is for education, NOT financial advice.
 * 
 * Uses CSS variable-based disclaimer classes so the amber warning
 * adapts properly to dark mode (darker amber tones for readability).
 */

"use client";

import { Info, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Disclaimer — theme-aware via CSS variables */}
        <div className="flex items-start gap-3 rounded-xl border p-4 disclaimer-box">
          <Info className="mt-0.5 h-5 w-5 shrink-0 disclaimer-icon" />
          <div className="space-y-1">
            <p className="text-sm font-medium disclaimer-title">
              Important Disclaimer
            </p>
            <p className="text-xs leading-relaxed disclaimer-text">
              StockSahi provides educational information only. This is{" "}
              <strong>NOT financial advice</strong>, investment advice, or a
              recommendation to buy, sell, or hold any stock. Data is sourced
              from company filings and market data providers and may contain
              errors or delays — verify anything important with an official
              source. Quality factors and comparisons are neutral observations,
              not verdicts. Always do your own research and consult a
              SEBI-registered financial advisor before making any investment
              decision. Past performance does not guarantee future results.
            </p>
          </div>
        </div>

        {/* Built by — attribution */}
        <div className="mt-4 flex items-center justify-center">
          <a
            href="https://www.linkedin.com/in/sarthak-arya-059920303/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-sm font-medium text-foreground transition-smooth hover:border-primary/50 hover:text-primary"
          >
            <Linkedin className="h-4 w-4" />
            Built by Sarthak Arya
          </a>
        </div>

        {/* Bottom line */}
        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} StockSahi — Built for learning, not
            trading.
          </span>
          <span>
            Data from company filings &amp; market sources. Not affiliated with
            NSE or any company listed.
          </span>
        </div>
      </div>
    </footer>
  );
}
