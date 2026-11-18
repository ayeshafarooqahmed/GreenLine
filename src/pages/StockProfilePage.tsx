import {
  ArrowLeft,
  Bookmark,
  Building2,
  GitCompareArrows,
  Newspaper,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  AiStockAnalysisResponse,
  DataSourceMeta,
  PriceAlertRule,
  PriceAlertSide,
  StockDetail,
  TimeRange,
} from '../types/market';
import { marketApi } from '../services/api';
import {
  formatMarketCap,
  formatNumber,
  formatPKR,
  formatPercent,
  formatVolume,
} from '../utils/marketLogic';
import { DataDisclosure } from '../components/DataDisclosure';
import { PriceChart } from '../components/PriceChart';
import { WatchlistAlertPanel } from '../components/WatchlistAlertPanel';

interface StockProfilePageProps {
  symbol: string;
  meta: DataSourceMeta | null;
  liveStockPrice?: number;
  liveChange?: number;
  liveChangePercent?: number;
  isWatched: boolean;
  priceAlerts: PriceAlertRule[];
  onAddAlert: (symbol: string, side: PriceAlertSide, targetPrice: number) => void;
  onRemoveAlert: (id: string) => void;
  onRearmAlert: (id: string) => void;
  onToggleWatchlist: (symbol: string) => void;
  onBack: () => void;
  onCompareWith: (symbol: string) => void;
}

