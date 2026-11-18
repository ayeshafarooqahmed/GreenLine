import type {
  DiscoveryCategory,
  PriceAlertRule,
  PriceAlertSide,
  PricePoint,
  PsxSector,
  StockSummary,
} from '../types/market';

export const WATCHLIST_STORAGE_KEY = 'greenline_psx_watchlist_v1';
export const PRICE_ALERTS_STORAGE_KEY = 'greenline_psx_price_alerts_v1';

export function formatPKR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `PKR ${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null | undefined, includePlus = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const sign = includePlus && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined || Number.isNaN(volume)) {
    return 'N/A';
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toLocaleString('en-US');
}

export function formatMarketCap(billionsPkr: number | null | undefined): string {
  if (billionsPkr === null || billionsPkr === undefined || Number.isNaN(billionsPkr)) {
    return 'N/A';
  }
  return `PKR ${billionsPkr.toFixed(1)}B`;
}

export function filterStocks(
  stocks: StockSummary[],
  options: {
    query?: string;
    sector?: PsxSector | 'All';
    category?: DiscoveryCategory;
  } = {}
): StockSummary[] {
  const query = (options.query ?? '').trim().toLowerCase();
  const sector = options.sector ?? 'All';
  const category = options.category ?? 'all';

  let result = stocks.filter((stock) => {
    if (sector !== 'All' && stock.sector !== sector) {
      return false;
    }
    if (query) {
      const symbolMatch = stock.symbol.toLowerCase().includes(query);
      const nameMatch = stock.name.toLowerCase().includes(query);
      const sectorMatch = stock.sector.toLowerCase().includes(query);
      if (!symbolMatch && !nameMatch && !sectorMatch) {
        return false;
      }
    }
    switch (category) {
      case 'trending':
        return Boolean(stock.trending);
      case 'gainers':
        return stock.changePercent > 0;
      case 'losers':
        return stock.changePercent < 0;
      case 'banking':
        return stock.sector === 'Banking';
      case 'technology':
        return stock.sector === 'Technology';
      case 'energy':
        return stock.sector === 'Oil and Gas' || stock.sector === 'Power and Energy';
      case 'dividend':
        return (stock.dividendYieldPercent ?? 0) >= 6.0;
      default:
        return true;
    }
  });

  if (category === 'gainers') {
    result = [...result].sort((a, b) => b.changePercent - a.changePercent);
  } else if (category === 'losers') {
    result = [...result].sort((a, b) => a.changePercent - b.changePercent);
  } else if (category === 'active') {
    result = [...result].sort((a, b) => b.volume - a.volume);
  } else if (category === 'dividend') {
    result = [...result].sort(
      (a, b) => (b.dividendYieldPercent ?? -1) - (a.dividendYieldPercent ?? -1)
    );
  } else if (query) {
    // Prioritize exact symbol prefix matches
    result = [...result].sort((a, b) => {
      const aStarts = a.symbol.toLowerCase().startsWith(query) ? 1 : 0;
      const bStarts = b.symbol.toLowerCase().startsWith(query) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      return a.symbol.localeCompare(b.symbol);
    });
  }

  return result;
}

export function sortMovers(stocks: StockSummary[], count = 5) {
  const gainers = [...stocks]
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, count);

  const losers = [...stocks]
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, count);

  const active = [...stocks]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, count);

  return { gainers, losers, active };
}

export interface ComparisonChartPoint {
  date: string;
  valueA: number;
  valueB: number;
  rawPriceA: number;
  rawPriceB: number;
}

export function buildComparisonSeries(
  seriesA: PricePoint[],
  seriesB: PricePoint[],
  mode: 'percent' | 'price' = 'percent'
): ComparisonChartPoint[] {
  const length = Math.min(seriesA.length, seriesB.length);
  if (length === 0) return [];

  const slicedA = seriesA.slice(seriesA.length - length);
  const slicedB = seriesB.slice(seriesB.length - length);
  const baseA = slicedA[0].price || 1;
  const baseB = slicedB[0].price || 1;

  return slicedA.map((ptA, idx) => {
    const ptB = slicedB[idx];
    const valueA =
      mode === 'percent'
        ? Number((((ptA.price - baseA) / baseA) * 100).toFixed(2))
        : Number(ptA.price.toFixed(2));
    const valueB =
      mode === 'percent'
        ? Number((((ptB.price - baseB) / baseB) * 100).toFixed(2))
        : Number(ptB.price.toFixed(2));

    return {
      date: ptA.date,
      valueA,
      valueB,
      rawPriceA: Number(ptA.price.toFixed(2)),
      rawPriceB: Number(ptB.price.toFixed(2)),
    };
  });
}

export function parseWatchlistJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim()) {
        unique.add(item.trim().toUpperCase());
      }
    }
    return Array.from(unique);
  } catch {
    return [];
  }
}

export function toggleWatchlistSymbol(current: string[], symbol: string): string[] {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return current;
  if (current.includes(normalized)) {
    return current.filter((item) => item !== normalized);
  }
  return [normalized, ...current];
}

export function scoreBriefSentiment(brief: {
  headline: string;
  marketSummary: string;
  positiveMoversNote: string;
  negativeMoversNote: string;
  outlook: string;
  insights: string[];
}): number {
  const text = [
    brief.headline,
    brief.marketSummary,
    brief.positiveMoversNote,
    brief.negativeMoversNote,
    brief.outlook,
    ...brief.insights,
  ]
    .join(' ')
    .toLowerCase();

  const positiveKeywords = [
    'gain',
    'gains',
    'rise',
    'rose',
    'advanc',
    'rally',
    'surge',
    'positive',
    'higher',
    'strength',
    'outperform',
    'up ',
  ];
  const negativeKeywords = [
    'loss',
    'losses',
    'drop',
    'fell',
    'declin',
    'slip',
    'slipped',
    'pressure',
    'negative',
    'lower',
    'weak',
    'sell',
  ];

  let score = 54;
  for (const kw of positiveKeywords) {
    if (text.includes(kw)) score += 4;
  }
  for (const kw of negativeKeywords) {
    if (text.includes(kw)) score -= 3;
  }
  return Math.max(15, Math.min(92, score));
}

export function sentimentLabelForScore(
  score: number
): 'Constructive' | 'Balanced' | 'Cautious' {
  if (score >= 58) return 'Constructive';
  if (score >= 44) return 'Balanced';
  return 'Cautious';
}

export function deriveDailySentimentSeries(
  kse100Series: PricePoint[],
  advancersCount: number,
  declinersCount: number,
  brief: {
    headline: string;
    marketSummary: string;
    positiveMoversNote: string;
    negativeMoversNote: string;
    outlook: string;
    insights: string[];
  } | null
): {
  date: string;
  score: number;
  label: 'Constructive' | 'Balanced' | 'Cautious';
  source: 'Market Breadth' | 'AI Brief';
  note: string;
}[] {
  const windowPoints = kse100Series.slice(-14);
  if (windowPoints.length === 0) return [];

  const totalBreadth = Math.max(1, advancersCount + declinersCount);
  const breadthRatio = (advancersCount - declinersCount) / totalBreadth;

  return windowPoints.map((pt, idx) => {
    const prev = idx > 0 ? windowPoints[idx - 1].price : pt.price;
    const stepPct = prev > 0 ? ((pt.price - prev) / prev) * 100 : 0;
    const isLast = idx === windowPoints.length - 1;

    let score = Math.round(50 + stepPct * 12 + breadthRatio * 14);
    score = Math.max(18, Math.min(90, score));

    if (isLast && brief) {
      const briefScore = scoreBriefSentiment(brief);
      score = Math.round(score * 0.35 + briefScore * 0.65);
    }

    const label = sentimentLabelForScore(score);
    return {
      date: pt.date,
      score,
      label,
      source: isLast && brief ? 'AI Brief' : 'Market Breadth',
      note:
        isLast && brief
          ? brief.headline
          : `KSE-100 at ${pt.price.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${stepPct >= 0 ? '+' : ''}${stepPct.toFixed(2)}% step)`,
    };
  });
}

export function applySessionTick(
  stocks: StockSummary[],
  tickIndex: number
): {
  updatedStocks: StockSummary[];
  changedMovers: { stock: StockSummary; tickDeltaPct: number }[];
} {
  if (stocks.length === 0) return { updatedStocks: [], changedMovers: [] };

  const changedMovers: { stock: StockSummary; tickDeltaPct: number }[] = [];
  const updatedStocks = stocks.map((stock, idx) => {
    // Update 4-5 stocks per tick deterministically so movement is realistic and readable
    const activeSlot = (idx + tickIndex * 3) % 7 === 0;
    if (!activeSlot) return stock;

    const wave = Math.sin((tickIndex + 1) * 1.7 + idx * 2.3);
    const tickDeltaPct = Number((wave * 0.85).toFixed(2));
    if (Math.abs(tickDeltaPct) < 0.15) return stock;

    const nextPrice = Number(Math.max(1, stock.price * (1 + tickDeltaPct / 100)).toFixed(2));
    const nextChangePercent = Number((stock.changePercent + tickDeltaPct).toFixed(2));
    const nextChange = Number(((nextPrice * nextChangePercent) / 100).toFixed(2));
    const nextSparkline = [...stock.sparkline.slice(1), nextPrice];

    const updated: StockSummary = {
      ...stock,
      price: nextPrice,
      change: nextChange,
      changePercent: nextChangePercent,
      volume: stock.volume + Math.round(Math.abs(wave) * 45_000),
      sparkline: nextSparkline,
    };
    changedMovers.push({ stock: updated, tickDeltaPct });
    return updated;
  });

  return { updatedStocks, changedMovers };
}

export function parsePriceAlertsJson(raw: string | null): PriceAlertRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: PriceAlertRule[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.id === 'string' &&
        typeof item.symbol === 'string' &&
        (item.side === 'buy' || item.side === 'sell') &&
        typeof item.targetPrice === 'number' &&
        Number.isFinite(item.targetPrice) &&
        item.targetPrice > 0
      ) {
        const normalizedTriggeredAt =
          typeof item.triggeredAt === 'string' ? item.triggeredAt : null;
        valid.push({
          id: item.id,
          symbol: item.symbol.trim().toUpperCase(),
          side: item.side,
          targetPrice: Number(item.targetPrice.toFixed(2)),
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          triggeredAt: normalizedTriggeredAt,
          triggeredPrice:
            typeof item.triggeredPrice === 'number' && Number.isFinite(item.triggeredPrice)
              ? item.triggeredPrice
              : null,
          active: typeof item.active === 'boolean' ? item.active : normalizedTriggeredAt === null,
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function validatePriceAlertInput(rawValue: string): {
  valid: boolean;
  value: number | null;
  error: string | null;
} {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { valid: false, value: null, error: 'Enter a target price in PKR.' };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, value: null, error: 'Target price must be greater than PKR 0.' };
  }
  return { valid: true, value: Number(num.toFixed(2)), error: null };
}

export function createPriceAlertRule(
  symbol: string,
  side: PriceAlertSide,
  targetPrice: number,
  nowIso = new Date().toISOString()
): PriceAlertRule {
  const normalized = symbol.trim().toUpperCase();
  return {
    id: `alert-${normalized}-${side}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    symbol: normalized,
    side,
    targetPrice: Number(targetPrice.toFixed(2)),
    createdAt: nowIso,
    triggeredAt: null,
    triggeredPrice: null,
    active: true,
  };
}

