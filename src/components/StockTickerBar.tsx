import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { StockSummary } from '../types/market';
import { formatPKR, formatPercent } from '../utils/marketLogic';

interface StockTickerBarProps {
  stocks: StockSummary[];
  onSelectStock: (symbol: string) => void;
}

export function StockTickerBar({ stocks, onSelectStock }: StockTickerBarProps) {
  if (stocks.length === 0) return null;

  // Duplicate list once for seamless infinite horizontal scroll
  const tickerItems = [...stocks, ...stocks];

  return (
    <div
      role="region"
      aria-label="Running PSX stock rates ticker"
      data-testid="stock-ticker-bar"
      className="ticker-marquee-wrap w-full overflow-hidden bg-[#39E879] text-[#080B09] border-y border-[#080B09]/20"
    >
      <div className="animate-ticker-marquee py-2.5">
        {tickerItems.map((stock, idx) => {
          const isUp = stock.changePercent >= 0;
          const isDuplicate = idx >= stocks.length;
          return (
            <button
              key={`${stock.symbol}-${idx}`}
              type="button"
              tabIndex={isDuplicate ? -1 : 0}
              aria-hidden={isDuplicate ? true : undefined}
              onClick={() => onSelectStock(stock.symbol)}
              className="inline-flex items-center gap-2.5 px-5 border-r border-[#080B09]/20 text-xs font-mono font-semibold text-[#080B09] hover:bg-[#080B09]/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="tracking-tight font-bold">{stock.symbol}</span>
              <span className="tabular-nums">{formatPKR(stock.price)}</span>
              <span
                className={`inline-flex items-center gap-0.5 tabular-nums ${
                  isUp ? 'font-bold' : 'underline decoration-[#080B09]/60 underline-offset-2'
                }`}
              >
                {isUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
                <span>{isUp ? 'UP' : 'DOWN'}</span>
                <span>{formatPercent(stock.changePercent)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
