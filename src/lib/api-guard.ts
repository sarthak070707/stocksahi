/**
 * api-guard.ts
 *
 * Lightweight, in-memory protection for our public API routes. Because every
 * route ultimately calls Upstox with ONE shared access token, an unthrottled
 * public endpoint could let a single abuser burn the token's rate limit and
 * break live data for everyone. Two layers guard against that:
 *
 *   1. checkRateLimit() — a fixed-window per-IP limiter. Stops anyone hammering
 *      an endpoint in a tight loop.
 *   2. cached() — a short-lived response cache with in-flight de-duplication.
 *      Many requests for the same data collapse into ONE upstream Upstox call,
 *      so the token is shielded no matter how much traffic arrives.
 *
 * Note on scale: this state lives in memory, so on serverless it is per-warm-
 * instance and resets on cold starts — effective at small scale (a handful of
 * users, usually one warm instance). For large or distributed deployments the
 * Maps below would be swapped for a shared store such as Redis/Upstash.
 */

import { NextRequest, NextResponse } from "next/server";

// ----------------------------- Rate limiting -----------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number; // max requests allowed per window, per IP
  windowMs: number; // window length in milliseconds
  key?: string; // namespace so routes don't share a counter
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

let opCount = 0;
function maybeSweep() {
  // Opportunistically drop expired entries so the maps stay small.
  if (++opCount % 200 !== 0) return;
  const now = Date.now();
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  for (const [k, e] of cache) if (now >= e.expiresAt) cache.delete(k);
}

/**
 * Returns null if the request is allowed, or a ready-to-return 429 response if
 * the per-IP limit for this window has been exceeded.
 */
export function checkRateLimit(
  req: NextRequest,
  opts: RateLimitOptions
): NextResponse | null {
  maybeSweep();
  const id = `${opts.key ?? "global"}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(id);

  if (!b || now >= b.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (b.count >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  b.count++;
  return null;
}

// ------------------------- Short response cache --------------------------

type Entry = { value: unknown; expiresAt: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Return a fresh cached value for `key`, or call `fn` once and cache it for
 * `ttlMs`. Concurrent callers for the same key share a single in-flight call,
 * so a burst of identical requests results in just one upstream Upstox hit.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now < hit.expiresAt) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const value = await fn();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p as Promise<T>;
}