export function doesPriceAlertTrigger(alert: PriceAlertRule, currentPrice: number): boolean {
  if (!alert.active || alert.triggeredAt !== null) return false;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;
  if (alert.side === 'buy') {
    return currentPrice <= alert.targetPrice;
  }
  return currentPrice >= alert.targetPrice;
}

export function evaluatePriceAlerts(
  alerts: PriceAlertRule[],
  stocks: StockSummary[],
  nowIso = new Date().toISOString()
): {
  nextAlerts: PriceAlertRule[];
  triggered: { alert: PriceAlertRule; stock: StockSummary }[];
} {
  if (alerts.length === 0 || stocks.length === 0) {
    return { nextAlerts: alerts, triggered: [] };
  }

  const stockMap = new Map(stocks.map((s) => [s.symbol.toUpperCase(), s]));
  const triggered: { alert: PriceAlertRule; stock: StockSummary }[] = [];

  const nextAlerts = alerts.map((alert) => {
    const stock = stockMap.get(alert.symbol.toUpperCase());
    if (!stock || !doesPriceAlertTrigger(alert, stock.price)) {
      return alert;
    }
    const updatedAlert: PriceAlertRule = {
      ...alert,
      active: false,
      triggeredAt: nowIso,
      triggeredPrice: stock.price,
    };
    triggered.push({ alert: updatedAlert, stock });
    return updatedAlert;
  });

  return { nextAlerts, triggered };
}

