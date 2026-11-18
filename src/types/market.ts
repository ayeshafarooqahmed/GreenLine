export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export type DiscoveryCategory =
  | 'all'
  | 'trending'
  | 'gainers'
  | 'losers'
  | 'active'
  | 'banking'
  | 'technology'
  | 'energy'
  | 'dividend';

export type PsxSector =
  | 'Banking'
  | 'Technology'
  | 'Cement'
  | 'Oil and Gas'
  | 'Fertilizer'
  | 'Power and Energy'
  | 'Pharmaceuticals'
  | 'Automobile';

export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

export interface IndexQuote {
  symbol: 'KSE-100' | 'KSE-30' | 'KMI-30';
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volumeMillions: number;
  high: number;
  low: number;
  sparkline: number[];
}

export interface StockFinancials {
  marketCapBillionsPkr: number | null;
  peRatio: number | null;
  epsPkr: number | null;
  dividendYieldPercent: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  symbols: string[];
  sentimentHint: 'positive' | 'negative' | 'neutral';
}

export interface StockSummary {
  symbol: string;
  name: string;
  sector: PsxSector;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCapBillionsPkr: number | null;
  dividendYieldPercent: number | null;
  peRatio: number | null;
  featured?: boolean;
  trending?: boolean;
  sparkline: number[];
}

export interface StockDetail extends StockSummary {
  description: string;
  headquarters: string;
  foundedYear: number | null;
  financials: StockFinancials;
  history: Record<TimeRange, PricePoint[]>;
  relatedNews: NewsItem[];
}

export interface SectorPerformance {
  sector: PsxSector;
  changePercent: number;
  marketCapSharePercent: number;
  advancers: number;
  decliners: number;
  topStockSymbol: string;
  volumeMillions: number;
}

export interface DataSourceMeta {
  dataMode: 'illustrative' | 'live';
  dataLabel: string;
  marketStatus: 'Market Closed' | 'Session Open' | 'Illustrative Reference';
  asOfTimestamp: string;
}

export interface MarketOverviewResponse {
  meta: DataSourceMeta;
  indices: IndexQuote[];
  kse100History: Record<TimeRange, PricePoint[]>;
  gainers: StockSummary[];
  losers: StockSummary[];
  active: StockSummary[];
  featured: StockSummary[];
  sectors: SectorPerformance[];
  totalVolumeMillions: number;
  totalValueBillionsPkr: number;
  advancersCount: number;
  declinersCount: number;
  unchangedCount: number;
  news: NewsItem[];
}

export interface AiBriefResponse {
  headline: string;
  insights: string[];
  marketSummary: string;
  positiveMoversNote: string;
  negativeMoversNote: string;
  keyDevelopments: string;
  outlook: string;
  generatedAt: string;
  dataMode: 'illustrative' | 'live';
}

export interface AiStockAnalysisResponse {
  symbol: string;
  movementOverview: string;
  contributingFactors: string[];
  newsContext: string;
  performanceObservations: string;
  riskFactors: string[];
  dataLimitations: string;
  generatedAt: string;
}

export interface AiComparisonResponse {
  symbolA: string;
  symbolB: string;
  executiveSummary: string;
  performanceComparison: string;
  financialMetricsComparison: string;
  strengthsAndWeaknesses: {
    symbol: string;
    strengths: string[];
    weaknesses: string[];
  }[];
  riskFactors: string[];
  dataLimitations: string;
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  error?: boolean;
}

export interface SentimentPoint {
  date: string;
  score: number;
  label: 'Constructive' | 'Balanced' | 'Cautious';
  source: 'Market Breadth' | 'AI Brief';
  note: string;
}

export type PriceAlertSide = 'buy' | 'sell';

export interface PriceAlertRule {
  id: string;
  symbol: string;
  side: PriceAlertSide;
  targetPrice: number;
  createdAt: string;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  active: boolean;
}

export interface MarketNotification {
  id: string;
  symbol: string;
  title: string;
  detail: string;
  deltaPercent: number;
  price: number;
  timestamp: string;
  read: boolean;
  isWatchlist: boolean;
  alertKind?: 'tick' | 'buy-target' | 'sell-target';
}

