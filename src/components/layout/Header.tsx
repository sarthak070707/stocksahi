/**
 * Header.tsx
 * 
 * Top navigation bar with the app name, tagline, theme toggle, and
 * educational badge. Clean, calm, trustworthy design.
 */

"use client";

import { TrendingUp } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ModeSwitch } from "@/components/mode/ModeSwitch";
import { TradeHistoryButton } from "@/components/paper/TradeHistoryButton";

interface HeaderProps {
  onLogoClick: () => void;
}

export function Header({ onLogoClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="relative flex h-16 w-full items-center gap-2 px-4 sm:px-8">
        {/* Logo / App name — clickable to go home. Icon always; wordmark on >= sm. */}
        <button
          onClick={onLogoClick}
          className="flex shrink-0 items-center gap-2 transition-smooth hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Stock<span className="text-primary">Sahi</span>
          </span>
        </button>

        {/* Tagline — desktop only */}
        <span className="ml-2 hidden border-l border-border/60 pl-4 text-sm text-muted-foreground md:inline">
          Indian stock research, explained simply
        </span>

        {/* Mobile: mode switch sits in normal flow, centered (no overlap). */}
        <div className="flex flex-1 justify-center sm:hidden">
          <ModeSwitch />
        </div>

        {/* Desktop spacer pushes the right-side actions to the edge */}
        <div className="hidden flex-1 sm:block" />

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <TradeHistoryButton />

          {/* Educational badge — desktop only */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Educational only
          </div>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>

        {/* Desktop: mode switch absolutely centered so it never shifts when the
            right-side content changes between modes (Trade History is intraday-
            only). On mobile it lives in normal flow above instead. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
          <div className="pointer-events-auto">
            <ModeSwitch />
          </div>
        </div>
      </div>
    </header>
  );
}
