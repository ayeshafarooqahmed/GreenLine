import { BellRing, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import type { PriceAlertRule, PriceAlertSide } from '../types/market';
import { formatPKR, validatePriceAlertInput } from '../utils/marketLogic';

interface WatchlistAlertPanelProps {
  symbol: string;
  currentPrice: number;
  alerts: PriceAlertRule[];
  onAddAlert: (symbol: string, side: PriceAlertSide, targetPrice: number) => void;
  onRemoveAlert: (id: string) => void;
  onRearmAlert: (id: string) => void;
}

export function WatchlistAlertPanel({
  symbol,
  currentPrice,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onRearmAlert,
}: WatchlistAlertPanelProps) {
  const inputId = useId();
  const [side, setSide] = useState<PriceAlertSide>('buy');
  const [targetInput, setTargetInput] = useState('');
  const [formOpen, setFormOpen] = useState(alerts.length === 0);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePriceAlertInput(targetInput);
    if (!check.valid || check.value === null) {
      setFormError(check.error);
      return;
    }
    setFormError(null);
    onAddAlert(symbol, side, check.value);
    setTargetInput('');
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#25332A]/60 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#89968D]">
          <BellRing className="w-3.5 h-3.5 text-[#39E879]" aria-hidden="true" />
          <span>Price Targets</span>
          {alerts.length > 0 && (
            <span className="font-mono text-[#F2F5F2]">({alerts.length})</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setFormOpen((v) => !v);
            setFormError(null);
          }}
          aria-expanded={formOpen}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#8BE9A8] hover:text-[#39E879] transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{formOpen ? 'Hide Alert Form' : 'Add Price Alert'}</span>
        </button>
      </div>

      {alerts.length > 0 && (
        <ul className="space-y-1.5" aria-label={`${symbol} configured price alerts`}>
          {alerts.map((rule) => {
            const isBuy = rule.side === 'buy';
            const diffPct =
              currentPrice > 0 ? ((rule.targetPrice - currentPrice) / currentPrice) * 100 : 0;

            return (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B100D] border border-[#25332A]/80 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <span
                    className={`font-mono font-semibold uppercase ${
                      isBuy ? 'text-[#39E879]' : 'text-[#8BE9A8]'
                    }`}
                  >
                    {isBuy ? 'Buy <=' : 'Sell >='}
                  </span>
                  <span className="font-mono text-[#F2F5F2] font-medium">
                    {formatPKR(rule.targetPrice)}
                  </span>
                  <span aria-hidden="true" className="text-[#25332A]">
                    ·
                  </span>
                  {rule.active ? (
                    <span className="font-mono text-[#89968D]">
                      Armed ({diffPct >= 0 ? '+' : ''}
                      {diffPct.toFixed(2)}% from live)
                    </span>
                  ) : (
                    <span className="font-mono text-[#39E879]">
                      Triggered at {formatPKR(rule.triggeredPrice ?? currentPrice)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!rule.active && (
                    <button
                      type="button"
                      onClick={() => onRearmAlert(rule.id)}
                      aria-label={`Re-arm ${symbol} ${rule.side} price alert at ${formatPKR(rule.targetPrice)}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#151F19] border border-[#25332A] text-[11px] font-medium text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Re-arm</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveAlert(rule.id)}
                    aria-label={`Delete ${symbol} ${rule.side} price alert at ${formatPKR(rule.targetPrice)}`}
                    className="p-1.5 rounded text-[#89968D] hover:text-[#F06B72] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={`${symbol} alert direction`}
              className="inline-flex items-center p-0.5 rounded-lg bg-[#080B09] border border-[#25332A] shrink-0"
            >
              <button
                type="button"
                aria-pressed={side === 'buy'}
                onClick={() => {
                  setSide('buy');
                  setFormError(null);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  side === 'buy'
                    ? 'bg-[#19251D] text-[#39E879]'
                    : 'text-[#89968D] hover:text-[#F2F5F2]'
                }`}
              >
                Buy (&le;)
              </button>
              <button
                type="button"
                aria-pressed={side === 'sell'}
                onClick={() => {
                  setSide('sell');
                  setFormError(null);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  side === 'sell'
                    ? 'bg-[#19251D] text-[#8BE9A8]'
                    : 'text-[#89968D] hover:text-[#F2F5F2]'
                }`}
              >
                Sell (&ge;)
              </button>
            </div>

            <div className="flex-1 min-w-[150px] max-w-[220px]">
              <label htmlFor={inputId} className="sr-only">
                Target {side} price in PKR for {symbol}
              </label>
              <input
                id={inputId}
                type="number"
                step="0.01"
                min="0.01"
                value={targetInput}
                onChange={(e) => {
                  setTargetInput(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder={`Target PKR (now ${currentPrice.toFixed(2)})`}
                aria-label={`Target ${side} price in PKR for ${symbol}`}
                className="w-full h-9 px-3 rounded-lg bg-[#080B09] border border-[#25332A] font-mono text-xs text-[#F2F5F2] placeholder-[#89968D] focus:outline-none focus:border-[#39E879]"
              />
            </div>

            <button
              type="submit"
              className="h-9 px-3.5 rounded-lg bg-[#39E879] text-[#080B09] text-xs font-semibold hover:bg-[#8BE9A8] transition-colors whitespace-nowrap shrink-0"
            >
              Set Alert
            </button>
          </div>

          {formError && (
            <p role="alert" className="text-xs text-[#F06B72]">
              {formError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
