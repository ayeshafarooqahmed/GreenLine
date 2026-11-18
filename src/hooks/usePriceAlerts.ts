import { useCallback, useEffect, useState } from 'react';
import type { PriceAlertRule, PriceAlertSide } from '../types/market';
import {
  PRICE_ALERTS_STORAGE_KEY,
  createPriceAlertRule,
  parsePriceAlertsJson,
} from '../utils/marketLogic';

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlertRule[]>(() => {
    if (typeof window === 'undefined') return [];
    return parsePriceAlertsJson(window.localStorage.getItem(PRICE_ALERTS_STORAGE_KEY));
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [alerts]);

  const addAlert = useCallback((symbol: string, side: PriceAlertSide, targetPrice: number) => {
    const rule = createPriceAlertRule(symbol, side, targetPrice);
    setAlerts((prev) => [rule, ...prev]);
    return rule;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const rearmAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, active: true, triggeredAt: null, triggeredPrice: null }
          : item
      )
    );
  }, []);

  const removeAlertsForSymbol = useCallback((symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    setAlerts((prev) => prev.filter((item) => item.symbol !== normalized));
  }, []);

  const replaceAlerts = useCallback((nextAlerts: PriceAlertRule[]) => {
    setAlerts(nextAlerts);
  }, []);

  return {
    alerts,
    addAlert,
    removeAlert,
    rearmAlert,
    removeAlertsForSymbol,
    replaceAlerts,
  };
}
