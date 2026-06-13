/**
 * ExplanationTooltip.tsx
 *
 * A reusable "?" icon next to any metric. CLICK or TAP it to see a
 * beginner-friendly explanation right there — no need to expand anything.
 *
 * Uses a Popover (opens on click/tap) so it works on phones and desktop alike.
 * It's self-contained and doesn't depend on a TooltipProvider elsewhere.
 */

"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface ExplanationTooltipProps {
  /** The explanation text to show. */
  explanation: string;
  /** Optional longer explanation; if given, it's shown instead of `explanation`. */
  longExplanation?: string;
  /** The term being explained (shown as a small heading). */
  term?: string;
  /** Icon size. */
  size?: "sm" | "md";
}

export function ExplanationTooltip({
  explanation,
  longExplanation,
  term,
  size = "sm",
}: ExplanationTooltipProps) {
  const text = longExplanation || explanation;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          aria-label={`What does ${term || "this"} mean?`}
        >
          <HelpCircle className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={6}
        className="max-w-[280px] w-auto rounded-lg border bg-card text-card-foreground shadow-lg px-3 py-2.5"
      >
        {term && (
          <p className="mb-1 text-xs font-semibold text-foreground">{term}</p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
