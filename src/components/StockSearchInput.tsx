import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { StockSummary } from '../types/market';
import { filterStocks, formatPKR, formatPercent } from '../utils/marketLogic';

interface StockSearchInputProps {
  stocks: StockSummary[];
  onSelectStock: (symbol: string) => void;
  onSubmitQuery?: (query: string) => void;
  placeholder?: string;
  size?: 'md' | 'lg';
  inputId?: string;
  autoFocus?: boolean;
}

export function StockSearchInput({
  stocks,
  onSelectStock,
  onSubmitQuery,
  placeholder = 'Search PSX stocks by symbol or name (e.g. HBL, MEBL, OGDC, SYS)...',
  size = 'md',
  inputId,
  autoFocus = false,
}: StockSearchInputProps) {
  const generatedId = useId();
  const fieldId = inputId ?? generatedId;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return stocks.filter((s) => s.featured).slice(0, 7);
    }
    return filterStocks(stocks, { query: trimmed }).slice(0, 8);
  }, [query, stocks]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setIsOpen(false);
    onSelectStock(symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (suggestions.length ? (prev + 1) % suggestions.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        suggestions.length ? (prev - 1 + suggestions.length) % suggestions.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex].symbol);
      } else if (query.trim() && onSubmitQuery) {
        setIsOpen(false);
        onSubmitQuery(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const heightClasses = size === 'lg' ? 'h-13 text-base pl-12 pr-10' : 'h-10 text-sm pl-10 pr-9';

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={fieldId} className="sr-only">
        Search PSX stocks
      </label>
      <div className="relative flex items-center">
        <Search
          className={`pointer-events-none z-10 absolute left-3.5 text-[#89968D] ${
            size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
          }`}
          aria-hidden="true"
        />
        <input
          id={fieldId}
          type="text"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={`w-full rounded-lg bg-[#101713]/72 backdrop-blur-md border border-[#2F4236] shadow-[inset_0_1px_0_rgba(242,245,242,0.05)] text-[#F2F5F2] placeholder-[#89968D] focus:outline-none focus:border-[#39E879] transition-colors ${heightClasses}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            aria-label="Clear stock search"
            className="z-10 absolute right-3 p-1 text-[#89968D] hover:text-[#F2F5F2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-label="PSX stock suggestions"
          className="absolute z-50 mt-2 w-full rounded-lg surface-glass-elevated border border-[#32463A] overflow-hidden"
        >
          <div className="px-3.5 py-2 border-b border-[#25332A] flex items-center justify-between text-xs text-[#89968D]">
            <span>{query.trim() ? 'Matching PSX Securities' : 'Featured PSX Symbols'}</span>
            <span className="font-mono">{suggestions.length} shown</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="px-4 py-5 text-sm text-[#89968D]">
              No PSX companies matched &ldquo;{query}&rdquo;. Try HBL, MEBL, OGDC, LUCK, or SYS.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-[#25332A]/60">
              {suggestions.map((stock, idx) => {
                const positive = stock.changePercent >= 0;
                const isSelected = idx === activeIndex;
                return (
                  <li key={stock.symbol}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(stock.symbol)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                        isSelected ? 'bg-[#19251D]' : 'hover:bg-[#19251D]/60'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-semibold text-[#F2F5F2]">
                            {stock.symbol}
                          </span>
                          <span className="text-xs text-[#89968D] truncate">
                            {stock.sector}
                          </span>
                        </div>
                        <p className="text-xs text-[#89968D] truncate mt-0.5">{stock.name}</p>
                      </div>
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
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
