/**
 * stock-types.ts
 * 
 * TypeScript type definitions for all stock data used in the app.
 * These types define the "shape" of data flowing through the app —
 * from the data service, through API routes, to the frontend.
 */

/** Basic info shown on search results and screener lists */
export interface StockSummary {
  symbol: string;         // NSE ticker symbol (e.g., "RELIANCE")
  name: string;           // Full company name
  sector: string;         // Business sector
  industry: string;       // Specific industry
  price: number;          // Current market price (₹)
  change: number;         // Price change (₹)
  changePercent: number;  // Price change (%)
  marketCap: number;      // Market capitalization in ₹ crores
}

/** Full stock detail — everything shown on the stock page */
export interface SectorComparisonRow {
  label: string;        // e.g. "P/E", "ROE"
  company: number;      // company's value
  sector: number;       // sector average
  unit?: string;        // e.g. "%" for ratios shown as percentages
  higherIsBetter?: boolean; // for neutral framing only (not advice)
}

export interface StockDetail extends StockSummary {
  high52w: number;        // 52-week high price
  low52w: number;         // 52-week low price
  volume: number;         // Average daily trading volume
  fundamentals: Fundamentals;
  priceHistory: PricePoint[];   // Historical prices for the chart
  news: NewsItem[];             // Recent news headlines
  qualityFactors: QualityFactor[];  // Neutral factor breakdown
  sectorComparison?: SectorComparisonRow[]; // company vs sector (from Upstox)
}

/** Key fundamental metrics — each has an explanation for beginners */
export interface Fundamentals {
  revenue: number | null;  // Annual revenue in ₹ crores (null = not available)
  profit: number | null;   // Annual net profit in ₹ crores (null = not available)
  incomePeriod?: string | null; // fiscal year of revenue/profit, e.g. "FY26"
  pe: number;             // Price-to-Earnings ratio
  debtToEquity: number;   // Debt-to-Equity ratio
  roe: number;            // Return on Equity (%)
  dividendYield: number;  // Dividend yield (%)
  eps: number;            // Earnings per share (₹)
  bookValue: number;      // Book value per share (₹)
}

/** A single data point for the price chart */
export interface PricePoint {
  date: string;   // Date string like "2025-01-15"
  price: number;  // Closing price on that date
  open?: number;  // Opening price (for candlestick charts)
  high?: number;  // Highest price that day (for candlesticks)
  low?: number;   // Lowest price that day (for candlesticks)
}

/** A news headline with source */
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;    // Date string
  summary: string; // One-line summary
  url?: string;     // Link to the original article
  category?: string; // Neutral topic tag (Earnings, Regulatory, etc.) — not sentiment
}

/** A neutral quality factor — NEVER a recommendation */
export interface QualityFactor {
  name: string;         // e.g., "Debt Level"
  value: string;        // e.g., "Low"
  description: string;  // Beginner-friendly explanation
  color: "green" | "yellow" | "red";  // Visual indicator only
}

/** Screener preset filter definition */
export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;  // Beginner-friendly description of what this filter looks for
  icon: string;         // Icon name from Lucide
  filter: StockFilter;
}

/** Filter criteria for screening stocks */
export interface StockFilter {
  minMarketCap?: number;       // Minimum market cap in ₹ crores
  maxDebtToEquity?: number;    // Maximum debt-to-equity ratio
  minRevenueGrowth?: number;   // Minimum revenue growth hint (%)
  minRoe?: number;             // Minimum ROE (%)
  minProfit?: number;          // Minimum profit in ₹ crores
  maxPe?: number;              // Maximum P/E ratio
  sectors?: string[];          // Restrict to these sectors
}

/** Explanation text for tooltips and "What does this mean?" panels */
export interface MetricExplanation {
  term: string;
  shortExplanation: string;   // One-sentence for tooltips
  longExplanation: string;    // Longer paragraph for the panel
}
