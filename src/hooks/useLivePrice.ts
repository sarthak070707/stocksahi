/**
 * useLivePrice.ts
 *
 * React hook for live prices, using POLLING (serverless-friendly) instead of a
 * persistent stream. It polls /api/quote for the symbol every few seconds and
 * returns the latest price + previous close. The browser only talks to our own
 * server — never to Upstox directly — so the token stays safe.
 *
 * SHARED POLLER: many components on a page may want the same symbol (header,
 * session stats, chart, trade panel). To avoid each one firing its own request
 * (which would multiply API calls and burn the rate limit), all consumers of a
 * symbol share ONE poll loop and ONE request; the result is fanned out to every
 * subscriber. This mirrors the ref-counted sharing the old WebSocket relay did.
 *
 * Note: prices only change during market hours (9:15am–3:30pm IST). Outside
 * those hours the endpoint returns the last traded price, so values show but
 * stay static — that is expected, not a bug.
 *
 * Usage:
 *   const { ltp, cp, change, changePercent, status } = useLivePrice("RELIANCE");
 */

"use client";

import { useEffect, useState } from "react";

export interface LivePrice {
  ltp: number | null; // last traded price
  cp: number | null; // previous close
  change: number | null; // ltp - cp
  changePercent: number | null;
  status: "connecting" | "live" | "error" | "idle";
}

const POLL_MS = 3000; // poll every 3 seconds

type Snapshot = Pick<LivePrice, "ltp" | "cp" | "status">;

interface Entry {
  subs: Set<(s: Snapshot) => void>;
  snap: Snapshot;
  timer: ReturnType<typeof setInterval> | null;
  inFlight: boolean;
  haveData: boolean;
}

// One entry per symbol, shared across all hook instances on the page.
const registry = new Map<string, Entry>();

function notify(e: Entry) {
  e.subs.forEach((cb) => cb(e.snap));
}

async function poll(symbol: string) {
  const e = registry.get(symbol);
  if (!e || e.inFlight) return;
  if (typeof document !== "undefined" && document.hidden) return; // skip background tabs
  e.inFlight = true;
  try {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    const data = await res.json();
    const cur = registry.get(symbol);
    if (!cur) return;
    if (typeof data.ltp === "number") {
      cur.haveData = true;
      cur.snap = {
        ltp: data.ltp,
        cp: typeof data.cp === "number" ? data.cp : cur.snap.cp,
        status: "live",
      };
      notify(cur);
    } else if (!cur.haveData) {
      cur.snap = { ...cur.snap, status: "error" };
      notify(cur);
    }
    // If a transient empty response arrives but we already had data, keep showing it.
  } catch {
    const cur = registry.get(symbol);
    if (cur && !cur.haveData) {
      cur.snap = { ...cur.snap, status: "error" };
      notify(cur);
    }
    // Already have data -> keep last good values (stay "live").
  } finally {
    const cur = registry.get(symbol);
    if (cur) cur.inFlight = false;
  }
}

function subscribe(symbol: string, cb: (s: Snapshot) => void): () => void {
  let e = registry.get(symbol);
  if (!e) {
    e = {
      subs: new Set(),
      snap: { ltp: null, cp: null, status: "connecting" },
      timer: null,
      inFlight: false,
      haveData: false,
    };
    registry.set(symbol, e);
  }
  e.subs.add(cb);
  cb(e.snap); // hand the new subscriber whatever we already have, immediately

  if (e.timer === null) {
    poll(symbol); // first fetch right away
    e.timer = setInterval(() => poll(symbol), POLL_MS);
  }

  return () => {
    const cur = registry.get(symbol);
    if (!cur) return;
    cur.subs.delete(cb);
    if (cur.subs.size === 0) {
      if (cur.timer) clearInterval(cur.timer);
      registry.delete(symbol); // last consumer left — stop polling this symbol
    }
  };
}

// When the tab becomes visible again, refresh all active symbols promptly.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) registry.forEach((_, sym) => poll(sym));
  });
}

export function useLivePrice(symbol: string | null): LivePrice {
  const [snap, setSnap] = useState<Snapshot>({
    ltp: null,
    cp: null,
    status: symbol ? "connecting" : "idle",
  });

  useEffect(() => {
    if (!symbol) {
      setSnap({ ltp: null, cp: null, status: "idle" });
      return;
    }
    const unsub = subscribe(symbol, setSnap);
    return unsub;
  }, [symbol]);

  const { ltp, cp, status } = snap;
  const change = ltp != null && cp != null ? ltp - cp : null;
  const changePercent =
    ltp != null && cp != null && cp !== 0 ? ((ltp - cp) / cp) * 100 : null;

  return { ltp, cp, change, changePercent, status };
}
