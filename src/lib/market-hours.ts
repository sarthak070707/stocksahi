/**
 * market-hours.ts
 *
 * One honest source of truth for NSE intraday session status, in IST.
 *
 * Why this exists: several parts of the app need to agree on "is the market
 * open right now, and can an intraday trade happen?" — the trade panel, the
 * status label, and the auto square-off. Keeping the rule in one place means
 * they can never drift apart.
 *
 * The rules we model (NSE equity intraday):
 *   - Regular session runs 9:15 AM to 3:30 PM IST on weekdays.
 *   - Intraday positions must be squared off by 3:05 PM IST — after that no
 *     fresh intraday trade would execute at a real broker.
 *   - So for StockSahi's intraday practice, "tradeable" means 9:15 AM–3:05 PM
 *     IST, Monday–Friday. (We don't model exchange holidays here; prices simply
 *     won't move on those days, which the app states honestly.)
 *
 * We do NOT touch prices anywhere — Upstox returns no movement when the market
 * is closed, exactly like any broker. This file only reports the time-based
 * status so the UI can explain what the user is seeing.
 */

// Session boundaries in minutes-from-midnight IST.
const OPEN_MINUTES = 9 * 60 + 15; // 9:15 AM
const SQUAREOFF_MINUTES = 15 * 60 + 5; // 3:05 PM — intraday cutoff
const CLOSE_MINUTES = 15 * 60 + 30; // 3:30 PM — regular session end

export const MARKET_OPEN_LABEL = "9:15 AM";
export const MARKET_SQUAREOFF_LABEL = "3:05 PM";
export const MARKET_CLOSE_LABEL = "3:30 PM";

export type MarketStatus =
  | "open" // 9:15 AM–3:05 PM, weekday — intraday trading allowed
  | "closing" // 3:05 PM–3:30 PM — session still live but past intraday square-off
  | "closed"; // outside the session, or weekend

/** Current wall-clock time in IST as { minutes-from-midnight, weekday }. */
function nowIST(at: Date = new Date()): { minutes: number; day: number } {
  // Shift UTC to IST, then read the shifted clock via UTC getters.
  const ist = new Date(at.getTime() + 5.5 * 3600 * 1000);
  return {
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
    day: ist.getUTCDay(), // 0 = Sunday, 6 = Saturday
  };
}

/** Is today a weekday (Mon–Fri) in IST? */
function isWeekdayIST(at: Date = new Date()): boolean {
  const { day } = nowIST(at);
  return day >= 1 && day <= 5;
}

/**
 * The market's status right now (IST).
 *   open    -> intraday trades allowed (9:15 AM–3:05 PM, weekday)
 *   closing -> 3:05–3:30 PM: no fresh intraday trade; open positions square off
 *   closed  -> outside the session / weekend: no price activity
 */
export function getMarketStatus(at: Date = new Date()): MarketStatus {
  if (!isWeekdayIST(at)) return "closed";
  const { minutes } = nowIST(at);
  if (minutes >= OPEN_MINUTES && minutes < SQUAREOFF_MINUTES) return "open";
  if (minutes >= SQUAREOFF_MINUTES && minutes < CLOSE_MINUTES) return "closing";
  return "closed";
}

/** Can a fresh intraday trade be placed right now? Only 9:15 AM–3:05 PM. */
export function isTradingOpen(at: Date = new Date()): boolean {
  return getMarketStatus(at) === "open";
}

/**
 * Is the market live (prices moving) right now? True for the whole session,
 * 9:15 AM–3:30 PM — both the "open" window and the 3:05–3:30 "closing" window
 * where prices still move but no new intraday trade may be placed. Charges gate
 * on THIS, not on isTradingOpen: a close between 3:05 and 3:30 is a real,
 * price-moving trade and is charged. Only a close after 3:30 (or on a weekend)
 * is after-hours practice with no charge.
 */
export function isMarketLive(at: Date = new Date()): boolean {
  const s = getMarketStatus(at);
  return s === "open" || s === "closing";
}

/**
 * Should open intraday positions be auto-squared-off now? True once we're past
 * the 3:05 PM cutoff on a weekday (the "closing" window and anything after it
 * on the same day). Weekends/pre-open don't trigger a square-off by themselves —
 * a stale position from a previous session is handled by the caller.
 */
export function isPastSquareOff(at: Date = new Date()): boolean {
  if (!isWeekdayIST(at)) return true; // weekend: any weekday position is long overdue
  const { minutes } = nowIST(at);
  return minutes >= SQUAREOFF_MINUTES;
}

/** Short status line for the trade panel / chart header. */
export function marketStatusText(status: MarketStatus): string {
  switch (status) {
    case "open":
      return `Market open · ${MARKET_OPEN_LABEL}–${MARKET_SQUAREOFF_LABEL}`;
    case "closing":
      return `Past intraday square-off (${MARKET_SQUAREOFF_LABEL})`;
    case "closed":
      return "Market closed · no price activity";
  }
}
