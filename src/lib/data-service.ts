/**
 * data-service.ts
 * 
 * THE SINGLE DATA ACCESS MODULE for the entire app.
 * 
 * All UI components and API routes MUST call functions from this file —
 * they must NEVER touch raw stock data directly.
 * 
 * GOAL: Later, you can swap the mock implementation for a real NSE data source
 * by editing ONLY this file. Everything else stays the same.
 * 
 * Current implementation: Mock data for 10 well-known NSE stocks.
 */

import {
  StockSummary,
  StockDetail,
  Fundamentals,
  PricePoint,
  NewsItem,
  QualityFactor,
  ScreenerPreset,
  StockFilter,
  MetricExplanation,
  SectorComparisonRow,
} from "./stock-types";
import { getInstrument, fetchUpstoxIncome, fetchUpstoxRatios, fetchUpstoxCandles } from "./upstox";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** A row from the pre-built screener dataset (screener-data.json). */
interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  netProfit: number | null;
  revenue: number | null;
  pe: number | null;
  roe: number | null;
  revenueGrowth: number | null;
}

let screenerData: ScreenerStock[] | null = null;

/** Load (and cache) the pre-built accurate screener dataset. */
function loadScreenerData(): ScreenerStock[] {
  if (screenerData) return screenerData;
  try {
    screenerData = JSON.parse(
      readFileSync(join(process.cwd(), "screener-data.json"), "utf-8")
    ) as ScreenerStock[];
  } catch {
    screenerData = [];
  }
  return screenerData;
}

/** Overlay accurate fundamentals from Upstox onto a fundamentals object
 *  (mutates it): consolidated net profit + revenue from the income statement,
 *  P/E + ROE from key ratios, and EPS + book value derived from price (EPS =
 *  price/PE, book value = price/PB). Returns the real revenue-growth fraction
 *  if available, to feed the quality factors. Falls back silently per-field. */
async function overlayUpstoxFundamentals(
  symbol: string,
  f: Fundamentals,
  price: number
): Promise<{ growth?: number; sectorComparison?: SectorComparisonRow[] }> {
  const inst = getInstrument(symbol);
  if (!inst) return {};

  const [inc, ratios] = await Promise.all([
    fetchUpstoxIncome(inst.isin),
    fetchUpstoxRatios(inst.isin),
  ]);

  let growth: number | undefined;
  if (inc) {
    if (inc.stale) {
      // Only old data exists for this stock — show "not available" honestly.
      f.revenue = null;
      f.profit = null;
    } else {
      if (typeof inc.netProfitCr === "number") f.profit = inc.netProfitCr;
      if (typeof inc.revenueCr === "number") f.revenue = inc.revenueCr;
      growth = inc.revenueGrowthFraction;
      // Label the fiscal year, e.g. "Mar 2026" -> "FY26", for display.
      const m = inc.period?.match(/(\d{4})/);
      f.incomePeriod = m ? `FY${m[1].slice(-2)}` : inc.period ?? null;
    }
  }

  let sectorComparison: SectorComparisonRow[] | undefined;
  if (ratios) {
    if (typeof ratios.pe === "number") f.pe = ratios.pe;
    if (typeof ratios.roe === "number") f.roe = ratios.roe;
    if (price > 0 && typeof ratios.pe === "number" && ratios.pe > 0) {
      f.eps = Math.round((price / ratios.pe) * 100) / 100;
    }
    if (price > 0 && typeof ratios.pb === "number" && ratios.pb > 0) {
      f.bookValue = Math.round((price / ratios.pb) * 100) / 100;
    }

    // Build company-vs-sector rows for the beginner-friendly comparison.
    const s = ratios.sector ?? {};
    const rows: SectorComparisonRow[] = [];
    const add = (
      label: string,
      company?: number,
      sector?: number,
      unit?: string,
      higherIsBetter?: boolean
    ) => {
      if (typeof company === "number" && typeof sector === "number") {
        rows.push({ label, company, sector, unit, higherIsBetter });
      }
    };
    add("P/E", ratios.pe, s.pe);
    add("P/B", ratios.pb, s.pb);
    add("ROE", ratios.roe, s.roe, "%", true);
    add("ROCE", ratios.roce, s.roce, "%", true);
    add("EV/EBITDA", ratios.evEbitda, s.evEbitda);
    if (rows.length > 0) sectorComparison = rows;
  }

  return { growth, sectorComparison };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DATA (Yahoo Finance, via the yahoo-finance2 package)
//
// We keep each stock's curated details (name, sector, fundamentals, quality
// notes, news) stable and accurate, and overlay LIVE market values on top:
// price, day change, market cap, 52-week range, volume, and the price chart.
//
// Why this split? Free sources are reliable for prices but only approximate for
// fundamentals — so we trust them for what they're good at and keep the rest
// curated. If a live fetch ever fails, we simply fall back to the curated value,
// so the app never breaks.
//
// One-time setup in your project folder:  npm install yahoo-finance2
// ─────────────────────────────────────────────────────────────────────────────

import YahooFinance from "yahoo-finance2";

// yahoo-finance2 v3+ requires creating an instance before use.
const yahooFinance = new YahooFinance();

// Quiet the library's first-run informational notices (harmless if unsupported).
try {
  yahooFinance.suppressNotices(["yahooSurvey"]);
} catch {
  /* older/newer versions may not have this method; safe to ignore */
}

/** NSE stocks on Yahoo Finance use a ".NS" suffix, e.g. RELIANCE -> RELIANCE.NS */
function toYahooSymbol(symbol: string): string {
  return symbol.includes(".") ? symbol : `${symbol}.NS`;
}

/** Reduce a full curated stock down to its summary fields. */
function toSummary(s: StockDetail): StockSummary {
  return {
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    industry: s.industry,
    price: s.price,
    change: s.change,
    changePercent: s.changePercent,
    marketCap: s.marketCap,
  };
}

/** Fetch live quotes for many symbols at once. Returns a map keyed by app symbol. */
async function fetchLiveQuotes(
  symbols: string[]
): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  if (symbols.length === 0) return out;
  try {
    const results = await yahooFinance.quote(
      symbols.map(toYahooSymbol),
      {},
      { validateResult: false }
    );
    const list = Array.isArray(results) ? results : [results];
    for (const r of list) {
      const appSymbol = String(r.symbol || "").replace(/\.NS$/i, "");
      out[appSymbol] = r as unknown as Record<string, number>;
    }
  } catch {
    /* live fetch failed -> caller falls back to curated data */
  }
  return out;
}

