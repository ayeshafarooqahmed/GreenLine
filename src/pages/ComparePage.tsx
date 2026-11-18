import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AiComparisonResponse,
  DataSourceMeta,
  StockDetail,
  StockSummary,
  TimeRange,
} from '../types/market';
import { marketApi } from '../services/api';
import {
  buildComparisonSeries,
  formatMarketCap,
  formatNumber,
  formatPKR,
  formatPercent,
  formatVolume,
} from '../utils/marketLogic';
import { ComparisonChart } from '../components/ComparisonChart';
import { DataDisclosure } from '../components/DataDisclosure';

const COMPARE_RANGES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

interface ComparePageProps {
  allStocks: StockSummary[];
  meta: DataSourceMeta | null;
  initialSymbolA: string;
  initialSymbolB: string;
  onSelectStock: (symbol: string) => void;
}

export function ComparePage({
  allStocks,
  meta,
  initialSymbolA,
  initialSymbolB,
  onSelectStock,
}: ComparePageProps) {
  const [symbolA, setSymbolA] = useState(initialSymbolA || 'HBL');
  const [symbolB, setSymbolB] = useState(initialSymbolB || 'MEBL');
  const [stockA, setStockA] = useState<StockDetail | null>(null);
  const [stockB, setStockB] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [range, setRange] = useState<TimeRange>('6M');
  const [chartMode, setChartMode] = useState<'percent' | 'price'>('percent');

  const [aiResult, setAiResult] = useState<AiComparisonResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSymbolA) setSymbolA(initialSymbolA);
  }, [initialSymbolA]);

  useEffect(() => {
    if (initialSymbolB) setSymbolB(initialSymbolB);
  }, [initialSymbolB]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setAiResult(null);
    setAiError(null);

    Promise.all([marketApi.getStockBySymbol(symbolA), marketApi.getStockBySymbol(symbolB)])
      .then(([resA, resB]) => {
        if (!cancelled) {
          setStockA(resA.stock);
          setStockB(resB.stock);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Unable to load selected stocks for comparison.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbolA, symbolB, reloadNonce]);

  const effectiveStockA = useMemo(() => {
    if (!stockA) return null;
    const live = allStocks.find((s) => s.symbol === stockA.symbol);
    if (!live) return stockA;
    return {
      ...stockA,
      price: live.price,
      change: live.change,
      changePercent: live.changePercent,
      financials: { ...stockA.financials, volume: live.volume },
    };
  }, [stockA, allStocks]);

  const effectiveStockB = useMemo(() => {
    if (!stockB) return null;
    const live = allStocks.find((s) => s.symbol === stockB.symbol);
    if (!live) return stockB;
    return {
      ...stockB,
      price: live.price,
      change: live.change,
      changePercent: live.changePercent,
      financials: { ...stockB.financials, volume: live.volume },
    };
  }, [stockB, allStocks]);

  const chartSeries = useMemo(() => {
    if (!effectiveStockA || !effectiveStockB) return [];
    return buildComparisonSeries(
      effectiveStockA.history[range],
      effectiveStockB.history[range],
      chartMode
    );
  }, [effectiveStockA, effectiveStockB, range, chartMode]);

  const handleGenerateComparison = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await marketApi.compareStocks(symbolA, symbolB);
      setAiResult(res);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI comparison.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSwap = () => {
    setSymbolA(symbolB);
    setSymbolB(symbolA);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F5F2]">
            Compare PSX Stocks
          </h1>
          <p className="text-sm text-[#89968D] mt-1">
            Contrast price trajectories, valuation multiples, and AI-synthesized trade-offs.
          </p>
        </div>
        <DataDisclosure meta={meta} />
      </div>

      {/* Company Selectors */}
      <div className="rounded-xl bg-[#101713] border border-[#25332A] p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="compare-select-a" className="block text-xs font-medium text-[#8BE9A8]">
              Company A
            </label>
            <select
              id="compare-select-a"
              value={symbolA}
              onChange={(e) => setSymbolA(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[#080B09] border border-[#25332A] text-sm text-[#F2F5F2] focus:outline-none focus:border-[#39E879]"
            >
              {allStocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name} ({s.sector})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap compared companies"
            className="h-11 px-3.5 rounded-lg bg-[#151F19] border border-[#25332A] text-[#89968D] hover:text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors inline-flex items-center justify-center"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="space-y-1.5">
            <label htmlFor="compare-select-b" className="block text-xs font-medium text-[#F2F5F2]">
              Company B
            </label>
            <select
              id="compare-select-b"
              value={symbolB}
              onChange={(e) => setSymbolB(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[#080B09] border border-[#25332A] text-sm text-[#F2F5F2] focus:outline-none focus:border-[#39E879]"
            >
              {allStocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name} ({s.sector})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {symbolA === symbolB && (
        <div
          role="status"
          className="rounded-xl bg-[#151F19] border border-[#2F4236] px-4 py-3 text-xs text-[#8BE9A8]"
        >
          Same security ({symbolA}) selected in both slots. Choose two distinct PSX symbols to contrast performance.
        </div>
      )}

      {fetchError ? (
        <div className="rounded-xl bg-[#101713] border border-[#F06B72]/40 p-6 space-y-3">
          <p className="text-sm text-[#F06B72]">{fetchError}</p>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="px-4 py-2 rounded-lg bg-[#19251D] border border-[#25332A] text-xs font-medium text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors"
          >
            Retry Comparison Load
          </button>
        </div>
      ) : loading || !effectiveStockA || !effectiveStockB ? (
        <div className="h-96 rounded-xl bg-[#101713] border border-[#25332A] animate-pulse" />
      ) : (
        <>
          {/* Side-by-side Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[effectiveStockA, effectiveStockB].map((s, idx) => {
              const positive = s.changePercent >= 0;
              return (
                <button
                  key={`${s.symbol}-${idx}`}
                  type="button"
                  onClick={() => onSelectStock(s.symbol)}
                  className="text-left rounded-xl bg-[#101713] border border-[#25332A] hover:border-[#39E879]/50 p-5 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#89968D]">
                      <span
                        className={`font-mono font-semibold ${
                          idx === 0 ? 'text-[#39E879]' : 'text-[#F2F5F2]'
                        }`}
                      >
                        {s.symbol}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{s.sector}</span>
                    </div>
                    <div className="font-display text-lg font-semibold text-[#F2F5F2] truncate mt-1">
                      {s.name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xl font-semibold text-[#F2F5F2]">
                      {formatPKR(s.price)}
                    </div>
                    <div
                      className={`font-mono text-xs font-medium ${
                        positive ? 'text-[#39E879]' : 'text-[#F06B72]'
                      }`}
                    >
                      {formatPercent(s.changePercent)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Historical Comparison Chart */}
          <div className="rounded-xl bg-[#101713] border border-[#25332A] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#F2F5F2]">
                  Performance Comparison ({effectiveStockA.symbol} vs {effectiveStockB.symbol})
                </h2>
                <p className="text-xs text-[#89968D] mt-0.5">
                  {chartMode === 'percent'
                    ? 'Normalized percentage return from start of selected window'
                    : 'Absolute share price trajectory in PKR'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#080B09] border border-[#25332A]">
                  <button
                    type="button"
                    onClick={() => setChartMode('percent')}
                    aria-pressed={chartMode === 'percent'}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      chartMode === 'percent'
                        ? 'bg-[#19251D] text-[#39E879]'
                        : 'text-[#89968D] hover:text-[#F2F5F2]'
                    }`}
                  >
                    % Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('price')}
                    aria-pressed={chartMode === 'price'}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      chartMode === 'price'
                        ? 'bg-[#19251D] text-[#39E879]'
                        : 'text-[#89968D] hover:text-[#F2F5F2]'
                    }`}
                  >
                    PKR Price
                  </button>
                </div>

                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#080B09] border border-[#25332A]">
                  {COMPARE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={`px-2.5 py-1 rounded-md font-mono text-xs ${
                        range === r
                          ? 'bg-[#19251D] text-[#39E879]'
                          : 'text-[#89968D] hover:text-[#F2F5F2]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ComparisonChart
              data={chartSeries}
              symbolA={effectiveStockA.symbol}
              symbolB={effectiveStockB.symbol}
              mode={chartMode}
            />
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl bg-[#101713] border border-[#25332A] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#25332A]">
              <h2 className="font-display text-lg font-semibold text-[#F2F5F2]">
                Financial Metrics Comparison
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#25332A] text-xs uppercase tracking-wider text-[#89968D]">
                    <th className="py-3 px-5 font-medium">Metric</th>
                    <th className="py-3 px-5 font-mono font-semibold text-[#39E879] text-right">
                      {effectiveStockA.symbol}
                    </th>
                    <th className="py-3 px-5 font-mono font-semibold text-[#F2F5F2] text-right">
                      {effectiveStockB.symbol}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25332A]/60 text-sm">
                  {[
                    {
                      label: 'Current Price',
                      a: formatPKR(effectiveStockA.price),
                      b: formatPKR(effectiveStockB.price),
                    },
                    {
                      label: 'Daily Change',
                      a: formatPercent(effectiveStockA.changePercent),
                      b: formatPercent(effectiveStockB.changePercent),
                    },
                    {
                      label: 'Market Cap',
                      a: formatMarketCap(effectiveStockA.financials.marketCapBillionsPkr),
                      b: formatMarketCap(effectiveStockB.financials.marketCapBillionsPkr),
                    },
                    {
                      label: 'P/E Ratio',
                      a:
                        effectiveStockA.financials.peRatio !== null
                          ? formatNumber(effectiveStockA.financials.peRatio, 2)
                          : 'N/A',
                      b:
                        effectiveStockB.financials.peRatio !== null
                          ? formatNumber(effectiveStockB.financials.peRatio, 2)
                          : 'N/A',
                    },
                    {
                      label: 'EPS',
                      a:
                        effectiveStockA.financials.epsPkr !== null
                          ? formatPKR(effectiveStockA.financials.epsPkr)
                          : 'N/A',
                      b:
                        effectiveStockB.financials.epsPkr !== null
                          ? formatPKR(effectiveStockB.financials.epsPkr)
                          : 'N/A',
                    },
                    {
                      label: 'Dividend Yield',
                      a:
                        effectiveStockA.financials.dividendYieldPercent !== null
                          ? `${effectiveStockA.financials.dividendYieldPercent.toFixed(2)}%`
                          : 'N/A',
                      b:
                        effectiveStockB.financials.dividendYieldPercent !== null
                          ? `${effectiveStockB.financials.dividendYieldPercent.toFixed(2)}%`
                          : 'N/A',
                    },
                    {
                      label: '52-Week Range',
                      a: `${formatNumber(effectiveStockA.financials.week52Low, 1)} – ${formatNumber(effectiveStockA.financials.week52High, 1)}`,
                      b: `${formatNumber(effectiveStockB.financials.week52Low, 1)} – ${formatNumber(effectiveStockB.financials.week52High, 1)}`,
                    },
                    {
                      label: 'Trading Volume',
                      a: formatVolume(effectiveStockA.financials.volume),
                      b: formatVolume(effectiveStockB.financials.volume),
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-[#151F19]/60">
                      <td className="py-3.5 px-5 text-[#89968D]">{row.label}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-[#F2F5F2]">{row.a}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-[#F2F5F2]">{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Comparison Section */}
          <section className="rounded-xl bg-[#101713] border border-[#25332A] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#39E879]">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Gemini Comparative Synthesis</span>
                </div>
                <h2 className="font-display text-lg font-semibold text-[#F2F5F2] mt-1">
                  AI Stock Comparison
                </h2>
              </div>
              <button
                type="button"
                onClick={handleGenerateComparison}
                disabled={aiLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#39E879] text-[#080B09] text-sm font-semibold hover:bg-[#8BE9A8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>{aiLoading ? 'Comparing...' : 'Generate AI Comparison'}</span>
              </button>
            </div>

            {aiLoading && (
              <div className="space-y-3">
                <div className="h-4 w-2/3 rounded bg-[#19251D] animate-pulse" />
                <div className="h-20 rounded bg-[#19251D] animate-pulse" />
                <div className="h-20 rounded bg-[#19251D] animate-pulse" />
              </div>
            )}

            {aiError && (
              <div className="rounded-lg bg-[#151F19] border border-[#F06B72]/40 p-4 text-sm text-[#F06B72]">
                {aiError}
              </div>
            )}

            {!aiResult && !aiLoading && !aiError && (
              <p className="text-sm text-[#89968D]">
                Click <strong className="text-[#F2F5F2]">Generate AI Comparison</strong> to compare{' '}
                {effectiveStockA.symbol} and {effectiveStockB.symbol} across performance, valuation ratios, strengths,
                risks, and data gaps.
              </p>
            )}

            {aiResult && !aiLoading && (
              <div className="space-y-5 pt-4 border-t border-[#25332A]">
                <p className="text-sm text-[#F2F5F2] leading-relaxed font-medium">
                  {aiResult.executiveSummary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#8BE9A8]">
                      Performance Differences
                    </h3>
                    <p className="text-sm text-[#89968D] leading-relaxed">
                      {aiResult.performanceComparison}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#8BE9A8]">
                      Financial Metrics Comparison
                    </h3>
                    <p className="text-sm text-[#89968D] leading-relaxed">
                      {aiResult.financialMetricsComparison}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.strengthsAndWeaknesses.map((entry) => (
                    <div
                      key={entry.symbol}
                      className="rounded-lg bg-[#151F19] border border-[#25332A] p-4 space-y-3"
                    >
                      <div className="font-mono text-sm font-semibold text-[#39E879]">
                        {entry.symbol}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#F2F5F2] mb-1">Strengths</div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#89968D]">
                          {entry.strengths.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#F2F5F2] mb-1">
                          Watchpoints / Weaknesses
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#89968D]">
                          {entry.weaknesses.map((wk, i) => (
                            <li key={i}>{wk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#F06B72]">
                    Comparative Risk Factors
                  </h3>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-[#89968D]">
                    {aiResult.riskFactors.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-[#25332A] text-xs text-[#89968D]">
                  Data limitations: {aiResult.dataLimitations}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
