import { useCallback, useEffect, useState } from 'react';
import {
  WATCHLIST_STORAGE_KEY,
  parseWatchlistJson,
  toggleWatchlistSymbol,
} from '../utils/marketLogic';

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseWatchlistJson(window.localStorage.getItem(WATCHLIST_STORAGE_KEY));
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(symbols));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [symbols]);

  const toggle = useCallback((symbol: string) => {
    setSymbols((prev) => toggleWatchlistSymbol(prev, symbol));
  }, []);

  const remove = useCallback((symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    setSymbols((prev) => prev.filter((item) => item !== normalized));
  }, []);

  const isWatched = useCallback(
    (symbol: string) => symbols.includes(symbol.trim().toUpperCase()),
    [symbols]
  );

  return {
    symbols,
    toggle,
    remove,
    isWatched,
  };
}
