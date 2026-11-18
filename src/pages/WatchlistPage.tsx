import { ArrowRight, Bookmark, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type {
  DataSourceMeta,
  PriceAlertRule,
  PriceAlertSide,
  StockSummary,
} from '../types/market';
import { formatPKR, formatPercent, formatVolume } from '../utils/marketLogic';
import { DataDisclosure } from '../components/DataDisclosure';
import { Sparkline } from '../components/Sparkline';
import { WatchlistAlertPanel } from '../components/WatchlistAlertPanel';

interface WatchlistPageProps {
  watchedSymbols: string[];
  allStocks: StockSummary[];
  meta: DataSourceMeta | null;
  priceAlerts: PriceAlertRule[];
  onAddAlert: (symbol: string, side: PriceAlertSide, targetPrice: number) => void;
  onRemoveAlert: (id: string) => void;
  onRearmAlert: (id: string) => void;
  onSelectStock: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onExploreDiscover: () => void;
}

export function WatchlistPage({
  watchedSymbols,
  allStocks,
  meta,
  priceAlerts,
  onAddAlert,
  onRemoveAlert,
  onRearmAlert,
  onSelectStock,
  onRemoveSymbol,
  onExploreDiscover,
}: WatchlistPageProps) {
  const watchedStocks = useMemo(() => {
    const map = new Map(allStocks.map((s) => [s.symbol, s]));
    return watchedSymbols
      .map((sym) => map.get(sym))
      .filter((item): item is StockSummary => Boolean(item));
  }, [watchedSymbols, allStocks]);

  const activeAlertsCount = useMemo(
    () => priceAlerts.filter((a) => a.active).length,
    [priceAlerts]
  );
  const triggeredAlertsCount = useMemo(
    () => priceAlerts.filter((a) => !a.active && a.triggeredAt !== null).length,
    [priceAlerts]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F5F2]">
              Personal Watchlist
            </h1>
            <p className="text-sm text-[#89968D] mt-1">
              Saved PSX companies and target buy/sell price alerts persisted locally in your browser.
            </p>
          </div>
          {watchedStocks.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[#89968D]">
                <span>
                  Armed <strong className="text-[#F2F5F2]">{activeAlertsCount}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Triggered <strong className="text-[#39E879]">{triggeredAlertsCount}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onExploreDiscover}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#39E879] hover:text-[#8BE9A8]"
              >
                <span>Add more stocks</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <DataDisclosure meta={meta} />
      </div>

      {watchedStocks.length === 0 ? (
        <div className="rounded-xl bg-[#101713] border border-[#25332A] p-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#151F19] border border-[#25332A] text-[#39E879] mx-auto">
            <Bookmark className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-lg font-semibold text-[#F2F5F2]">
              Your watchlist is empty
            </h2>
            <p className="text-sm text-[#89968D] leading-relaxed">
              Save PSX companies like HBL, MEBL, OGDC, or SYS from Discover or any stock profile to
              monitor prices and configure buy/sell target alerts here.
            </p>
          </div>
          <button
            type="button"
            onClick={onExploreDiscover}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] transition-colors"
          >
            <span>Discover PSX Stocks</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden">
          <div className="divide-y divide-[#25332A]/70">
            {watchedStocks.map((stock) => {
              const positive = stock.changePercent >= 0;
              const stockAlerts = priceAlerts.filter((a) => a.symbol === stock.symbol);
              return (
                <div
                  key={stock.symbol}
                  className="px-5 py-4 hover:bg-[#151F19]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => onSelectStock(stock.symbol)}
                      className="flex-1 min-w-0 text-left flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-base font-semibold text-[#F2F5F2]">
                            {stock.symbol}
                          </span>
                          <span className="text-xs text-[#89968D] truncate">{stock.sector}</span>
                        </div>
                        <p className="text-xs text-[#89968D] truncate mt-0.5">{stock.name}</p>
                      </div>

                      <div className="hidden sm:block">
                        <Sparkline
                          data={stock.sparkline}
                          positive={positive}
                          width={72}
                          height={24}
                        />
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-medium text-[#F2F5F2]">
                          {formatPKR(stock.price)}
                        </div>
                        <div
                          className={`font-mono text-xs ${
                            positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                          }`}
                        >
                          {formatPercent(stock.changePercent)} · Vol {formatVolume(stock.volume)}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveSymbol(stock.symbol)}
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                      className="p-2 rounded-lg border border-[#25332A] text-[#89968D] hover:text-[#F06B72] hover:border-[#F06B72]/50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <WatchlistAlertPanel
                    symbol={stock.symbol}
                    currentPrice={stock.price}
                    alerts={stockAlerts}
                    onAddAlert={onAddAlert}
                    onRemoveAlert={onRemoveAlert}
                    onRearmAlert={onRearmAlert}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
