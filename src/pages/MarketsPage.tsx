import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { MarketOverviewResponse, PsxSector, TimeRange } from '../types/market';
import { formatNumber, formatPKR, formatPercent, formatVolume } from '../utils/marketLogic';
import { DataDisclosure } from '../components/DataDisclosure';
import { PriceChart } from '../components/PriceChart';
import { Sparkline } from '../components/Sparkline';

interface MarketsPageProps {
  overview: MarketOverviewResponse | null;
  loading: boolean;
  error: string | null;
  onSelectStock: (symbol: string) => void;
  onSelectSector: (sector: PsxSector) => void;
}

export function MarketsPage({
  overview,
  loading,
  error,
  onSelectStock,
  onSelectSector,
}: MarketsPageProps) {
  const [chartRange, setChartRange] = useState<TimeRange>('1M');

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-[#101713] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-xl bg-[#101713] border border-[#F06B72]/40 p-6 text-sm text-[#F06B72]">
        {error ?? 'Unable to load PSX market dashboard.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F5F2]">
              PSX Markets Overview
            </h1>
            <p className="text-sm text-[#89968D] mt-1">
              Benchmark indices, breadth, sector performance, and active turnover.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[#89968D]">
            <span>Vol: {overview.totalVolumeMillions.toFixed(1)}M shares</span>
            <span aria-hidden="true">·</span>
            <span>Value: PKR {overview.totalValueBillionsPkr.toFixed(1)}B</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#39E879]">{overview.advancersCount} Up</span>
            <span className="text-[#F06B72]">{overview.declinersCount} Down</span>
          </div>
        </div>
        <DataDisclosure meta={overview.meta} />
      </div>

      {/* Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overview.indices.map((idx) => {
          const positive = idx.changePercent >= 0;
          return (
            <div
              key={idx.symbol}
              className="rounded-xl bg-[#101713] border border-[#25332A] p-5 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-[#89968D]">{idx.name}</div>
                  <div className="font-mono text-sm font-semibold text-[#F2F5F2] mt-0.5">
                    {idx.symbol}
                  </div>
                </div>
                <Sparkline data={idx.sparkline} positive={positive} />
              </div>

              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="font-mono text-2xl font-semibold text-[#F2F5F2]">
                  {formatNumber(idx.value, 2)}
                </span>
                <span
                  className={`font-mono text-xs font-medium ${
                    positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                  }`}
                >
                  {positive ? '+' : ''}
                  {formatNumber(idx.change, 2)} ({formatPercent(idx.changePercent)})
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-[#25332A]/70 flex items-center justify-between text-[11px] font-mono text-[#89968D]">
                <span>H: {formatNumber(idx.high, 0)}</span>
                <span>L: {formatNumber(idx.low, 0)}</span>
                <span>Vol: {idx.volumeMillions.toFixed(1)}M</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Large KSE-100 Historical Chart */}
      <PriceChart
        title="KSE-100 Benchmark Index"
        history={overview.kse100History}
        range={chartRange}
        onRangeChange={setChartRange}
        unit="PTS"
        height={360}
      />

      {/* Sector Overview */}
      <section aria-labelledby="sector-overview-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="sector-overview-heading"
            className="font-display text-xl font-semibold text-[#F2F5F2]"
          >
            Sector Performance
          </h2>
          <span className="text-xs text-[#89968D]">Select a sector to filter companies</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {overview.sectors.map((sec) => {
            const positive = sec.changePercent >= 0;
            const barWidth = Math.min(100, Math.max(12, Math.abs(sec.changePercent) * 22));
            return (
              <button
                key={sec.sector}
                type="button"
                onClick={() => onSelectSector(sec.sector)}
                className="text-left rounded-xl bg-[#101713] border border-[#25332A] hover:border-[#39E879]/55 p-4 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-[#F2F5F2]">
                    {sec.sector}
                  </span>
                  <span
                    className={`font-mono text-xs font-medium ${
                      positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                    }`}
                  >
                    {formatPercent(sec.changePercent)}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[#19251D] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      positive ? 'bg-[#39E879]' : 'bg-[#F06B72]'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#89968D]">
                  <span>Top: {sec.topStockSymbol}</span>
                  <span>
                    {sec.advancers}↑ / {sec.decliners}↓
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Movers 3-Column Grid */}
      <section aria-label="Market movers breakdown" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(
          [
            { title: 'Top Gainers', items: overview.gainers, type: 'gainers' },
            { title: 'Top Losers', items: overview.losers, type: 'losers' },
            { title: 'Most Active', items: overview.active, type: 'active' },
          ] as const
        ).map((group) => (
          <div
            key={group.title}
            className="rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden"
          >
            <div className="px-4 py-3.5 border-b border-[#25332A] flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#F2F5F2]">{group.title}</h3>
              {group.type === 'gainers' && (
                <TrendingUp className="w-4 h-4 text-[#39E879]" aria-hidden="true" />
              )}
              {group.type === 'losers' && (
                <TrendingDown className="w-4 h-4 text-[#F06B72]" aria-hidden="true" />
              )}
              {group.type === 'active' && (
                <ArrowUpRight className="w-4 h-4 text-[#8BE9A8]" aria-hidden="true" />
              )}
            </div>

            <div className="divide-y divide-[#25332A]/60">
              {group.items.map((stock) => {
                const positive = stock.changePercent >= 0;
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => onSelectStock(stock.symbol)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#151F19] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-[#F2F5F2]">
                        {stock.symbol}
                      </div>
                      <div className="text-xs text-[#89968D] truncate">{stock.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-[#F2F5F2]">
                        {formatPKR(stock.price)}
                      </div>
                      <div
                        className={`font-mono text-xs ${
                          group.type === 'active'
                            ? 'text-[#89968D]'
                            : positive
                              ? 'text-[#39E879]'
                              : 'text-[#F06B72]'
                        }`}
                      >
                        {group.type === 'active'
                          ? `Vol ${formatVolume(stock.volume)}`
                          : formatPercent(stock.changePercent)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
