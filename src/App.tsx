import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AiBriefResponse,
  DiscoveryCategory,
  MarketNotification,
  MarketOverviewResponse,
  PsxSector,
  StockSummary,
} from './types/market';
import type { RoutePage } from './types/navigation';
import { marketApi } from './services/api';
import {
  applySessionTick,
  evaluatePriceAlerts,
  formatPKR,
  formatPercent,
  sortMovers,
} from './utils/marketLogic';
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { useWatchlist } from './hooks/useWatchlist';
import { AppShell } from './components/AppShell';
import { NotificationCenter } from './components/NotificationCenter';
import { AiInsightsPage } from './pages/AiInsightsPage';
import { ComparePage } from './pages/ComparePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { LandingPage } from './pages/LandingPage';
import { MarketsPage } from './pages/MarketsPage';
import { StockProfilePage } from './pages/StockProfilePage';
import { WatchlistPage } from './pages/WatchlistPage';

interface RouteState {
  page: RoutePage;
  stockSymbol: string;
}

function parseLocationPath(pathname: string): RouteState {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/home') {
    return { page: 'home', stockSymbol: 'HBL' };
  }
  if (clean === '/markets') return { page: 'markets', stockSymbol: 'HBL' };
  if (clean === '/discover') return { page: 'discover', stockSymbol: 'HBL' };
  if (clean === '/compare') return { page: 'compare', stockSymbol: 'HBL' };
  if (clean === '/watchlist') return { page: 'watchlist', stockSymbol: 'HBL' };
  if (clean === '/ai-insights') return { page: 'ai-insights', stockSymbol: 'HBL' };
  if (clean.startsWith('/stock/')) {
    const sym = decodeURIComponent(clean.slice('/stock/'.length)).toUpperCase();
    return { page: 'stock', stockSymbol: sym || 'HBL' };
  }
  return { page: 'home', stockSymbol: 'HBL' };
}

