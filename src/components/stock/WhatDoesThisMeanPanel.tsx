/**
 * WhatDoesThisMeanPanel.tsx
 * 
 * An educational panel that explains the metrics shown on the stock page.
 * Beginners can expand it to learn what each metric means in plain English.
 * This is a core feature — weaving education throughout the app.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { metricExplanationMap } from "@/lib/explanations";

export function WhatDoesThisMeanPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get all explanations relevant to the stock page
  const relevantMetrics = [
    "revenue",
    "profit",
    "pe",
    "debtToEquity",
    "roe",
    "dividendYield",
    "eps",
    "bookValue",
    "marketCap",
    "high52w",
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <CardTitle className="text-base text-primary">
              What does all this mean?
            </CardTitle>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )}
        </button>
        {!isExpanded && (
          <p className="text-xs text-muted-foreground mt-1">
            Tap to learn what each number on this page means — explained in
            plain English.
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {relevantMetrics.map((key) => {
              const expl = metricExplanationMap[key];
              if (!expl) return null;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{expl.term}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    {expl.longExplanation}
                  </p>
                </div>
              );
            })}

            <div className="pt-2 border-t border-primary/10">
              <p className="text-xs text-muted-foreground italic">
                Remember: Understanding these metrics helps you read a company's
                financial health — but no single number tells the whole story.
                Always look at the big picture.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
