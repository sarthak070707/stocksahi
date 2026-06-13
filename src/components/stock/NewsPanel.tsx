/**
 * NewsPanel.tsx
 * 
 * Displays recent news headlines for a stock.
 * Simple list of headlines with source and date.
 * No analysis or sentiment — just the headlines.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/stock-types";

interface NewsPanelProps {
  news: NewsItem[];
  symbol: string;
}

export function NewsPanel({ news, symbol }: NewsPanelProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Recent News</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Headlines about {symbol} — for information only, not investment signals.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {news.map((item) => {
            const Wrapper = item.url ? "a" : "div";
            const linkProps = item.url
              ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper
                key={item.id}
                {...linkProps}
                className="group flex items-start gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-smooth cursor-pointer"
              >
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {item.category && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                        {item.category}
                      </span>
                    )}
                    <span>{item.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
