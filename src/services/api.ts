import type {
  AiBriefResponse,
  AiComparisonResponse,
  AiStockAnalysisResponse,
  ChatMessage,
  DiscoveryCategory,
  MarketOverviewResponse,
  PsxSector,
  StockDetail,
  StockSummary,
  TimeRange,
} from '../types/market';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' && data.error.trim()
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const marketApi = {
  getOverview: () => fetchJson<MarketOverviewResponse>('/api/market/overview'),

  getStocks: (params?: {
    q?: string;
    sector?: PsxSector | 'All';
    category?: DiscoveryCategory;
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.sector && params.sector !== 'All') search.set('sector', params.sector);
    if (params?.category && params.category !== 'all') search.set('category', params.category);
    const qs = search.toString();
    return fetchJson<{
      stocks: StockSummary[];
      dataMode: 'illustrative' | 'live';
      asOfTimestamp: string;
    }>(`/api/stocks${qs ? `?${qs}` : ''}`);
  },

  getStockBySymbol: (symbol: string) =>
    fetchJson<{
      stock: StockDetail;
      dataMode: 'illustrative' | 'live';
      asOfTimestamp: string;
    }>(`/api/stocks/${encodeURIComponent(symbol)}`),

  generateBrief: () =>
    fetchJson<AiBriefResponse>('/api/ai/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  explainStock: (symbol: string, timeframe: TimeRange) =>
    fetchJson<AiStockAnalysisResponse>('/api/ai/explain-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe }),
    }),

  compareStocks: (symbolA: string, symbolB: string) =>
    fetchJson<AiComparisonResponse>('/api/ai/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbolA, symbolB }),
    }),

  askGreenline: (question: string, history: Pick<ChatMessage, 'role' | 'content'>[]) =>
    fetchJson<{ answer: string; answeredAt: string }>('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    }),
};
