/**
 * explanations.ts
 * 
 * Central map of metric explanations for easy reuse across components.
 * Each metric has a short (for tooltips) and long (for panels) explanation.
 */

import type { MetricExplanation } from "./stock-types";

export const metricExplanationMap: Record<string, MetricExplanation> = {
  marketCap: {
    term: "Market Cap",
    shortExplanation: "Total value of all company shares — think of it as the company's price tag.",
    longExplanation: "Market capitalization is the total market value of a company's shares. It's calculated by multiplying the share price by the total number of shares. Large-cap (₹50,000+ cr) companies are typically more stable, while small-cap companies can be more volatile.",
  },
  pe: {
    term: "P/E Ratio",
    shortExplanation: "How much you pay per ₹1 of company earnings — lower can mean cheaper, but not always.",
    longExplanation: "The Price-to-Earnings ratio tells you how much investors are willing to pay for each rupee of the company's earnings. A P/E of 20 means investors pay ₹20 for every ₹1 of earnings. Lower P/E might mean the stock is undervalued, or it might mean the market expects slower growth. Always compare P/E within the same industry.",
  },
  revenue: {
    term: "Revenue",
    shortExplanation: "Total money the company earned from its business — before expenses.",
    longExplanation: "Revenue (also called turnover or top line) is the total amount of money a company brings in from selling its products or services. It's the starting point before deducting any costs. Growing revenue usually means the business is expanding, but profit matters too — a company can have high revenue and still lose money.",
  },
  profit: {
    term: "Net Profit",
    shortExplanation: "Money left after paying all expenses — the company's actual earnings.",
    longExplanation: "Net profit (also called bottom line) is what remains after a company pays all its costs — raw materials, salaries, taxes, interest, everything. It's the real earnings. Consistent and growing profit is generally a positive sign. Losses aren't always bad (startups often lose money while growing), but for established companies, profit is key.",
  },
  debtToEquity: {
    term: "Debt-to-Equity",
    shortExplanation: "How much the company owes vs. what it owns — lower is generally safer.",
    longExplanation: "The debt-to-equity ratio compares a company's total debt to its shareholders' equity (what the owners have invested). A ratio of 0.5 means the company has ₹0.50 of debt for every ₹1 of equity. Lower ratios suggest less financial risk. However, some industries (like telecom) naturally carry more debt, so always compare within the same sector.",
  },
  roe: {
    term: "ROE",
    shortExplanation: "How efficiently the company turns shareholder money into profit — higher is better.",
    longExplanation: "Return on Equity measures how much profit a company generates with the money shareholders have invested. An ROE of 20% means the company generates ₹20 of profit for every ₹100 of shareholder equity. Consistently high ROE (15%+) usually indicates a strong business model and efficient management.",
  },
  dividendYield: {
    term: "Dividend Yield",
    shortExplanation: "Annual cash payout per share as a percentage of the share price.",
    longExplanation: "Dividend yield tells you how much cash a company pays out annually relative to its share price. A 2% yield on a ₹1,000 stock means ₹20 per share per year. Not all companies pay dividends — fast-growing companies often reinvest profits instead. Dividends provide regular income but aren't guaranteed and can change.",
  },
  eps: {
    term: "EPS",
    shortExplanation: "Profit divided by number of shares — how much each share earned.",
    longExplanation: "Earnings Per Share is the company's net profit divided by the total number of shares. It tells you how much profit is attributable to each share you own. Rising EPS over time is generally a positive sign. However, EPS alone doesn't tell the full story — always look at it alongside revenue and profit trends.",
  },
  bookValue: {
    term: "Book Value",
    shortExplanation: "What the company's assets are worth on paper, per share.",
    longExplanation: "Book value per share is the company's total assets minus total liabilities, divided by shares outstanding. It represents what each share would theoretically be worth if the company were liquidated. A stock price much higher than book value suggests the market expects strong future earnings. A price below book value might indicate the stock is undervalued — or that the market sees trouble ahead.",
  },
  high52w: {
    term: "52-Week High/Low",
    shortExplanation: "The highest and lowest prices in the past year — shows the price range.",
    longExplanation: "The 52-week high and low show the trading range of the stock over the past year. A price near the 52-week high might indicate strong recent performance, while a price near the low might suggest recent weakness. However, past prices don't predict future performance — these ranges are for context only.",
  },
};
