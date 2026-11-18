import { Bell, CheckCheck, Radio, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MarketNotification } from '../types/market';
import { formatPKR, formatPercent } from '../utils/marketLogic';

interface NotificationCenterProps {
  notifications: MarketNotification[];
  liveEnabled: boolean;
  dataMode: 'illustrative' | 'live';
  onToggleLive: () => void;
  onTriggerSampleTick: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSelectStock: (symbol: string) => void;
}

export function NotificationCenter({
  notifications,
  liveEnabled,
  dataMode,
  onToggleLive,
  onTriggerSampleTick,
  onMarkAllRead,
  onClearAll,
  onSelectStock,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) {
            onMarkAllRead();
          }
        }}
        aria-label={`Live market notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#101713] border border-[#25332A] text-xs font-medium text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors whitespace-nowrap shrink-0"
      >
        <Bell className="w-4 h-4 text-[#39E879]" aria-hidden="true" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 && (
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#39E879] text-[#080B09] font-bold leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Live PSX market alerts"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl surface-glass-elevated border border-[#32463A] z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#25332A] flex items-center justify-between gap-2">
            <div>
              <div className="font-display text-sm font-semibold text-[#F2F5F2]">
                Live Movement Alerts
              </div>
              <div className="text-[11px] text-[#89968D]">
                {dataMode === 'live' ? 'Live market feed stream' : 'Illustrative session tick alerts'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="p-1 text-[#89968D] hover:text-[#F2F5F2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-2.5 border-b border-[#25332A]/80 bg-[#0B110E]/55 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={onToggleLive}
              aria-pressed={liveEnabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
                liveEnabled
                  ? 'bg-[#19251D] border-[#39E879]/50 text-[#39E879]'
                  : 'border-[#25332A] text-[#89968D] hover:text-[#F2F5F2]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{liveEnabled ? 'Auto-Updates On' : 'Auto-Updates Paused'}</span>
            </button>

            <button
              type="button"
              onClick={onTriggerSampleTick}
              className="px-2.5 py-1 rounded-md bg-[#19251D] border border-[#25332A] text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors font-medium"
            >
              Check Update
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#25332A]/70">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[#89968D]">
                No movement alerts yet. Auto-updates check for PSX price changes or click Check
                Update.
              </div>
            ) : (
              notifications.map((item) => {
                const isUp = item.deltaPercent >= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelectStock(item.symbol);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#19251D] transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#F2F5F2]">
                          {item.symbol}
                        </span>
                        {item.alertKind === 'buy-target' && (
                          <span className="text-[10px] font-mono font-semibold text-[#39E879]">
                            BUY TARGET
                          </span>
                        )}
                        {item.alertKind === 'sell-target' && (
                          <span className="text-[10px] font-mono font-semibold text-[#8BE9A8]">
                            SELL TARGET
                          </span>
                        )}
                        {!item.alertKind && item.isWatchlist && (
                          <span className="text-[10px] font-mono text-[#8BE9A8]">WATCHLIST</span>
                        )}
                      </div>
                      <p className="text-xs text-[#89968D] mt-0.5 leading-snug">{item.detail}</p>
                      <span className="text-[10px] font-mono text-[#89968D]">
                        {new Date(item.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-[#F2F5F2]">
                        {formatPKR(item.price)}
                      </div>
                      <div
                        className={`font-mono text-xs inline-flex items-center gap-1 ${
                          isUp ? 'text-[#39E879]' : 'text-[#F06B72]'
                        }`}
                      >
                        {isUp ? (
                          <TrendingUp className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>{formatPercent(item.deltaPercent)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#25332A]/80 bg-[#0B110E]/55 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[#8BE9A8] hover:text-[#39E879]"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mark read</span>
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="text-[#89968D] hover:text-[#F06B72]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