/** Overlay live market values onto a curated summary (falls back if no quote). */
function applyLiveToSummary(
  base: StockSummary,
  q?: Record<string, number>
): StockSummary {
  if (!q) return base;
  return {
    ...base,
    price:
      typeof q.regularMarketPrice === "number" ? q.regularMarketPrice : base.price,
    change:
      typeof q.regularMarketChange === "number" ? q.regularMarketChange : base.change,
    changePercent:
      typeof q.regularMarketChangePercent === "number"
        ? q.regularMarketChangePercent
        : base.changePercent,
    // Yahoo gives market cap in rupees; the app stores it in crores (1 crore = 1e7).
    marketCap:
      typeof q.marketCap === "number" ? Math.round(q.marketCap / 1e7) : base.marketCap,
  };
}

/** Fetch ~6 months of daily closing prices for the chart. Returns null on failure. */
async function fetchPriceHistory(symbol: string): Promise<PricePoint[] | null> {
  try {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const result = await yahooFinance.chart(
      toYahooSymbol(symbol),
      { period1: start, period2: end, interval: "1d" },
      { validateResult: false }
    );
    const rows = result?.quotes ?? [];
    const points: PricePoint[] = [];
    for (const row of rows) {
      if (row?.date && typeof row.close === "number") {
        points.push({
          date: new Date(row.date).toISOString().split("T")[0],
          price: Math.round(row.close * 100) / 100,
          open: typeof row.open === "number" ? Math.round(row.open * 100) / 100 : undefined,
          high: typeof row.high === "number" ? Math.round(row.high * 100) / 100 : undefined,
          low: typeof row.low === "number" ? Math.round(row.low * 100) / 100 : undefined,
        });
      }
    }
    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — Realistic numbers for 10 well-known NSE stocks
// All financial figures are approximate and for educational purposes only.
// ─────────────────────────────────────────────────────────────────────────────

// Curated base data per supported stock. Live market values are overlaid at request time.
const curatedStocks: StockDetail[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    sector: "Energy",
    industry: "Oil & Gas Refining",
    price: 1432.50,
    change: 18.75,
    changePercent: 1.32,
    marketCap: 1935000,
    high52w: 1602.00,
    low52w: 1220.00,
    volume: 8500000,
    fundamentals: {
      revenue: 930000,
      profit: 79500,
      pe: 24.3,
      debtToEquity: 0.42,
      roe: 12.5,
      dividendYield: 0.35,
      eps: 58.95,
      bookValue: 470.60,
    },
    priceHistory: generatePriceHistory(1432.50, "2024-09-01", "2025-03-01"),
    news: [
      { id: "r1", title: "Reliance Jio adds 8.5 million subscribers in January", source: "Economic Times", date: "2025-02-15", summary: "Jio continues to gain market share in India's telecom sector." },
      { id: "r2", title: "Reliance Retail expands to 500 new stores", source: "Moneycontrol", date: "2025-02-10", summary: "Retail arm accelerates expansion across tier-2 and tier-3 cities." },
      { id: "r3", title: "RIL Q3 results: Profit rises 10% year-on-year", source: "NDTV Profit", date: "2025-01-20", summary: "Strong performance across oil-to-chemicals and digital services." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Moderate", description: "Debt-to-equity of 0.42 means the company has some debt but isn't heavily burdened by it. Most large companies carry some debt.", color: "yellow" },
      { name: "Growth", value: "Strong", description: "Revenue has been growing steadily due to expansion in retail and digital services, not just oil and gas.", color: "green" },
      { name: "Profitability", value: "Good", description: "A return on equity (ROE) of 12.5% means the company generates decent profit from shareholder money.", color: "green" },
      { name: "Consistency", value: "Established", description: "Reliance is one of India's largest companies with a decades-long track record across multiple sectors.", color: "green" },
    ],
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    price: 3845.20,
    change: -22.30,
    changePercent: -0.58,
    marketCap: 1400000,
    high52w: 4256.00,
    low52w: 3380.00,
    volume: 3200000,
    fundamentals: {
      revenue: 245000,
      profit: 46500,
      pe: 30.1,
      debtToEquity: 0.04,
      roe: 48.2,
      dividendYield: 1.25,
      eps: 127.70,
      bookValue: 264.80,
    },
    priceHistory: generatePriceHistory(3845.20, "2024-09-01", "2025-03-01"),
    news: [
      { id: "t1", title: "TCS wins $1.5 billion deal from UK-based financial firm", source: "LiveMint", date: "2025-02-12", summary: "Multi-year deal strengthens TCS's presence in the European market." },
      { id: "t2", title: "TCS Q3 results: Revenue grows 6.2% in constant currency", source: "Business Standard", date: "2025-01-15", summary: "IT bellwether reports steady growth despite global headwinds." },
      { id: "t3", title: "TCS launches AI-powered platform for banking sector", source: "Hindu Business Line", date: "2025-01-08", summary: "New platform aims to help banks automate compliance and risk management." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Very Low", description: "Debt-to-equity of just 0.04 means TCS barely uses debt. This is a sign of strong financial discipline.", color: "green" },
      { name: "Growth", value: "Steady", description: "TCS grows at a moderate pace — not explosive, but consistent year after year.", color: "green" },
      { name: "Profitability", value: "Excellent", description: "An ROE of 48.2% is exceptional. TCS generates very high profit relative to shareholder equity.", color: "green" },
      { name: "Consistency", value: "Very High", description: "One of India's most consistent companies with decades of dividend payments and steady performance.", color: "green" },
    ],
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    price: 1876.80,
    change: 12.40,
    changePercent: 0.67,
    marketCap: 780000,
    high52w: 2050.00,
    low52w: 1640.00,
    volume: 5600000,
    fundamentals: {
      revenue: 168000,
      profit: 27200,
      pe: 28.6,
      debtToEquity: 0.06,
      roe: 32.8,
      dividendYield: 2.15,
      eps: 65.60,
      bookValue: 200.00,
    },
    priceHistory: generatePriceHistory(1876.80, "2024-09-01", "2025-03-01"),
    news: [
      { id: "i1", title: "Infosys raises FY25 revenue guidance to 4-5%", source: "Economic Times", date: "2025-02-08", summary: "Strong deal pipeline gives company confidence in higher growth trajectory." },
      { id: "i2", title: "Infosys expands partnership with Microsoft for AI solutions", source: "Moneycontrol", date: "2025-01-25", summary: "Partnership aims to bring generative AI tools to enterprise customers." },
      { id: "i3", title: "Infosys Q3 profit up 5% year-on-year", source: "NDTV Profit", date: "2025-01-12", summary: "IT major reports healthy margins aided by operational efficiency." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Very Low", description: "Debt-to-equity of 0.06 means Infosys has minimal debt — a strong sign of financial stability.", color: "green" },
      { name: "Growth", value: "Moderate", description: "Infosys grows steadily in the 3-5% range, typical for a mature IT services company.", color: "yellow" },
      { name: "Profitability", value: "Very Good", description: "ROE of 32.8% means Infosys efficiently converts shareholder money into profit.", color: "green" },
      { name: "Consistency", value: "High", description: "Infosys has a long track record of consistent performance and dividend payments.", color: "green" },
    ],
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    sector: "Financial Services",
    industry: "Banking",
    price: 1748.30,
    change: -8.50,
    changePercent: -0.48,
    marketCap: 1330000,
    high52w: 1795.00,
    low52w: 1420.00,
    volume: 7100000,
    fundamentals: {
      revenue: 285000,
      profit: 52000,
      pe: 20.8,
      debtToEquity: 0.0,
      roe: 16.4,
      dividendYield: 1.10,
      eps: 84.10,
      bookValue: 512.30,
    },
    priceHistory: generatePriceHistory(1748.30, "2024-09-01", "2025-03-01"),
    news: [
      { id: "h1", title: "HDFC Bank loan book grows 15% year-on-year", source: "Business Standard", date: "2025-02-18", summary: "Retail loans drive growth as bank maintains asset quality." },
      { id: "h2", title: "HDFC Bank Q3 results: Net profit rises 8%", source: "Economic Times", date: "2025-01-18", summary: "NII growth strong; asset quality remains stable despite merger integration." },
      { id: "h3", title: "HDFC Bank crosses 9,000 branches nationwide", source: "LiveMint", date: "2025-01-05", summary: "Expanded branch network supports deposit mobilization strategy." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "N/A (Bank)", description: "Banks work differently — they use deposits (not debt) to lend. So debt-to-equity doesn't apply the same way.", color: "green" },
      { name: "Growth", value: "Strong", description: "Consistently grows loans and deposits at 12-15% per year, which is excellent for a bank this size.", color: "green" },
      { name: "Profitability", value: "Good", description: "ROE of 16.4% is solid for a large bank. HDFC Bank is known for efficient operations.", color: "green" },
      { name: "Consistency", value: "Very High", description: "Widely considered India's best-run bank with decades of consistent performance.", color: "green" },
    ],
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    sector: "Financial Services",
    industry: "Banking",
    price: 1298.60,
    change: 15.20,
    changePercent: 1.19,
    marketCap: 910000,
    high52w: 1358.00,
    low52w: 1045.00,
    volume: 9200000,
    fundamentals: {
      revenue: 215000,
      profit: 40500,
      pe: 18.5,
      debtToEquity: 0.0,
      roe: 18.1,
      dividendYield: 0.80,
      eps: 70.20,
      bookValue: 387.50,
    },
    priceHistory: generatePriceHistory(1298.60, "2024-09-01", "2025-03-01"),
    news: [
      { id: "ic1", title: "ICICI Bank Q3 profit surges 14% year-on-year", source: "Moneycontrol", date: "2025-01-22", summary: "Strong loan growth and improved asset quality drive earnings beat." },
      { id: "ic2", title: "ICICI Bank digital transactions cross 90% of total", source: "Economic Times", date: "2025-01-10", summary: "Bank leads digital transformation among Indian private lenders." },
      { id: "ic3", title: "ICICI Prudential AMC assets under management hit record", source: "Business Standard", date: "2024-12-28", summary: "Wealth management arm benefits from growing retail investor base." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "N/A (Bank)", description: "Like all banks, ICICI Bank uses deposits to fund lending — not traditional debt.", color: "green" },
      { name: "Growth", value: "Strong", description: "Growing loan book and deposits at a healthy pace, with improving asset quality.", color: "green" },
      { name: "Profitability", value: "Very Good", description: "ROE of 18.1% is impressive for a large bank and shows efficient use of capital.", color: "green" },
      { name: "Consistency", value: "Good", description: "Has improved significantly over the last 5 years after some past challenges.", color: "yellow" },
    ],
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    price: 285.40,
    change: -3.10,
    changePercent: -1.07,
    marketCap: 298000,
    high52w: 335.00,
    low52w: 245.00,
    volume: 4100000,
    fundamentals: {
      revenue: 90000,
      profit: 13000,
      pe: 22.9,
      debtToEquity: 0.08,
      roe: 14.6,
      dividendYield: 0.20,
      eps: 12.45,
      bookValue: 85.30,
    },
    priceHistory: generatePriceHistory(285.40, "2024-09-01", "2025-03-01"),
    news: [
      { id: "w1", title: "Wipro wins multi-year cloud transformation deal", source: "LiveMint", date: "2025-02-05", summary: "Deal with a European auto manufacturer to modernize IT infrastructure." },
      { id: "w2", title: "Wipro Q3 revenue dips 1% in constant currency", source: "Economic Times", date: "2025-01-14", summary: "IT firm faces headwinds from slowing demand in consulting arm." },
      { id: "w3", title: "Wipro accelerates AI skilling for 50,000 employees", source: "Hindu Business Line", date: "2024-12-20", summary: "Upskilling initiative aims to prepare workforce for generative AI projects." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Very Low", description: "Debt-to-equity of 0.08 means Wipro has minimal debt — financially sound.", color: "green" },
      { name: "Growth", value: "Slow", description: "Wipro has been growing slower than peers like TCS and Infosys in recent years.", color: "red" },
      { name: "Profitability", value: "Moderate", description: "ROE of 14.6% is okay but lower than top-tier IT companies.", color: "yellow" },
      { name: "Consistency", value: "Mixed", description: "Has had periods of strong and weak performance — less consistent than TCS/Infosys.", color: "yellow" },
    ],
  },
  {
    symbol: "ITC",
    name: "ITC Ltd",
    sector: "Consumer Goods",
    industry: "FMCG / Cigarettes / Hotels",
    price: 442.15,
    change: 3.25,
    changePercent: 0.74,
    marketCap: 554000,
    high52w: 498.00,
    low52w: 395.00,
    volume: 12500000,
    fundamentals: {
      revenue: 70000,
      profit: 20500,
      pe: 27.0,
      debtToEquity: 0.01,
      roe: 29.5,
      dividendYield: 2.85,
      eps: 16.37,
      bookValue: 55.50,
    },
    priceHistory: generatePriceHistory(442.15, "2024-09-01", "2025-03-01"),
    news: [
      { id: "it1", title: "ITC Hotels demerger completes; shares list separately", source: "Economic Times", date: "2025-02-20", summary: "Hotels business now trades as independent entity on NSE." },
      { id: "it2", title: "ITC FMCG business crosses ₹20,000 crore revenue", source: "Business Standard", date: "2025-01-30", summary: "Non-cigarette FMCG portfolio shows strong momentum." },
      { id: "it3", title: "ITC Q3 results: Profit up 6% driven by FMCG and agri-business", source: "Moneycontrol", date: "2025-01-18", summary: "Diversified conglomerate shows resilience across business verticals." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Almost Zero", description: "Debt-to-equity of 0.01 — ITC is virtually debt-free, which is excellent.", color: "green" },
      { name: "Growth", value: "Moderate", description: "Growing steadily but not rapidly. The FMCG segment is the growth driver while cigarettes are stable.", color: "yellow" },
      { name: "Profitability", value: "Very Good", description: "ROE of 29.5% is excellent, showing ITC generates strong returns on shareholder capital.", color: "green" },
      { name: "Consistency", value: "High", description: "Known for consistent dividend payments and stable business for decades.", color: "green" },
    ],
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    sector: "Financial Services",
    industry: "Banking",
    price: 748.90,
    change: 9.85,
    changePercent: 1.33,
    marketCap: 668000,
    high52w: 912.00,
    low52w: 620.00,
    volume: 11200000,
    fundamentals: {
      revenue: 355000,
      profit: 61000,
      pe: 10.9,
      debtToEquity: 0.0,
      roe: 18.9,
      dividendYield: 1.55,
      eps: 68.70,
      bookValue: 363.20,
    },
    priceHistory: generatePriceHistory(748.90, "2024-09-01", "2025-03-01"),
    news: [
      { id: "s1", title: "SBI Q3 profit rises 12% as asset quality improves", source: "Economic Times", date: "2025-02-08", summary: "India's largest bank benefits from falling NPAs and strong loan growth." },
      { id: "s2", title: "SBI cuts home loan rates to 8.4% for new borrowers", source: "Moneycontrol", date: "2025-01-28", summary: "Rate cut aims to boost retail loan growth ahead of fiscal year end." },
      { id: "s3", title: "SBI YONO app crosses 10 crore downloads", source: "Hindu Business Line", date: "2025-01-15", summary: "Digital banking platform sees rapid adoption across urban and rural India." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "N/A (Bank)", description: "As a bank, SBI uses deposits to fund lending rather than traditional debt.", color: "green" },
      { name: "Growth", value: "Strong", description: "Loan book growing at a healthy pace with improving asset quality.", color: "green" },
      { name: "Profitability", value: "Good", description: "ROE of 18.9% is strong for India's largest bank, showing improving efficiency.", color: "green" },
      { name: "Consistency", value: "Improving", description: "Historically had asset quality issues but has improved significantly in recent years.", color: "yellow" },
    ],
  },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd",
    sector: "Telecom",
    industry: "Telecom Services",
    price: 1625.40,
    change: 28.60,
    changePercent: 1.79,
    marketCap: 975000,
    high52w: 1778.00,
    low52w: 1250.00,
    volume: 5400000,
    fundamentals: {
      revenue: 149000,
      profit: 18500,
      pe: 52.7,
      debtToEquity: 1.45,
      roe: 14.2,
      dividendYield: 0.30,
      eps: 30.85,
      bookValue: 217.00,
    },
    priceHistory: generatePriceHistory(1625.40, "2024-09-01", "2025-03-01"),
    news: [
      { id: "b1", title: "Airtel adds highest number of 4G subscribers in Q3", source: "Economic Times", date: "2025-02-14", summary: "Gains market share as Vodafone Idea struggles to invest in network." },
      { id: "b2", title: "Airtel 5G covers 5,000 towns across India", source: "LiveMint", date: "2025-01-30", summary: "Rapid 5G rollout positions Airtel well for next-gen services." },
      { id: "b3", title: "Airtel Africa business stabilizes after currency headwinds", source: "Business Standard", date: "2025-01-12", summary: "African operations show recovery as local currencies strengthen." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "High", description: "Debt-to-equity of 1.45 means Airtel has significant debt from spectrum purchases and 5G rollout. This needs monitoring.", color: "red" },
      { name: "Growth", value: "Strong", description: "ARPU (average revenue per user) rising steadily, and subscriber base is growing.", color: "green" },
      { name: "Profitability", value: "Moderate", description: "ROE of 14.2% is decent but the high debt means a portion of profit goes to interest payments.", color: "yellow" },
      { name: "Consistency", value: "Improving", description: "Telecom is a tough business, but Airtel has been gaining ground against competitors.", color: "yellow" },
    ],
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro Ltd",
    sector: "Industrials",
    industry: "Engineering & Construction",
    price: 3518.70,
    change: 42.30,
    changePercent: 1.22,
    marketCap: 484000,
    high52w: 3950.00,
    low52w: 2820.00,
    volume: 2800000,
    fundamentals: {
      revenue: 225000,
      profit: 14500,
      pe: 33.4,
      debtToEquity: 0.65,
      roe: 12.8,
      dividendYield: 0.85,
      eps: 105.30,
      bookValue: 822.40,
    },
    priceHistory: generatePriceHistory(3518.70, "2024-09-01", "2025-03-01"),
    news: [
      { id: "l1", title: "L&T wins ₹7,000 crore order from Middle East", source: "Economic Times", date: "2025-02-20", summary: "Hydrocarbon arm secures major offshore project in the Gulf region." },
      { id: "l2", title: "L&T order book crosses ₹5 lakh crore for first time", source: "Moneycontrol", date: "2025-01-25", summary: "Record order pipeline driven by government infrastructure push." },
      { id: "l3", title: "L&T Q3 results: Revenue up 18% on strong execution", source: "Business Standard", date: "2025-01-18", summary: "Infrastructure giant benefits from India's building boom." },
    ],
    qualityFactors: [
      { name: "Debt Level", value: "Moderate", description: "Debt-to-equity of 0.65 is manageable for a capital-intensive business like construction, but higher than IT companies.", color: "yellow" },
      { name: "Growth", value: "Very Strong", description: "India's infrastructure boom is driving massive order growth for L&T.", color: "green" },
      { name: "Profitability", value: "Moderate", description: "ROE of 12.8% is typical for the construction industry, which has lower margins than IT or banking.", color: "yellow" },
      { name: "Consistency", value: "High", description: "India's largest engineering company with a strong track record of executing complex projects.", color: "green" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCREENER PRESETS — Beginner-friendly filter combinations
// ─────────────────────────────────────────────────────────────────────────────

const screenerPresets: ScreenerPreset[] = [
  {
    id: "high-roe",
    name: "Highly Profitable",
    description:
      "Companies that turn shareholders' money into strong profit (high ROE). A sign of an efficient business — though high ROE alone isn't a reason to invest.",
    icon: "Gem",
    filter: {
      minRoe: 18,
    },
  },
  {
    id: "value",
    name: "Reasonably Valued",
    description:
      "Trading at a modest price relative to earnings (lower P/E). May be fairly priced — or the market may have concerns worth understanding first.",
    icon: "Tag",
    filter: {
      maxPe: 18,
    },
  },
  {
    id: "steady-growers",
    name: "Steady Growers",
    description:
      "Healthy profitability alongside growing revenue. Companies building steadily rather than standing still.",
    icon: "Sprout",
    filter: {
      minRoe: 12,
      minRevenueGrowth: 10,
    },
  },
  {
    id: "big-earners",
    name: "Big Earners",
    description:
      "India's largest profit-makers by absolute net profit. Big, established businesses — size brings some stability, but never a guarantee.",
    icon: "Landmark",
    filter: {
      minProfit: 20000,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// METRIC EXPLANATIONS — For tooltips and "What does this mean?" panel
// ─────────────────────────────────────────────────────────────────────────────

const metricExplanations: MetricExplanation[] = [
  {
    term: "Market Cap",
    shortExplanation: "Total value of all company shares — think of it as the company's price tag.",
    longExplanation: "Market capitalization is the total market value of a company's shares. It's calculated by multiplying the share price by the total number of shares. Large-cap (₹50,000+ cr) companies are typically more stable, while small-cap companies can be more volatile.",
  },
  {
    term: "P/E Ratio",
    shortExplanation: "How much you pay per ₹1 of company earnings — lower can mean cheaper, but not always.",
    longExplanation: "The Price-to-Earnings ratio tells you how much investors are willing to pay for each rupee of the company's earnings. A P/E of 20 means investors pay ₹20 for every ₹1 of earnings. Lower P/E might mean the stock is undervalued, or it might mean the market expects slower growth. Always compare P/E within the same industry.",
  },
  {
    term: "Revenue",
    shortExplanation: "Total money the company earned from its business — before expenses.",
    longExplanation: "Revenue (also called turnover or top line) is the total amount of money a company brings in from selling its products or services. It's the starting point before deducting any costs. Growing revenue usually means the business is expanding, but profit matters too — a company can have high revenue and still lose money.",
  },
  {
    term: "Net Profit",
    shortExplanation: "Money left after paying all expenses — the company's actual earnings.",
    longExplanation: "Net profit (also called bottom line) is what remains after a company pays all its costs — raw materials, salaries, taxes, interest, everything. It's the real earnings. Consistent and growing profit is generally a positive sign. Losses aren't always bad (startups often lose money while growing), but for established companies, profit is key.",
  },
  {
    term: "Debt-to-Equity",
    shortExplanation: "How much the company owes vs. what it owns — lower is generally safer.",
    longExplanation: "The debt-to-equity ratio compares a company's total debt to its shareholders' equity (what the owners have invested). A ratio of 0.5 means the company has ₹0.50 of debt for every ₹1 of equity. Lower ratios suggest less financial risk. However, some industries (like telecom) naturally carry more debt, so always compare within the same sector.",
  },
  {
    term: "ROE",
    shortExplanation: "How efficiently the company turns shareholder money into profit — higher is better.",
    longExplanation: "Return on Equity measures how much profit a company generates with the money shareholders have invested. An ROE of 20% means the company generates ₹20 of profit for every ₹100 of shareholder equity. Consistently high ROE (15%+) usually indicates a strong business model and efficient management.",
  },
  {
    term: "Dividend Yield",
    shortExplanation: "Annual cash payout per share as a percentage of the share price.",
    longExplanation: "Dividend yield tells you how much cash a company pays out annually relative to its share price. A 2% yield on a ₹1,000 stock means ₹20 per share per year. Not all companies pay dividends — fast-growing companies often reinvest profits instead. Dividends provide regular income but aren't guaranteed and can change.",
  },
  {
    term: "EPS",
    shortExplanation: "Profit divided by number of shares — how much each share earned.",
    longExplanation: "Earnings Per Share is the company's net profit divided by the total number of shares. It tells you how much profit is attributable to each share you own. Rising EPS over time is generally a positive sign. However, EPS alone doesn't tell the full story — always look at it alongside revenue and profit trends.",
  },
  {
    term: "Book Value",
    shortExplanation: "What the company's assets are worth on paper, per share.",
    longExplanation: "Book value per share is the company's total assets minus total liabilities, divided by shares outstanding. It represents what each share would theoretically be worth if the company were liquidated. A stock price much higher than book value suggests the market expects strong future earnings. A price below book value might indicate the stock is undervalued — or that the market sees trouble ahead.",
  },
  {
    term: "52-Week High/Low",
    shortExplanation: "The highest and lowest prices in the past year — shows the price range.",
    longExplanation: "The 52-week high and low show the trading range of the stock over the past year. A price near the 52-week high might indicate strong recent performance, while a price near the low might suggest recent weakness. However, past prices don't predict future performance — these ranges are for context only.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate realistic-looking price history
// ─────────────────────────────────────────────────────────────────────────────

function generatePriceHistory(
  currentPrice: number,
  startDate: string,
  endDate: string
): PricePoint[] {
  const points: PricePoint[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  let price = currentPrice * (0.82 + Math.random() * 0.08); // Start 82-90% of current

  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // Random walk with slight upward bias (closing price only — we do NOT
    // fabricate open/high/low, since candles must reflect real market data).
    const change = (Math.random() - 0.48) * currentPrice * 0.02;
    price = Math.max(price + change, currentPrice * 0.7);
    price = Math.min(price, currentPrice * 1.15);

    points.push({
      date: d.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }

  // Ensure the last point matches the current price
  if (points.length > 0) {
    points[points.length - 1].price = currentPrice;
  }

  return points;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE FUNDAMENTALS, NEWS, AND QUALITY FACTORS
// Fundamentals from Yahoo are REAL but approximate (different providers compute
// some ratios differently). We overlay what we get and fall back otherwise.
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Pull approximate-but-real fundamentals from Yahoo. */
async function fetchFundamentals(
  symbol: string
): Promise<{ values: Partial<Fundamentals>; revenueGrowth?: number } | null> {
  try {
    const s: Record<string, Record<string, number>> =
      (await yahooFinance.quoteSummary(
        toYahooSymbol(symbol),
        { modules: ["summaryDetail", "financialData", "defaultKeyStatistics"] },
        { validateResult: false }
      )) as unknown as Record<string, Record<string, number>>;

    const sd = s.summaryDetail ?? {};
    const fd = s.financialData ?? {};
    const ks = s.defaultKeyStatistics ?? {};
    const values: Partial<Fundamentals> = {};

    if (typeof fd.totalRevenue === "number") values.revenue = Math.round(fd.totalRevenue / 1e7);
    if (typeof ks.netIncomeToCommon === "number") values.profit = Math.round(ks.netIncomeToCommon / 1e7);
    if (typeof sd.trailingPE === "number") values.pe = r1(sd.trailingPE);
    if (typeof fd.debtToEquity === "number") values.debtToEquity = r2(fd.debtToEquity / 100);
    if (typeof fd.returnOnEquity === "number") values.roe = r1(fd.returnOnEquity * 100);
    if (typeof sd.dividendYield === "number") values.dividendYield = r2(sd.dividendYield * 100);
    if (typeof ks.trailingEps === "number") values.eps = r2(ks.trailingEps);
    if (typeof ks.bookValue === "number") values.bookValue = r2(ks.bookValue);

    const revenueGrowth =
      typeof fd.revenueGrowth === "number" ? fd.revenueGrowth : undefined;
    return { values, revenueGrowth };
  } catch {
    return null;
  }
}

/** Pull recent news headlines from Yahoo. */
/** Assign a NEUTRAL topic tag from the headline (not sentiment). Returns
 *  undefined when uncertain — better no tag than a misleading one. */
function categorizeNews(title: string): string | undefined {
  const t = title.toLowerCase();
  if (/(q[1-4]\b|quarter|earnings|net profit|revenue|results|ebitda|margin)/.test(t))
    return "Earnings";
  if (/(dividend|bonus issue|stock split|buyback)/.test(t)) return "Payout";
  if (/(sebi|regulat|court|lawsuit|fine|penalt|probe|tax|ban\b|approval|licen[cs]e|compliance)/.test(t))
    return "Regulatory";
  if (/(ceo|cfo|chairman|managing director|resign|appoint|steps down|board of)/.test(t))
    return "Management";
  if (/(acqui|merger|stake|buyout|partnership|joint venture|tie-?up|deal\b)/.test(t))
    return "Deal";
  if (/(launch|unveil|rollout|new product|new service|expansion|capacity)/.test(t))
    return "Product";
  if (/(rbi|inflation|gdp|rupee|crude|interest rate|economy|monsoon)/.test(t))
    return "Macro";
  return undefined;
}

async function fetchNews(symbol: string): Promise<NewsItem[] | null> {
  try {
    const res = (await yahooFinance.search(
      toYahooSymbol(symbol),
      { newsCount: 6, quotesCount: 0 },
      { validateResult: false }
    )) as unknown as { news?: Record<string, unknown>[] };

    const news = res?.news ?? [];
    const items: NewsItem[] = [];
    for (const n of news) {
      if (!n?.title) continue;
      let date = "";
      const t = n.providerPublishTime;
      if (t instanceof Date) date = t.toISOString().split("T")[0];
      else if (typeof t === "number")
        date = new Date(t < 1e12 ? t * 1000 : t).toISOString().split("T")[0];
      const title = String(n.title);
      const url = typeof n.link === "string" ? n.link : undefined;
      items.push({
        id: String(n.uuid || n.link || n.title),
        title,
        source: String(n.publisher || "News"),
        date,
        summary: n.publisher ? `Reported by ${String(n.publisher)}.` : "",
        url,
        category: categorizeNews(title),
      });
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/** Build neutral quality factors FROM the real numbers (descriptions, not advice). */
function buildQualityFactors(
  f: Fundamentals,
  sector: string,
  industry: string,
  marketCapCr: number,
  revenueGrowth?: number
): QualityFactor[] {
  const isBank = /bank/i.test(industry) || sector === "Financial Services";
  const factors: QualityFactor[] = [];

  // Debt level
  if (isBank) {
    factors.push({
      name: "Debt Level",
      value: "N/A (Bank)",
      description:
        "Banks fund lending with customer deposits, so the usual debt-to-equity measure doesn't apply the same way. For banks, look instead at bad-loan (NPA) levels.",
      color: "green",
    });
  } else {
    const dte = f.debtToEquity;
    factors.push({
      name: "Debt Level",
      value: dte < 0.3 ? "Low" : dte <= 1 ? "Moderate" : "High",
      description: `Debt-to-equity is ${dte.toFixed(
        2
      )}. As a rough guide, under 0.3 is low, up to 1 is moderate, and above 1 is high — though capital-heavy industries naturally carry more.`,
      color: dte < 0.3 ? "green" : dte <= 1 ? "yellow" : "red",
    });
  }

  // Profitability (ROE)
  const roe = f.roe;
  factors.push({
    name: "Profitability",
    value: roe >= 18 ? "Excellent" : roe >= 15 ? "Very Good" : roe >= 10 ? "Good" : "Modest",
    description: `Return on equity (ROE) is ${roe.toFixed(
      1
    )}%. Investors often treat 15%+ as strong — it shows how well the company turns shareholder money into profit.`,
    color: roe >= 15 ? "green" : roe >= 10 ? "yellow" : "red",
  });

  // Growth — only if we have a real figure
  if (typeof revenueGrowth === "number") {
    const g = revenueGrowth * 100;
    factors.push({
      name: "Growth",
      value: g >= 15 ? "Strong" : g >= 5 ? "Steady" : g >= 0 ? "Slow" : "Declining",
      description: `Revenue grew about ${g.toFixed(
        1
      )}% over the latest period. Steady, repeatable growth is generally healthier than a single big jump.`,
      color: g >= 15 ? "green" : g >= 0 ? "yellow" : "red",
    });
  }

  // Size / establishment (from market cap)
  factors.push({
    name: "Size",
    value: marketCapCr >= 100000 ? "Large-cap" : marketCapCr >= 20000 ? "Mid-cap" : "Small-cap",
    description:
      marketCapCr >= 100000
        ? "A large, well-established company. These tend to be more stable, though that's not a guarantee."
        : marketCapCr >= 20000
        ? "A mid-sized company — often a balance of growth potential and bigger ups-and-downs than large-caps."
        : "A smaller company. These can grow faster but are typically more volatile and riskier.",
    color: marketCapCr >= 100000 ? "green" : "yellow",
  });

  return factors;
}


// To swap in real NSE data later, replace the implementations below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a list of all stocks with summary info.
 * Used for initial display and general browsing.
 */
export async function getAllStocks(): Promise<StockSummary[]> {
  const bases = curatedStocks.map(toSummary);
  const quotes = await fetchLiveQuotes(bases.map((b) => b.symbol));
  return bases.map((b) => applyLiveToSummary(b, quotes[b.symbol]));
}

/**
 * Get full detail for a single stock by symbol.
 * Returns null if the symbol is not found.
 */
export async function getStock(symbol: string): Promise<StockDetail | null> {
  const base = curatedStocks.find(
    (s) => s.symbol.toLowerCase() === symbol.toLowerCase()
  );
  if (!base) return buildLiveStock(symbol);

  const merged: StockDetail = { ...base, fundamentals: { ...base.fundamentals } };

  // 1) Live market values (price, day change, market cap, 52w range, volume)
  const quotes = await fetchLiveQuotes([base.symbol]);
  const q = quotes[base.symbol];
  if (q) {
    if (typeof q.regularMarketPrice === "number") merged.price = q.regularMarketPrice;
    if (typeof q.regularMarketChange === "number") merged.change = q.regularMarketChange;
    if (typeof q.regularMarketChangePercent === "number")
      merged.changePercent = q.regularMarketChangePercent;
    if (typeof q.marketCap === "number") merged.marketCap = Math.round(q.marketCap / 1e7);
    if (typeof q.fiftyTwoWeekHigh === "number") merged.high52w = q.fiftyTwoWeekHigh;
    if (typeof q.fiftyTwoWeekLow === "number") merged.low52w = q.fiftyTwoWeekLow;
    if (typeof q.regularMarketVolume === "number") merged.volume = q.regularMarketVolume;
  }

  // 2) Price history — prefer Upstox daily candles, fall back to Yahoo
  const instForChart = getInstrument(base.symbol);
  let history: PricePoint[] | null = instForChart
    ? await fetchUpstoxCandles(instForChart.instrument_key)
    : null;
  if (!history || history.length === 0) {
    history = await fetchPriceHistory(base.symbol);
  }
  if (history && history.length > 0) merged.priceHistory = history;

  // 3) Live fundamentals (real but approximate) — overlay only what we receive
  const funda = await fetchFundamentals(base.symbol);
  let revenueGrowth: number | undefined;
  if (funda) {
    merged.fundamentals = { ...merged.fundamentals, ...funda.values };
    revenueGrowth = funda.revenueGrowth;
  }

  // 3b) Accurate consolidated net profit + revenue from Upstox (overrides the
  // approximate Yahoo figures, and gives a real revenue-growth number).
  const upstox = await overlayUpstoxFundamentals(base.symbol, merged.fundamentals, merged.price);
  if (typeof upstox.growth === "number") revenueGrowth = upstox.growth;
  if (upstox.sectorComparison) merged.sectorComparison = upstox.sectorComparison;

  // 4) Quality factors derived from the (now live) numbers
  merged.qualityFactors = buildQualityFactors(
    merged.fundamentals,
    merged.sector,
    merged.industry,
    merged.marketCap,
    revenueGrowth
  );

  // 5) Live news headlines (falls back to curated if Yahoo returns none)
  const news = await fetchNews(base.symbol);
  if (news && news.length > 0) merged.news = news;

  return merged;
}

/**
 * Search stocks by name or symbol.
 * Returns matching stock summaries.
 */
export async function searchStocks(query: string): Promise<StockSummary[]> {
  if (!query.trim()) return getAllStocks();

  const q = query.toLowerCase().trim();

  // 1) Curated matches first (these have nice metadata)
  const curatedMatches = curatedStocks
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q)
    )
    .map(toSummary);

  // 2) Live search across all NSE stocks via Yahoo
  let liveMatches: StockSummary[] = [];
  try {
    const res = (await yahooFinance.search(
      query,
      { quotesCount: 12, newsCount: 0 },
      { validateResult: false }
    )) as unknown as { quotes?: Record<string, unknown>[] };

    liveMatches = (res?.quotes ?? [])
      .filter(
        (r) =>
          typeof r.symbol === "string" &&
          /\.NS$/i.test(r.symbol as string) &&
          (r.quoteType === "EQUITY" || r.typeDisp === "Equity")
      )
      .map((r) => ({
        symbol: String(r.symbol).replace(/\.NS$/i, ""),
        name: String(r.shortname || r.longname || r.symbol),
        sector: typeof r.sector === "string" ? r.sector : "",
        industry: typeof r.industry === "string" ? r.industry : "",
        price: 0,
        change: 0,
        changePercent: 0,
        marketCap: 0,
      }));
  } catch {
    /* live search unavailable -> just return curated matches */
  }

  // 3) Merge, curated first, de-duplicated by symbol
  const seen = new Set(curatedMatches.map((m) => m.symbol.toUpperCase()));
  const merged = [...curatedMatches];
  for (const m of liveMatches) {
    if (!seen.has(m.symbol.toUpperCase())) {
      seen.add(m.symbol.toUpperCase());
      merged.push(m);
    }
  }

  // 4) Overlay live prices on the full merged list
  const quotes = await fetchLiveQuotes(merged.map((m) => m.symbol));
  return merged.map((m) => applyLiveToSummary(m, quotes[m.symbol]));
}

/** Build a full stock detail entirely from live data, for stocks that aren't
 *  in our curated list (so search can open ANY NSE stock). Returns null if the
 *  symbol doesn't resolve to a real, priced stock. */
async function buildLiveStock(symbol: string): Promise<StockDetail | null> {
  const quotes = await fetchLiveQuotes([symbol]);
  const q = quotes[symbol];
  if (!q || typeof q.regularMarketPrice !== "number") return null;

  const name = String(
    (q as Record<string, unknown>).longName ||
      (q as Record<string, unknown>).shortName ||
      symbol
  );

  // Sector / industry from the company profile
  let sector = "";
  let industry = "";
  try {
    const ap = (await yahooFinance.quoteSummary(
      toYahooSymbol(symbol),
      { modules: ["assetProfile"] },
      { validateResult: false }
    )) as unknown as { assetProfile?: { sector?: string; industry?: string } };
    sector = ap?.assetProfile?.sector ?? "";
    industry = ap?.assetProfile?.industry ?? "";
  } catch {
    /* profile unavailable */
  }

  const funda = await fetchFundamentals(symbol);
  const fundamentals: Fundamentals = {
    revenue: funda?.values.revenue ?? null,
    profit: funda?.values.profit ?? null,
    pe: funda?.values.pe ?? 0,
    debtToEquity: funda?.values.debtToEquity ?? 0,
    roe: funda?.values.roe ?? 0,
    dividendYield: funda?.values.dividendYield ?? 0,
    eps: funda?.values.eps ?? 0,
    bookValue: funda?.values.bookValue ?? 0,
  };

  const marketCap =
    typeof q.marketCap === "number" ? Math.round(q.marketCap / 1e7) : 0;

  // Price history — prefer Upstox daily candles, fall back to Yahoo
  const instForChart = getInstrument(symbol);
  let history: PricePoint[] | null = instForChart
    ? await fetchUpstoxCandles(instForChart.instrument_key)
    : null;
  if (!history || history.length === 0) {
    history = await fetchPriceHistory(symbol);
  }

  const news = await fetchNews(symbol);

  // Accurate consolidated net profit + revenue from Upstox (overrides Yahoo)
  const upstox = await overlayUpstoxFundamentals(symbol, fundamentals, q.regularMarketPrice);
  const growth = upstox.growth ?? funda?.revenueGrowth;

  return {
    symbol: symbol.toUpperCase(),
    name,
    sector: sector || "—",
    industry: industry || "—",
    price: q.regularMarketPrice,
    change: typeof q.regularMarketChange === "number" ? q.regularMarketChange : 0,
    changePercent:
      typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : 0,
    marketCap,
    high52w: typeof q.fiftyTwoWeekHigh === "number" ? q.fiftyTwoWeekHigh : 0,
    low52w: typeof q.fiftyTwoWeekLow === "number" ? q.fiftyTwoWeekLow : 0,
    volume: typeof q.regularMarketVolume === "number" ? q.regularMarketVolume : 0,
    fundamentals,
    priceHistory: history ?? [],
    news: news ?? [],
    qualityFactors: buildQualityFactors(
      fundamentals,
      sector,
      industry,
      marketCap,
      growth
    ),
    sectorComparison: upstox.sectorComparison,
  };
}

/** A curated set of liquid, well-known large-caps for the intraday "practice"
 *  section. Chosen for being heavily traded and easy to follow — they are
 *  study material for learning to read charts, NOT trade picks. */
const PRACTICE_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY",
  "SBIN", "TATASTEEL", "ITC", "AXISBANK", "BHARTIARTL",
];

export async function getPracticeStocks(): Promise<StockSummary[]> {
  const data = loadScreenerData();
  const byId = Object.fromEntries(data.map((d) => [d.symbol, d]));

  const summaries: StockSummary[] = PRACTICE_SYMBOLS.map((sym) => {
    const d = byId[sym];
    return {
      symbol: sym,
      name: d?.name || sym,
      sector: d?.sector || "—",
      industry: d?.sector || "—",
      price: 0,
      change: 0,
      changePercent: 0,
      marketCap: 0,
    };
  });

  const quotes = await fetchLiveQuotes(summaries.map((m) => m.symbol));
  return summaries.map((m) => applyLiveToSummary(m, quotes[m.symbol]));
}

/**
 * Get all available screener presets.
 */
export function getScreenerPresets(): ScreenerPreset[] {
  return screenerPresets;
}

/**
 * Screen stocks using a preset filter ID or a custom filter.
 * Returns matching stock summaries.
 */
export async function screenStocks(
  presetId?: string,
  customFilter?: StockFilter
): Promise<StockSummary[]> {
  let filter: StockFilter;

  if (presetId) {
    const preset = screenerPresets.find((p) => p.id === presetId);
    if (!preset) return [];
    filter = preset.filter;
  } else if (customFilter) {
    filter = customFilter;
  } else {
    return [];
  }

  // Screen across the pre-built accurate dataset (real Upstox fundamentals).
  const data = loadScreenerData();
  const matched = data.filter((s) => {
    if (filter.minRoe != null && (s.roe == null || s.roe < filter.minRoe)) return false;
    if (filter.maxPe != null && (s.pe == null || s.pe > filter.maxPe)) return false;
    if (filter.minProfit != null && (s.netProfit == null || s.netProfit < filter.minProfit))
      return false;
    if (
      filter.minRevenueGrowth != null &&
      (s.revenueGrowth == null || s.revenueGrowth < filter.minRevenueGrowth)
    )
      return false;
    if (filter.sectors && filter.sectors.length > 0 && !filter.sectors.includes(s.sector))
      return false;
    return true;
  });

  // Sort by the metric most relevant to the chosen preset.
  matched.sort((a, b) => {
    switch (presetId) {
      case "high-roe":
        return (b.roe ?? 0) - (a.roe ?? 0);
      case "value":
        return (a.pe ?? Infinity) - (b.pe ?? Infinity);
      case "steady-growers":
        return (b.revenueGrowth ?? 0) - (a.revenueGrowth ?? 0);
      default:
        return (b.netProfit ?? 0) - (a.netProfit ?? 0);
    }
  });

  // Build summaries, then overlay live price + market cap.
  const summaries: StockSummary[] = matched.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector || "—",
    industry: s.sector || "—",
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: 0,
  }));

  const quotes = await fetchLiveQuotes(summaries.map((m) => m.symbol));
  return summaries.map((m) => applyLiveToSummary(m, quotes[m.symbol]));
}

/**
 * Get the explanation for a specific metric by name.
 */
export function getMetricExplanation(term: string): MetricExplanation | undefined {
  return metricExplanations.find(
    (m) => m.term.toLowerCase() === term.toLowerCase()
  );
}

/**
 * Get all metric explanations (for the "What does this mean?" panel).
 */
export function getAllMetricExplanations(): MetricExplanation[] {
  return metricExplanations;
}
