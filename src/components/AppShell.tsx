import {
  BarChart3,
  Bookmark,
  Compass,
  GitCompareArrows,
  Home,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { DataSourceMeta, StockSummary } from '../types/market';
import type { RoutePage } from '../types/navigation';
import { Logo } from './Logo';
import { StockSearchInput } from './StockSearchInput';

interface AppShellProps {
  currentPage: RoutePage;
  onNavigate: (page: RoutePage) => void;
  onSelectStock: (symbol: string) => void;
  onSearchQuerySubmit: (query: string) => void;
  stocks: StockSummary[];
  watchlistCount: number;
  meta: DataSourceMeta | null;
  notificationSlot?: ReactNode;
  children: ReactNode;
}

const SIDEBAR_ITEMS: { id: RoutePage; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'markets', label: 'Markets', icon: BarChart3 },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export function AppShell({
  currentPage,
  onNavigate,
  onSelectStock,
  onSearchQuerySubmit,
  stocks,
  watchlistCount,
  meta,
  notificationSlot,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderNavLinks = (closeOnClick = false) => (
    <nav aria-label="Workspace navigation" className="space-y-1">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          currentPage === item.id || (currentPage === 'stock' && item.id === 'discover');
        return (
          <a
            key={item.id}
            href={`/${item.id === 'home' ? '' : item.id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.id);
              if (closeOnClick) setSidebarOpen(false);
            }}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-[#19251D] text-[#39E879] border border-[#39E879]/30'
                : 'text-[#89968D] hover:text-[#F2F5F2] hover:bg-[#151F19] border border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
            {item.id === 'watchlist' && watchlistCount > 0 && (
              <span className="font-mono text-xs text-[#8BE9A8]">{watchlistCount}</span>
            )}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#080B09] text-[#F2F5F2] flex">
      {/* Desktop Compact Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 border-r border-[#2F4236]/80 sidebar-glass sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center border-b border-[#25332A]">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            aria-label="GREENLINE Home"
          >
            <Logo />
          </a>
        </div>

        <div className="flex-1 px-3 py-5 overflow-y-auto">{renderNavLinks()}</div>

        <div className="p-4 border-t border-[#25332A] text-xs text-[#89968D] space-y-1">
          <div className="font-medium text-[#F2F5F2]">Pakistan Stock Exchange</div>
          <p className="leading-relaxed">
            {meta?.dataMode === 'live'
              ? 'Connected to live PSX market feed.'
              : 'Illustrative PSX reference data for demonstration.'}
          </p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] sidebar-glass border-r border-[#2F4236]/80 flex flex-col h-full">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#25332A]">
              <Logo />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="p-1.5 text-[#89968D] hover:text-[#F2F5F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 px-3 py-5 overflow-y-auto">{renderNavLinks(true)}</div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-[#39E879]/20 nav-glass px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#101713] border border-[#25332A] text-[#F2F5F2] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <StockSearchInput
                stocks={stocks}
                onSelectStock={onSelectStock}
                onSubmitQuery={onSearchQuerySubmit}
                inputId="workspace-stock-search"
                placeholder="Search PSX ticker or company (HBL, MEBL, OGDC, SYS)..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-3 text-xs text-[#89968D] shrink-0">
              <span>{meta?.marketStatus ?? 'Illustrative Reference'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {meta?.asOfTimestamp
                  ? new Date(meta.asOfTimestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'PSX'}
              </span>
            </div>
            {notificationSlot}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