export function StockProfilePage({
  symbol,
  meta,
  liveStockPrice,
  liveChange,
  liveChangePercent,
  isWatched,
  priceAlerts,
  onAddAlert,
  onRemoveAlert,
  onRearmAlert,
  onToggleWatchlist,
  onBack,
  onCompareWith,
}: StockProfilePageProps) {
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('1M');

  const [analysis, setAnalysis] = useState<AiStockAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);

    marketApi
      .getStockBySymbol(symbol)
      .then((res) => {
        if (!cancelled) {
          setStock(res.stock);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stock profile.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const handleExplainMovement = async () => {
    if (!stock) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await marketApi.explainStock(stock.symbol, range);
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Failed to generate AI stock analysis.'
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
        <div className="h-96 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-[#89968D] hover:text-[#F2F5F2]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Discover</span>
        </button>
        <div className="rounded-xl bg-[#101713] border border-[#F06B72]/40 p-6 text-sm text-[#F06B72]">
          {error ?? `Stock ${symbol} not found.`}
        </div>
      </div>
    );
  }

  const effectivePrice = liveStockPrice ?? stock.price;
  const effectiveChange = liveChange ?? stock.change;
  const effectiveChangePercent = liveChangePercent ?? stock.changePercent;
  const positive = effectiveChangePercent >= 0;

  const metrics: { label: string; value: string }[] = [
    { label: 'Market Capitalization', value: formatMarketCap(stock.financials.marketCapBillionsPkr) },
    {
      label: 'P/E Ratio',
      value: stock.financials.peRatio !== null ? formatNumber(stock.financials.peRatio, 2) : 'N/A',
    },
    {
      label: 'Earnings Per Share (EPS)',
      value: stock.financials.epsPkr !== null ? formatPKR(stock.financials.epsPkr) : 'N/A',
    },
    {
      label: 'Dividend Yield',
      value:
        stock.financials.dividendYieldPercent !== null
          ? `${stock.financials.dividendYieldPercent.toFixed(2)}%`
          : 'N/A',
    },
    {
      label: '52-Week High',
      value: stock.financials.week52High !== null ? formatPKR(stock.financials.week52High) : 'N/A',
    },
    {
      label: '52-Week Low',
      value: stock.financials.week52Low !== null ? formatPKR(stock.financials.week52Low) : 'N/A',
    },
    { label: 'Trading Volume', value: formatVolume(stock.financials.volume) },
    { label: 'Sector', value: stock.sector },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#89968D] hover:text-[#F2F5F2] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Discover</span>
        </button>

        {/* Company Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[#25332A]">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-[#89968D]">
              <span className="font-mono font-semibold text-[#39E879]">{stock.symbol}</span>
              <span aria-hidden="true">·</span>
              <span>{stock.sector}</span>
              <span aria-hidden="true">·</span>
              <span>PSX Listed</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#F2F5F2] mt-1.5">
              {stock.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-4">
              <span className="font-mono text-3xl sm:text-4xl font-semibold text-[#F2F5F2]">
                {formatPKR(effectivePrice)}
              </span>
              <span
                className={`font-mono text-sm font-medium inline-flex items-center gap-1.5 ${
                  positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                }`}
              >
                {positive ? (
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {positive ? '+' : ''}
                  {formatNumber(effectiveChange, 2)} ({formatPercent(effectiveChangePercent)})
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onToggleWatchlist(stock.symbol)}
              aria-pressed={isWatched}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isWatched
                  ? 'bg-[#19251D] border-[#39E879]/60 text-[#39E879]'
                  : 'bg-[#101713] border-[#25332A] text-[#F2F5F2] hover:border-[#39E879]/50'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isWatched ? 'currentColor' : 'none'} />
              <span>{isWatched ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>

            <button
              type="button"
              onClick={() => onCompareWith(stock.symbol)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101713] border border-[#25332A] text-sm font-medium text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors whitespace-nowrap shrink-0"
            >
              <GitCompareArrows className="w-4 h-4 text-[#8BE9A8]" aria-hidden="true" />
              <span>Compare</span>
            </button>
          </div>
        </div>

        <DataDisclosure meta={meta} />

        {isWatched && (
          <div className="rounded-xl bg-[#101713] border border-[#25332A] px-5 py-3.5">
            <WatchlistAlertPanel
              key={stock.symbol}
              symbol={stock.symbol}
              currentPrice={effectivePrice}
              alerts={priceAlerts}
              onAddAlert={onAddAlert}
              onRemoveAlert={onRemoveAlert}
              onRearmAlert={onRearmAlert}
            />
          </div>
        )}
      </div>

      {/* Interactive Price Chart */}
      <PriceChart
        title={`${stock.symbol} Historical Price`}
        history={stock.history}
        range={range}
        onRangeChange={setRange}
        unit="PKR"
        height={350}
      />

      {/* Key Financial Metrics */}
      <section aria-labelledby="key-metrics-heading" className="space-y-4">
        <h2
          id="key-metrics-heading"
          className="font-display text-lg font-semibold text-[#F2F5F2]"
        >
          Key Financial Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-[#101713] border border-[#25332A] p-4 space-y-1.5"
            >
              <div className="text-xs text-[#89968D]">{m.label}</div>
              <div className="font-mono text-base font-semibold text-[#F2F5F2]">{m.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Stock Analysis */}
      <section
        aria-labelledby="ai-stock-analysis-heading"
        className="rounded-xl bg-[#101713] border border-[#25332A] p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#39E879]">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Gemini Financial Intelligence</span>
            </div>
            <h2
              id="ai-stock-analysis-heading"
              className="font-display text-lg font-semibold text-[#F2F5F2] mt-1"
            >
              AI Stock Analysis — {stock.symbol}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleExplainMovement}
            disabled={analysisLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>{analysisLoading ? 'Analyzing movement...' : 'Explain this movement'}</span>
          </button>
        </div>

        {analysisLoading && (
          <div className="space-y-3 pt-2">
            <div className="h-4 w-2/3 rounded bg-[#19251D] animate-pulse" />
            <div className="h-16 rounded bg-[#19251D] animate-pulse" />
            <div className="h-16 rounded bg-[#19251D] animate-pulse" />
          </div>
        )}

        {analysisError && (
          <div className="rounded-lg bg-[#151F19] border border-[#F06B72]/40 p-4 text-sm text-[#F06B72]">
            {analysisError}
          </div>
        )}

        {!analysis && !analysisLoading && !analysisError && (
          <p className="text-sm text-[#89968D] leading-relaxed">
            Click <strong className="text-[#F2F5F2]">Explain this movement</strong> to analyze{' '}
            {stock.symbol}&apos;s {range} price trajectory, key valuation metrics, supplied news
            context, and sector risk factors using Gemini.
          </p>
        )}

        {analysis && !analysisLoading && (
          <div className="space-y-5 pt-2 border-t border-[#25332A]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#8BE9A8]">
                  Verified Movement Overview ({range})
                </h3>
                <p className="text-sm text-[#F2F5F2]/90 leading-relaxed">
                  {analysis.movementOverview}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#8BE9A8]">
                  Performance &amp; Valuation Observations
                </h3>
                <p className="text-sm text-[#F2F5F2]/90 leading-relaxed">
                  {analysis.performanceObservations}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-lg bg-[#151F19] border border-[#25332A] p-4 space-y-2.5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#89968D]">
                  Possible Contributing Factors (Interpretation)
                </h3>
                <ul className="space-y-2 text-sm text-[#F2F5F2]/90 list-disc pl-4">
                  {analysis.contributingFactors.map((factor, i) => (
                    <li key={i} className="leading-relaxed">
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-[#151F19] border border-[#25332A] p-4 space-y-2.5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#F06B72]">
                  Key Risk Factors
                </h3>
                <ul className="space-y-2 text-sm text-[#F2F5F2]/90 list-disc pl-4">
                  {analysis.riskFactors.map((risk, i) => (
                    <li key={i} className="leading-relaxed">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#89968D]">
                Supplied News Context
              </h3>
              <p className="text-sm text-[#89968D] leading-relaxed">{analysis.newsContext}</p>
            </div>

            <div className="pt-3 border-t border-[#25332A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#89968D]">
              <span>Data limitations: {analysis.dataLimitations}</span>
              <span className="font-mono shrink-0">
                Generated{' '}
                {new Date(analysis.generatedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Company Overview & Related News */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-xl bg-[#101713] border border-[#25332A] p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F2F5F2]">
            <Building2 className="w-4 h-4 text-[#8BE9A8]" aria-hidden="true" />
            <h2 className="font-display">Company Information</h2>
          </div>
          <p className="text-sm text-[#89968D] leading-relaxed">{stock.description}</p>
          <div className="pt-3 border-t border-[#25332A] flex flex-wrap gap-6 text-xs text-[#89968D]">
            <div>
              <span className="block text-[11px] uppercase tracking-wider">Headquarters</span>
              <span className="text-[#F2F5F2] font-medium">{stock.headquarters}, Pakistan</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider">Founded</span>
              <span className="font-mono text-[#F2F5F2]">
                {stock.foundedYear ?? 'N/A'}
              </span>
            </div>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-xl bg-[#101713] border border-[#25332A] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F2F5F2]">
            <Newspaper className="w-4 h-4 text-[#8BE9A8]" aria-hidden="true" />
            <h2 className="font-display">Related Market Context</h2>
          </div>

          {stock.relatedNews.length === 0 ? (
            <p className="text-sm text-[#89968D]">
              No recent headline notes linked directly to {stock.symbol} in the current snapshot.
            </p>
          ) : (
            <div className="space-y-4">
              {stock.relatedNews.map((item) => (
                <article
                  key={item.id}
                  className="pb-4 last:pb-0 border-b last:border-b-0 border-[#25332A]/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#89968D]">
                    <span>{item.source}</span>
                    <span className="font-mono">
                      {new Date(item.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[#F2F5F2]">{item.title}</h3>
                  <p className="text-xs text-[#89968D] leading-relaxed">{item.summary}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
