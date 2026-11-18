import type { ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type {
  AiBriefResponse,
  MarketOverviewResponse,
  StockSummary,
} from '../types/market';
import type { RoutePage } from '../types/navigation';
import { formatNumber, formatPKR, formatPercent, formatVolume } from '../utils/marketLogic';
import { Logo } from '../components/Logo';
import { Sparkline } from '../components/Sparkline';
import { StockSearchInput } from '../components/StockSearchInput';
import { StockTickerBar } from '../components/StockTickerBar';
import { TopNav } from '../components/TopNav';

interface LandingPageProps {
  overview: MarketOverviewResponse | null;
  allStocks: StockSummary[];
  loading: boolean;
  error: string | null;
  brief: AiBriefResponse | null;
  briefLoading: boolean;
  briefError: string | null;
  onRefreshBrief: () => void;
  onNavigate: (page: RoutePage) => void;
  onSelectStock: (symbol: string) => void;
  onSearchQuerySubmit: (query: string) => void;
  watchlistCount: number;
  notificationSlot?: ReactNode;
}

export function LandingPage({
  overview,
  allStocks,
  loading,
  error,
  brief,
  briefLoading,
  briefError,
  onRefreshBrief,
  onNavigate,
  onSelectStock,
  onSearchQuerySubmit,
  watchlistCount,
  notificationSlot,
}: LandingPageProps) {
  const [moverTab, setMoverTab] = useState<'gainers' | 'losers' | 'active'>('gainers');
  const heroSearchContainerRef = useRef<HTMLDivElement>(null);

  const focusHeroSearch = () => {
    const input = document.getElementById('hero-stock-search') as HTMLInputElement | null;
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => input.focus(), 200);
    }
  };

  const activeMovers =
    moverTab === 'gainers'
      ? overview?.gainers ?? []
      : moverTab === 'losers'
        ? overview?.losers ?? []
        : overview?.active ?? [];

  return (
    <div className="min-h-screen bg-[#080B09] text-[#F2F5F2] flex flex-col">
      <TopNav
        currentPage="home"
        onNavigate={onNavigate}
        onSearchAction={focusHeroSearch}
        watchlistCount={watchlistCount}
        notificationSlot={notificationSlot}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[#25332A] bg-terminal-grid">
          {/* Subtle Animated Market Line Backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-45"
          >
            <svg
              viewBox="0 0 1440 480"
              fill="none"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="heroCurveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#39E879" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#39E879" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0 390 C 160 365, 240 315, 390 330 C 520 342, 620 245, 780 230 C 920 218, 1020 250, 1140 165 C 1260 80, 1360 115, 1440 60 L1440 480 L0 480 Z"
                fill="url(#heroCurveFill)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
              />
              <motion.path
                d="M0 390 C 160 365, 240 315, 390 330 C 520 342, 620 245, 780 230 C 920 218, 1020 250, 1140 165 C 1260 80, 1360 115, 1440 60"
                stroke="#39E879"
                strokeWidth="2"
                strokeOpacity="0.5"
                initial={{ pathLength: 0.2, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
              />
            </svg>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.12em] text-[#8BE9A8] mb-4">
                Pakistan Stock Exchange · Market Intelligence
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[60px] font-bold tracking-tight leading-[1.06] text-[#F2F5F2] text-balance">
                The market moves.
                <br />
                Stay ahead of it.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#89968D] max-w-xl leading-relaxed">
                Discover Pakistan&apos;s markets. Track the movement. Understand what matters.
              </p>

              {/* Prominent Stock Search */}
              <div ref={heroSearchContainerRef} className="mt-8 max-w-xl">
                <StockSearchInput
                  stocks={allStocks}
                  onSelectStock={onSelectStock}
                  onSubmitQuery={onSearchQuerySubmit}
                  size="lg"
                  inputId="hero-stock-search"
                  placeholder="Search PSX stocks (HBL, MEBL, OGDC, SYS)..."
                />
              </div>

              {/* Primary + Secondary CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('markets')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Markets</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('discover')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#101713]/68 backdrop-blur-md border border-[#2F4236] shadow-[inset_0_1px_0_rgba(242,245,242,0.07)] text-[#F2F5F2] text-sm font-medium hover:bg-[#19251D]/80 hover:border-[#39E879]/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Discover Stocks</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Running Stock Rate Bar (Green background, black text, up/down direction) */}
        <StockTickerBar stocks={allStocks} onSelectStock={onSelectStock} />

        {/* Market Snapshot */}
        <section
          aria-labelledby="market-snapshot-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
            <div>
              <h2
                id="market-snapshot-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-[#F2F5F2]"
              >
                Market Snapshot
              </h2>
              <p className="text-xs text-[#89968D] mt-1">
                {overview?.meta.dataLabel ?? 'Loading Pakistan Stock Exchange indices...'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('markets')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#39E879] hover:text-[#8BE9A8] transition-colors whitespace-nowrap"
            >
              <span>Full Markets Dashboard</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-[#151F19] border border-[#F06B72]/40 px-4 py-3 text-sm text-[#F06B72]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(overview?.indices ?? []).map((idx) => {
                const positive = idx.changePercent >= 0;
                return (
                  <button
                    key={idx.symbol}
                    type="button"
                    onClick={() => onNavigate('markets')}
                    className="text-left rounded-xl bg-[#101713] border border-[#25332A] hover:border-[#39E879]/50 p-5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#89968D]">
                          <span className="font-mono font-semibold text-[#F2F5F2]">{idx.symbol}</span>
                          <span aria-hidden="true">·</span>
                          <span>{overview?.meta.marketStatus}</span>
                        </div>
                        <div className="mt-2 font-mono text-2xl font-semibold text-[#F2F5F2]">
                          {formatNumber(idx.value, 2)}
                        </div>
                      </div>
                      <Sparkline data={idx.sparkline} positive={positive} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#25332A]/70 flex items-center justify-between text-xs font-mono">
                      <span className={positive ? 'text-[#39E879]' : 'text-[#F06B72]'}>
                        {positive ? '+' : ''}
                        {formatNumber(idx.change, 2)} ({formatPercent(idx.changePercent)})
                      </span>
                      <span className="text-[#89968D]">Vol {idx.volumeMillions.toFixed(1)}M</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Market Movers & THE GREENLINE BRIEF */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Market Movers (7 cols) */}
            <div className="lg:col-span-7 rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#25332A] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-[#F2F5F2]">
                  Market Movers
                </h2>
                <div
                  role="tablist"
                  aria-label="Market movers category"
                  className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#080B09] border border-[#25332A]"
                >
                  {(
                    [
                      { id: 'gainers', label: 'Top Gainers' },
                      { id: 'losers', label: 'Top Losers' },
                      { id: 'active', label: 'Most Active' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={moverTab === tab.id}
                      onClick={() => setMoverTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        moverTab === tab.id
                          ? 'bg-[#19251D] text-[#39E879]'
                          : 'text-[#89968D] hover:text-[#F2F5F2]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#25332A]/70">
                {activeMovers.map((stock) => {
                  const positive = stock.changePercent >= 0;
                  return (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => onSelectStock(stock.symbol)}
                      className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-[#151F19] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-semibold text-[#F2F5F2]">
                            {stock.symbol}
                          </span>
                          <span className="text-xs text-[#89968D] truncate">{stock.sector}</span>
                        </div>
                        <p className="text-xs text-[#89968D] truncate mt-0.5">{stock.name}</p>
                      </div>

                      <div className="hidden sm:block">
                        <Sparkline data={stock.sparkline} positive={positive} width={64} height={22} />
                      </div>

                      <div className="text-right shrink-0 w-28">
                        <div className="font-mono text-sm text-[#F2F5F2]">
                          {formatPKR(stock.price)}
                        </div>
                        <div
                          className={`font-mono text-xs inline-flex items-center gap-1 justify-end ${
                            positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{formatPercent(stock.changePercent)}</span>
                        </div>
                      </div>

                      <div className="hidden md:block text-right shrink-0 w-20 font-mono text-xs text-[#89968D]">
                        {formatVolume(stock.volume)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* THE GREENLINE BRIEF (5 cols) */}
            <aside className="lg:col-span-5 rounded-xl surface-glass border border-[#2F4236] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#39E879]">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>AI-Generated Market Intelligence</span>
                  </div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-[#F2F5F2] mt-1">
                    THE GREENLINE BRIEF
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onRefreshBrief}
                  disabled={briefLoading}
                  aria-label={brief ? 'Refresh AI market brief' : 'Generate AI market brief'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151F19] border border-[#25332A] text-xs font-medium text-[#F2F5F2] hover:border-[#39E879]/50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${briefLoading ? 'animate-spin text-[#39E879]' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{briefLoading ? 'Analyzing...' : brief ? 'Refresh' : 'Generate'}</span>
                </button>
              </div>

              {briefLoading && !brief ? (
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-[#19251D] animate-pulse" />
                  <div className="h-14 rounded bg-[#19251D] animate-pulse" />
                  <div className="h-14 rounded bg-[#19251D] animate-pulse" />
                  <div className="h-14 rounded bg-[#19251D] animate-pulse" />
                </div>
              ) : briefError ? (
                <div className="mt-5 rounded-lg bg-[#151F19] border border-[#F06B72]/35 p-4 text-sm text-[#89968D] space-y-3">
                  <p className="text-[#F06B72] font-medium">Brief unavailable</p>
                  <p className="text-xs leading-relaxed">{briefError}</p>
                  <button
                    type="button"
                    onClick={onRefreshBrief}
                    className="px-3 py-1.5 rounded-md bg-[#19251D] text-xs font-medium text-[#F2F5F2] hover:text-[#39E879] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : brief ? (
                <div className="mt-5 space-y-4">
                  <p className="font-display text-sm font-semibold text-[#F2F5F2]">
                    {brief.headline}
                  </p>
                  <ul className="space-y-3">
                    {brief.insights.map((insight, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 text-sm text-[#89968D] leading-relaxed"
                      >
                        <span className="font-mono text-xs text-[#39E879] pt-0.5 shrink-0">
                          0{idx + 1}
                        </span>
                        <span className="text-[#F2F5F2]/90">{insight}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-[#25332A] flex items-center justify-between gap-2 text-xs text-[#89968D]">
                    <span className="font-mono">
                      {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('ai-insights')}
                      className="inline-flex items-center gap-1 text-[#39E879] hover:text-[#8BE9A8] font-medium"
                    >
                      <span>Open Ask GREENLINE</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-[#89968D] leading-relaxed">
                    Synthesize today&apos;s KSE-100 movement, sector leaders, and top PSX movers into
                    three concise Gemini-powered insights.
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onRefreshBrief}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#39E879] text-[#080B09] text-xs font-semibold hover:bg-[#8BE9A8] transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Generate Brief</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('ai-insights')}
                      className="inline-flex items-center gap-1 text-xs text-[#8BE9A8] hover:text-[#39E879] font-medium"
                    >
                      <span>Ask GREENLINE</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Featured PSX Companies */}
        <section
          aria-labelledby="featured-stocks-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
            <div>
              <h2
                id="featured-stocks-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-[#F2F5F2]"
              >
                Featured PSX Companies
              </h2>
              <p className="text-xs text-[#89968D] mt-1">
                Benchmark equities across Banking, Energy, Cement, and Technology.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#39E879] hover:text-[#8BE9A8] transition-colors whitespace-nowrap"
            >
              <span>Browse All {allStocks.length} Companies</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(overview?.featured ?? []).map((stock) => {
              const positive = stock.changePercent >= 0;
              return (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => onSelectStock(stock.symbol)}
                  className="text-left rounded-xl bg-[#101713] border border-[#25332A] hover:border-[#39E879]/55 p-4 transition-colors flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-base font-semibold text-[#F2F5F2]">
                        {stock.symbol}
                      </div>
                      <div className="text-xs text-[#89968D] truncate mt-0.5">{stock.name}</div>
                    </div>
                    <Sparkline data={stock.sparkline} positive={positive} width={56} height={20} />
                  </div>

                  <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-[#25332A]/60">
                    <span className="font-mono text-sm font-medium text-[#F2F5F2]">
                      {formatPKR(stock.price)}
                    </span>
                    <span
                      className={`font-mono text-xs font-medium ${
                        positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Quick Compare Card */}
            <button
              type="button"
              onClick={() => onNavigate('compare')}
              className="text-left rounded-xl bg-[#151F19] border border-[#25332A] hover:border-[#39E879]/55 p-4 transition-colors flex flex-col justify-between gap-4"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8BE9A8]">
                  <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Side-by-Side Analysis</span>
                </div>
                <div className="font-display text-base font-semibold text-[#F2F5F2] mt-2">
                  Compare Two Stocks
                </div>
                <p className="text-xs text-[#89968D] mt-1 leading-relaxed">
                  Evaluate valuation ratios, return curves, and Gemini analysis.
                </p>
              </div>
              <div className="text-xs font-medium text-[#39E879] inline-flex items-center gap-1">
                <span>Open Comparison</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Minimal Editorial Footer */}
      <footer className="border-t border-[#25332A] bg-[#080B09]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="max-w-sm space-y-2.5">
              <Logo />
              <p className="text-xs text-[#89968D] leading-relaxed">
                The Pakistan Market, Decoded. Independent discovery and Gemini-powered financial
                intelligence built for the Pakistan Stock Exchange (PSX).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div className="space-y-2">
                <div className="font-medium text-[#F2F5F2]">Platform</div>
                <ul className="space-y-1.5 text-[#89968D]">
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('markets')}
                      className="hover:text-[#F2F5F2]"
                    >
                      Markets
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('discover')}
                      className="hover:text-[#F2F5F2]"
                    >
                      Discover
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('compare')}
                      className="hover:text-[#F2F5F2]"
                    >
                      Compare
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('watchlist')}
                      className="hover:text-[#F2F5F2]"
                    >
                      Watchlist
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-[#F2F5F2]">About &amp; Integrity</div>
                <p className="text-[#89968D] leading-relaxed">
                  Unless connected to a licensed PSX feed, displayed market figures are clearly
                  labelled illustrative reference data. Not investment advice.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-[#F2F5F2]">Privacy</div>
                <p className="text-[#89968D] leading-relaxed">
                  Your personal watchlist is stored locally in your browser via localStorage. No
                  account or personal tracking required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
