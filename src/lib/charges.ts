/**
 * charges.ts
 *
 * Simulated intraday equity trading charges, modelled on Groww's structure.
 *
 * IMPORTANT — honesty note for anyone reading this:
 * StockSahi is free and takes no money. These numbers only exist so that a
 * learner's *practice* P&L reflects the real-world cost of trading — the same
 * charges a real broker would deduct. We verified this formula against real
 * Groww contract notes and Groww's own brokerage calculator; it reproduces them
 * to the rupee within normal rounding.
 *
 * Every rate is a named constant so it can be updated if SEBI / the exchange /
 * Groww revise their charges — the rates below are current as of 2026.
 *
 * All charges are a function of TURNOVER (quantity x price), never of profit or
 * loss. A winning and a losing trade of the same size pay the same charges.
 */

// ---- Rates (equity intraday) ----
const BROKERAGE_RATE = 0.001; // 0.1% of each order's value...
const BROKERAGE_MIN = 5; // ...but at least Rs 5 per order...
const BROKERAGE_MAX = 20; // ...and never more than Rs 20 per order.
const STT_RATE = 0.00025; // 0.025% on the SELL side only.
const EXCHANGE_RATE = 0.0000297; // 0.00297% of total (buy + sell) turnover (NSE).
const SEBI_RATE = 0.000001; // 0.0001% of total turnover.
const STAMP_DUTY_RATE = 0.00003; // 0.003% on the BUY side only.
const GST_RATE = 0.18; // 18% on (brokerage + exchange + SEBI).

// Auto square-off penalty: when an intraday position is left open and the broker
// closes it at the session cutoff, Groww charges a flat Rs 50 + 18% GST on top of
// the normal charges. (This is why real traders square off themselves in time.)
const AUTO_SQUAREOFF_FEE = 50;
export const AUTO_SQUAREOFF_CHARGE = round2(AUTO_SQUAREOFF_FEE * (1 + GST_RATE)); // Rs 59

export interface ChargeBreakdown {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stampDuty: number;
  gst: number;
  autoSquareOff: number; // Rs 59 if the broker auto-closed it, else 0
  total: number;
}

/** Brokerage for a single order (buy or sell), given that order's value. */
function brokerageForOrder(orderValue: number): number {
  const pct = orderValue * BROKERAGE_RATE;
  return Math.min(Math.max(pct, BROKERAGE_MIN), BROKERAGE_MAX);
}

/**
 * Compute the full charge breakdown for one round-trip intraday trade.
 * @param buyValue  quantity x buy price  (the buy-side turnover)
 * @param sellValue quantity x sell price (the sell-side turnover)
 *
 * Direction doesn't matter: whether you went long (buy then sell) or short
 * (sell then buy), both a buy leg and a sell leg happen, and charges land the
 * same way — STT on the sell leg, stamp duty on the buy leg.
 */
export function computeCharges(
  buyValue: number,
  sellValue: number,
  autoSquaredOff = false
): ChargeBreakdown {
  const turnover = buyValue + sellValue;

  const brokerage = round2(brokerageForOrder(buyValue) + brokerageForOrder(sellValue));
  const stt = Math.round(sellValue * STT_RATE); // STT is rounded to the nearest rupee
  const exchange = round2(turnover * EXCHANGE_RATE);
  const sebi = round2(turnover * SEBI_RATE);
  const stampDuty = round2(buyValue * STAMP_DUTY_RATE);
  const gst = round2((brokerage + exchange + sebi) * GST_RATE);
  const autoSquareOff = autoSquaredOff ? AUTO_SQUAREOFF_CHARGE : 0;

  const total = round2(brokerage + stt + exchange + sebi + stampDuty + gst + autoSquareOff);

  return { brokerage, stt, exchange, sebi, stampDuty, gst, autoSquareOff, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
