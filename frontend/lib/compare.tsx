"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const KEY = "ghradar_compare";
export const MAX_COMPARE = 4;

interface CompareState {
  items: string[];
  has: (fullName: string) => boolean;
  toggle: (fullName: string) => void;
  remove: (fullName: string) => void;
  clear: () => void;
  full: boolean;
  ready: boolean;
}

const CompareContext = createContext<CompareState | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (fullName: string) => {
      setItems((prev) => {
        const next = prev.includes(fullName)
          ? prev.filter((x) => x !== fullName)
          : prev.length >= MAX_COMPARE
            ? prev
            : [...prev, fullName];
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    []
  );

  const remove = useCallback((fullName: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x !== fullName);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  return (
    <CompareContext.Provider
      value={{
        items,
        has: (f) => items.includes(f),
        toggle,
        remove,
        clear,
        full: items.length >= MAX_COMPARE,
        ready,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
