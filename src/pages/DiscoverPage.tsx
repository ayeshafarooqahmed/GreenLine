import { Bookmark, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import type {
  DataSourceMeta,
  DiscoveryCategory,
  PsxSector,
  StockSummary,
} from '../types/market';
import {
  filterStocks,
  formatMarketCap,
  formatNumber,
  formatPKR,
  formatPercent,
  formatVolume,
} from '../utils/marketLogic';
import { DataDisclosure } from '../components/DataDisclosure';
import { Sparkline } from '../components/Sparkline';

const CATEGORIES: { id: DiscoveryCategory; label: string }[] = [
  { id: 'all', label: 'All Stocks' },
  { id: 'trending', label: 'Trending' },
  { id: 'gainers', label: 'Biggest Gainers' },
  { id: 'losers', label: 'Biggest Losers' },
  { id: 'active', label: 'Most Active' },
  { id: 'banking', label: 'Banking' },
  { id: 'technology', label: 'Technology' },
  { id: 'energy', label: 'Energy' },
  { id: 'dividend', label: 'Dividend-Focused' },
];

const SECTORS: (PsxSector | 'All')[] = [
  'All',
  'Banking',
  'Technology',
  'Cement',
  'Oil and Gas',
  'Fertilizer',
  'Power and Energy',
  'Pharmaceuticals',
  'Automobile',
];

interface DiscoverPageProps {
  allStocks: StockSummary[];
  loading: boolean;
  meta: DataSourceMeta | null;
  query: string;
  onQueryChange: (q: string) => void;
  sector: PsxSector | 'All';
  onSectorChange: (sector: PsxSector | 'All') => void;
  category: DiscoveryCategory;
  onCategoryChange: (category: DiscoveryCategory) => void;
  onSelectStock: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
  onToggleWatchlist: (symbol: string) => void;
}

export function DiscoverPage({
  allStocks,
  loading,
  meta,
  query,
  onQueryChange,
  sector,
  onSectorChange,
  category,
  onCategoryChange,
  onSelectStock,
  isWatched,
  onToggleWatchlist,
}: DiscoverPageProps) {
  const filtered = useMemo(
    () => filterStocks(allStocks, { query, sector, category }),
    [allStocks, query, sector, category]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F5F2]">
            Discover PSX Equities
          </h1>
          <p className="text-sm text-[#89968D] mt-1">
            Search and filter companies listed on the Pakistan Stock Exchange.
          </p>
        </div>
        <DataDisclosure meta={meta} />
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <label htmlFor="discover-search" className="sr-only">
              Filter stocks by name or ticker symbol
            </label>
            <Search
              className="pointer-events-none w-4 h-4 text-[#89968D] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="discover-search"
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Filter by company name, ticker (HBL, MEBL, OGDC), or sector..."
              className="w-full h-11 pl-10 pr-10 rounded-lg bg-[#101713] border border-[#25332A] text-sm text-[#F2F5F2] placeholder-[#89968D] focus:outline-none focus:border-[#39E879]"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear filter query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#89968D] hover:text-[#F2F5F2]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="w-full md:w-56">
            <label htmlFor="discover-sector-select" className="sr-only">
              Filter by PSX sector
            </label>
            <select
              id="discover-sector-select"
              value={sector}
              onChange={(e) => onSectorChange(e.target.value as PsxSector | 'All')}
              className="w-full h-11 px-3.5 rounded-lg bg-[#101713] border border-[#25332A] text-sm text-[#F2F5F2] focus:outline-none focus:border-[#39E879]"
            >
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All' ? 'All Sectors' : sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Discovery Categories */}
        <div
          role="group"
          aria-label="Discovery categories"
          className="flex flex-wrap items-center gap-2"
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#19251D] border-[#39E879]/60 text-[#39E879]'
                    : 'bg-[#101713] border-[#25332A] text-[#89968D] hover:text-[#F2F5F2]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#89968D]">
        <span>
          Showing <strong className="font-mono text-[#F2F5F2]">{filtered.length}</strong> PSX
          companies
        </span>
        {(query || sector !== 'All' || category !== 'all') && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              onSectorChange('All');
              onCategoryChange('all');
            }}
            className="text-[#39E879] hover:text-[#8BE9A8] font-medium"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Loading / Empty / Results */}
      {loading && allStocks.length === 0 ? (
        <div className="rounded-xl bg-[#101713] border border-[#25332A] p-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-11 rounded bg-[#151F19] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-[#101713] border border-[#25332A] p-10 text-center space-y-3">
          <p className="font-display text-base font-semibold text-[#F2F5F2]">
            No matching PSX equities found
          </p>
          <p className="text-sm text-[#89968D]">
            Try clearing your sector filter or searching for symbols like HBL, MEBL, OGDC, or SYS.
          </p>
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              onSectorChange('All');
              onCategoryChange('all');
            }}
            className="px-4 py-2 rounded-lg bg-[#39E879] text-[#080B09] text-xs font-semibold hover:bg-[#8BE9A8] transition-colors"
          >
            Show All Companies
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#25332A] text-[11px] uppercase tracking-wider text-[#89968D]">
                  <th className="py-3.5 px-5 font-medium">Company</th>
                  <th className="py-3.5 px-4 font-medium">Sector</th>
                  <th className="py-3.5 px-4 font-medium text-right">Price</th>
                  <th className="py-3.5 px-4 font-medium text-right">Daily Change</th>
                  <th className="py-3.5 px-4 font-medium text-right">Trend</th>
                  <th className="py-3.5 px-4 font-medium text-right">Mkt Cap</th>
                  <th className="py-3.5 px-4 font-medium text-right">P/E</th>
                  <th className="py-3.5 px-4 font-medium text-right">Volume</th>
                  <th className="py-3.5 px-5 font-medium text-right">Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25332A]/60 text-sm">
                {filtered.map((stock) => {
                  const positive = stock.changePercent >= 0;
                  const watched = isWatched(stock.symbol);
                  return (
                    <tr
                      key={stock.symbol}
                      className="hover:bg-[#151F19] transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => onSelectStock(stock.symbol)}
                          className="text-left focus:outline-none focus-visible:underline"
                        >
                          <div className="font-mono font-semibold text-[#F2F5F2] group-hover:text-[#39E879] transition-colors">
                            {stock.symbol}
                          </div>
                          <div className="text-xs text-[#89968D]">{stock.name}</div>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#89968D]">{stock.sector}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#F2F5F2]">
                        {formatPKR(stock.price)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono ${
                          positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                        }`}
                      >
                        {formatPercent(stock.changePercent)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex justify-end">
                          <Sparkline
                            data={stock.sparkline}
                            positive={positive}
                            width={56}
                            height={20}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#89968D]">
                        {formatMarketCap(stock.marketCapBillionsPkr)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#89968D]">
                        {stock.peRatio !== null ? formatNumber(stock.peRatio, 2) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#89968D]">
                        {formatVolume(stock.volume)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(stock.symbol)}
                          aria-label={
                            watched
                              ? `Remove ${stock.symbol} from watchlist`
                              : `Add ${stock.symbol} to watchlist`
                          }
                          aria-pressed={watched}
                          className={`p-2 rounded-lg border transition-colors ${
                            watched
                              ? 'bg-[#19251D] border-[#39E879]/50 text-[#39E879]'
                              : 'bg-transparent border-[#25332A] text-[#89968D] hover:text-[#F2F5F2]'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" fill={watched ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filtered.map((stock) => {
              const positive = stock.changePercent >= 0;
              const watched = isWatched(stock.symbol);
              return (
                <div
                  key={stock.symbol}
                  className="rounded-xl bg-[#101713] border border-[#25332A] p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStock(stock.symbol)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[#F2F5F2]">
                        {stock.symbol}
                      </span>
                      <span className="text-xs text-[#89968D] truncate">{stock.sector}</span>
                    </div>
                    <p className="text-xs text-[#89968D] truncate mt-0.5">{stock.name}</p>
                  </button>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-[#F2F5F2]">
                      {formatPKR(stock.price)}
                    </div>
                    <div
                      className={`font-mono text-xs ${
                        positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(stock.symbol)}
                    aria-label={
                      watched
                        ? `Remove ${stock.symbol} from watchlist`
                        : `Add ${stock.symbol} to watchlist`
                    }
                    aria-pressed={watched}
                    className={`p-2 rounded-lg border shrink-0 ${
                      watched
                        ? 'bg-[#19251D] border-[#39E879]/50 text-[#39E879]'
                        : 'border-[#25332A] text-[#89968D]'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" fill={watched ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