function pathForRoute(state: RouteState): string {
  switch (state.page) {
    case 'home':
      return '/';
    case 'stock':
      return `/stock/${encodeURIComponent(state.stockSymbol)}`;
    default:
      return `/${state.page}`;
  }
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseLocationPath(window.location.pathname)
  );
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [allStocks, setAllStocks] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [brief, setBrief] = useState<AiBriefResponse | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverSector, setDiscoverSector] = useState<PsxSector | 'All'>('All');
  const [discoverCategory, setDiscoverCategory] = useState<DiscoveryCategory>('all');
  const [compareSeedA, setCompareSeedA] = useState('HBL');
  const [compareSeedB, setCompareSeedB] = useState('MEBL');

  const [notifications, setNotifications] = useState<MarketNotification[]>([]);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [activeToast, setActiveToast] = useState<MarketNotification | null>(null);
  const tickCounterRef = useRef(0);
  const stocksRef = useRef<StockSummary[]>([]);

  const {
    symbols: watchedSymbols,
    toggle: toggleWatchlist,
    remove: removeWatchlist,
    isWatched,
  } = useWatchlist();
  const {
    alerts: priceAlertRules,
    addAlert,
    removeAlert,
    rearmAlert,
    removeAlertsForSymbol,
    replaceAlerts,
  } = usePriceAlerts();

  useEffect(() => {
    stocksRef.current = allStocks;
  }, [allStocks]);

  const navigate = useCallback((next: RouteState) => {
    setRoute(next);
    const nextUrl = pathForRoute(next);
    if (window.location.pathname !== nextUrl) {
      window.history.pushState(next, '', nextUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigatePage = useCallback(
    (page: RoutePage) => {
      navigate({ page, stockSymbol: route.stockSymbol });
    },
    [navigate, route.stockSymbol]
  );

  const selectStock = useCallback(
    (symbol: string) => {
      navigate({ page: 'stock', stockSymbol: symbol.toUpperCase() });
    },
    [navigate]
  );

  const handleSearchQuerySubmit = useCallback(
    (query: string) => {
      setDiscoverQuery(query);
      setDiscoverSector('All');
      setDiscoverCategory('all');
      navigate({ page: 'discover', stockSymbol: route.stockSymbol });
    },
    [navigate, route.stockSymbol]
  );

  const handleSelectSector = useCallback(
    (sector: PsxSector) => {
      setDiscoverSector(sector);
      setDiscoverCategory('all');
      setDiscoverQuery('');
      navigate({ page: 'discover', stockSymbol: route.stockSymbol });
    },
    [navigate, route.stockSymbol]
  );

  const handleCompareWith = useCallback(
    (symbol: string) => {
      const normalized = symbol.toUpperCase();
      setCompareSeedA(normalized);
      setCompareSeedB((prevB) =>
        prevB === normalized ? (normalized === 'MEBL' ? 'HBL' : 'MEBL') : prevB
      );
      navigate({ page: 'compare', stockSymbol: normalized });
    },
    [navigate]
  );

  const fetchBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const result = await marketApi.generateBrief();
      setBrief(result);
    } catch (err) {
      setBriefError(
        err instanceof Error ? err.message : 'Unable to generate AI market brief.'
      );
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseLocationPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([marketApi.getOverview(), marketApi.getStocks()])
      .then(([overviewRes, stocksRes]) => {
        if (!cancelled) {
          setOverview(overviewRes);
          setAllStocks(stocksRes.stocks);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PSX market data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const runSessionUpdate = useCallback(() => {
    const prevStocks = stocksRef.current;
    if (prevStocks.length === 0) return;

    const tickIdx = tickCounterRef.current;
    tickCounterRef.current += 1;

    const { updatedStocks, changedMovers } = applySessionTick(prevStocks, tickIdx);
    if (changedMovers.length === 0) return;

    stocksRef.current = updatedStocks;
    setAllStocks(updatedStocks);

    const movers = sortMovers(updatedStocks, 5);
    setOverview((prevOv) => {
      if (!prevOv) return prevOv;
      const adv = updatedStocks.filter((s) => s.changePercent > 0).length;
      const dec = updatedStocks.filter((s) => s.changePercent < 0).length;
      return {
        ...prevOv,
        gainers: movers.gainers,
        losers: movers.losers,
        active: movers.active,
        featured: updatedStocks.filter((s) => s.featured),
        advancersCount: adv,
        declinersCount: dec,
        unchangedCount: updatedStocks.length - adv - dec,
      };
    });

    const nowIso = new Date().toISOString();
    const topMover = [...changedMovers].sort(
      (a, b) => Math.abs(b.tickDeltaPct) - Math.abs(a.tickDeltaPct)
    )[0];

    if (topMover) {
      const isWatch = isWatched(topMover.stock.symbol);
      const dirWord = topMover.tickDeltaPct >= 0 ? 'rose' : 'dipped';
      const note: MarketNotification = {
        id: `tick-${tickIdx}-${topMover.stock.symbol}-${Date.now()}`,
        symbol: topMover.stock.symbol,
        title: `${topMover.stock.symbol} ${dirWord} ${formatPercent(topMover.tickDeltaPct)}`,
        detail: `${topMover.stock.name} moved to ${formatPKR(topMover.stock.price)}`,
        deltaPercent: topMover.tickDeltaPct,
        price: topMover.stock.price,
        timestamp: nowIso,
        read: false,
        isWatchlist: isWatch,
      };
      setNotifications((prev) => [note, ...prev].slice(0, 20));
      setActiveToast(note);
    }
  }, [isWatched]);

  useEffect(() => {
    if (!liveEnabled || loading || allStocks.length === 0) return;
    const timer = window.setInterval(() => {
      runSessionUpdate();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [liveEnabled, loading, allStocks.length, runSessionUpdate]);

  useEffect(() => {
    if (!activeToast) return;
    const timeout = window.setTimeout(() => setActiveToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [activeToast]);

  // Evaluate user-configured watchlist price alerts against live stock prices
  useEffect(() => {
    if (allStocks.length === 0 || priceAlertRules.length === 0) return;
    const nowIso = new Date().toISOString();
    const { nextAlerts, triggered } = evaluatePriceAlerts(
      priceAlertRules,
      allStocks,
      nowIso
    );
    if (triggered.length === 0) return;

    replaceAlerts(nextAlerts);

    const newNotifications: MarketNotification[] = triggered.map(({ alert, stock }, idx) => {
      const isBuy = alert.side === 'buy';
      const actionText = isBuy ? 'Buy target reached' : 'Sell target reached';
      return {
        id: `price-alert-${alert.id}-${Date.now()}-${idx}`,
        symbol: stock.symbol,
        title: `${stock.symbol} ${actionText}`,
        detail: `${actionText} (${isBuy ? '<=' : '>='} ${formatPKR(alert.targetPrice)}) — live ${formatPKR(stock.price)}`,
        deltaPercent: stock.changePercent,
        price: stock.price,
        timestamp: nowIso,
        read: false,
        isWatchlist: true,
        alertKind: isBuy ? 'buy-target' : 'sell-target',
      };
    });

    setNotifications((prev) => [...newNotifications, ...prev].slice(0, 25));
    setActiveToast(newNotifications[0]);
  }, [allStocks, priceAlertRules, replaceAlerts]);

  const notificationControl = (
    <NotificationCenter
      notifications={notifications}
      liveEnabled={liveEnabled}
      dataMode={overview?.meta.dataMode ?? 'illustrative'}
      onToggleLive={() => setLiveEnabled((v) => !v)}
      onTriggerSampleTick={runSessionUpdate}
      onMarkAllRead={() =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
      onClearAll={() => {
        setNotifications([]);
        setActiveToast(null);
      }}
      onSelectStock={selectStock}
    />
  );

  const toastElement = activeToast ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-xs w-full rounded-xl surface-glass-elevated border border-[#32463A] p-3.5 flex items-start justify-between gap-3"
    >
      <button
        type="button"
        onClick={() => {
          setActiveToast(null);
          selectStock(activeToast.symbol);
        }}
        className="text-left min-w-0 flex-1"
      >
        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
          <span className="text-[#F2F5F2]">{activeToast.symbol}</span>
          {activeToast.alertKind === 'buy-target' && (
            <span className="text-[10px] text-[#39E879]">BUY TARGET</span>
          )}
          {activeToast.alertKind === 'sell-target' && (
            <span className="text-[10px] text-[#8BE9A8]">SELL TARGET</span>
          )}
          <span
            className={
              activeToast.deltaPercent >= 0 ? 'text-[#39E879]' : 'text-[#F06B72]'
            }
          >
            {formatPercent(activeToast.deltaPercent)}
          </span>
        </div>
        <p className="text-xs text-[#89968D] mt-0.5 line-clamp-2">{activeToast.detail}</p>
      </button>
      <button
        type="button"
        onClick={() => setActiveToast(null)}
        aria-label="Dismiss live price notification"
        className="text-[#89968D] hover:text-[#F2F5F2] p-0.5 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : null;

  if (route.page === 'home') {
    return (
      <>
        <LandingPage
          overview={overview}
          allStocks={allStocks}
          loading={loading}
          error={error}
          brief={brief}
          briefLoading={briefLoading}
          briefError={briefError}
          onRefreshBrief={fetchBrief}
          onNavigate={navigatePage}
          onSelectStock={selectStock}
          onSearchQuerySubmit={handleSearchQuerySubmit}
          watchlistCount={watchedSymbols.length}
          notificationSlot={notificationControl}
        />
        {toastElement}
      </>
    );
  }

  return (
    <>
      <AppShell
        currentPage={route.page}
        onNavigate={navigatePage}
        onSelectStock={selectStock}
        onSearchQuerySubmit={handleSearchQuerySubmit}
        stocks={allStocks}
        watchlistCount={watchedSymbols.length}
        meta={overview?.meta ?? null}
        notificationSlot={notificationControl}
      >
      {route.page === 'markets' && (
        <MarketsPage
          overview={overview}
          loading={loading}
          error={error}
          onSelectStock={selectStock}
          onSelectSector={handleSelectSector}
        />
      )}

      {route.page === 'discover' && (
        <DiscoverPage
          allStocks={allStocks}
          loading={loading}
          meta={overview?.meta ?? null}
          query={discoverQuery}
          onQueryChange={setDiscoverQuery}
          sector={discoverSector}
          onSectorChange={setDiscoverSector}
          category={discoverCategory}
          onCategoryChange={setDiscoverCategory}
          onSelectStock={selectStock}
          isWatched={isWatched}
          onToggleWatchlist={toggleWatchlist}
        />
      )}

      {route.page === 'stock' && (() => {
        const liveMatch = allStocks.find((s) => s.symbol === route.stockSymbol);
        return (
          <StockProfilePage
            symbol={route.stockSymbol}
            meta={overview?.meta ?? null}
            liveStockPrice={liveMatch?.price}
            liveChange={liveMatch?.change}
            liveChangePercent={liveMatch?.changePercent}
            isWatched={isWatched(route.stockSymbol)}
            priceAlerts={priceAlertRules.filter((a) => a.symbol === route.stockSymbol)}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onRearmAlert={rearmAlert}
            onToggleWatchlist={(sym) => {
              if (isWatched(sym)) {
                removeAlertsForSymbol(sym);
              }
              toggleWatchlist(sym);
            }}
            onBack={() => navigatePage('discover')}
            onCompareWith={handleCompareWith}
          />
        );
      })()}

      {route.page === 'compare' && (
        <ComparePage
          allStocks={allStocks}
          meta={overview?.meta ?? null}
          initialSymbolA={compareSeedA}
          initialSymbolB={compareSeedB}
          onSelectStock={selectStock}
        />
      )}

      {route.page === 'watchlist' && (
        <WatchlistPage
          watchedSymbols={watchedSymbols}
          allStocks={allStocks}
          meta={overview?.meta ?? null}
          priceAlerts={priceAlertRules}
          onAddAlert={addAlert}
          onRemoveAlert={removeAlert}
          onRearmAlert={rearmAlert}
          onSelectStock={selectStock}
          onRemoveSymbol={(sym) => {
            removeWatchlist(sym);
            removeAlertsForSymbol(sym);
          }}
          onExploreDiscover={() => navigatePage('discover')}
        />
      )}

      {route.page === 'ai-insights' && (
        <AiInsightsPage
          overview={overview}
          meta={overview?.meta ?? null}
          brief={brief}
          briefLoading={briefLoading}
          briefError={briefError}
          onRefreshBrief={fetchBrief}
        />
      )}
    </AppShell>
    {toastElement}
    </>
  );
}
