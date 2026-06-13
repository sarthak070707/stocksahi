/**
 * page.tsx
 * 
 * The main (and only) page of StockSahi.
 * 
 * Two views managed via URL search params:
 *   1. Home view (default) — search + screener
 *   2. Stock detail view — when ?symbol=RELIANCE is in the URL
 * 
 * All state is derived from the URL, so bookmarking and back-button work.
 * 
 * Note: useSearchParams requires a Suspense boundary in Next.js App Router.
 */

import { Suspense } from "react";
import { HomePageContent } from "@/components/HomePageContent";

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}
