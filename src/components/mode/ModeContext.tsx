/**
 * ModeContext.tsx
 *
 * App-wide trading MODE: "intraday" | "swing". Remembered in the browser
 * (localStorage) so the first-time prompt only shows once, but the user can
 * change it anytime from the header.
 *
 * - mode:        the active mode (defaults to "swing" once chosen)
 * - setMode:     change it (and remember the choice)
 * - chosen:      whether the user has made an explicit choice yet
 * - ready:       whether we've finished reading localStorage (avoids flicker)
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type TradingMode = "intraday" | "swing";

interface ModeContextValue {
  mode: TradingMode;
  setMode: (m: TradingMode, remember?: boolean) => void;
  chosen: boolean;
  ready: boolean;
}

const STORAGE_KEY = "stocksahi-mode";

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TradingMode>("swing");
  const [chosen, setChosen] = useState(false);
  const [ready, setReady] = useState(false);

  // On mount: a permanent choice (localStorage) wins; otherwise fall back to a
  // session choice (sessionStorage) so a refresh in the same sitting doesn't
  // re-ask. If neither exists, the prompt will show.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "intraday" || saved === "swing") {
        setModeState(saved);
        setChosen(true);
        setReady(true);
        return;
      }
      const session = sessionStorage.getItem(STORAGE_KEY);
      if (session === "intraday" || session === "swing") {
        setModeState(session);
        setChosen(true);
      }
    } catch {
      /* storage unavailable — default + prompt */
    }
    setReady(true);
  }, []);

  // remember=true      -> persist permanently (localStorage)
  // remember=false     -> this session only (sessionStorage)
  // remember=undefined -> keep wherever it's already stored (header switch)
  const setMode = (m: TradingMode, remember?: boolean) => {
    setModeState(m);
    setChosen(true);
    try {
      if (remember === true) {
        localStorage.setItem(STORAGE_KEY, m);
        sessionStorage.removeItem(STORAGE_KEY);
      } else if (remember === false) {
        sessionStorage.setItem(STORAGE_KEY, m);
      } else {
        // Preserve existing location: update permanent if it exists, else session.
        if (localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, m);
        } else {
          sessionStorage.setItem(STORAGE_KEY, m);
        }
      }
    } catch {
      /* ignore persistence failure */
    }
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, chosen, ready }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
