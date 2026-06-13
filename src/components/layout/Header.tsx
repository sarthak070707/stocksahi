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
      <div className="relative flex h-16 w-full items-center px-5 sm:px-8">
        {/* Logo / App name — clickable to go home */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 transition-smooth hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Stock<span className="text-primary">Sahi</span>
          </span>
        </button>

        {/* Tagline — hidden on mobile, divider for separation */}
        <span className="ml-4 hidden border-l border-border/60 pl-4 text-sm text-muted-foreground md:inline">
          Indian stock research, explained simply
        </span>

        {/* Spacer pushes the right-side actions to the edge */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <TradeHistoryButton />

          {/* Educational badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Educational only
          </div>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>

        {/* Mode switch — absolutely centered so it never shifts when the
            right-side content changes between modes (e.g. Trade History
            appears only in intraday). */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto">
            <ModeSwitch />
          </div>
        </div>
      </div>
    </header>
  );
}
