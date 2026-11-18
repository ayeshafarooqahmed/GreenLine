import type { ReactNode } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import type { RoutePage } from '../types/navigation';
import { Logo } from './Logo';

interface TopNavProps {
  currentPage: RoutePage;
  onNavigate: (page: RoutePage) => void;
  onSearchAction: () => void;
  watchlistCount: number;
  notificationSlot?: ReactNode;
}

const NAV_ITEMS: { id: RoutePage; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'markets', label: 'Markets' },
  { id: 'discover', label: 'Discover' },
  { id: 'compare', label: 'Compare' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export function TopNav({
  currentPage,
  onNavigate,
  onSearchAction,
  watchlistCount,
  notificationSlot,
}: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#39E879]/20 nav-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39E879] rounded"
          aria-label="GREENLINE Home"
        >
          <Logo />
        </a>

        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <a
                key={item.id}
                href={`/${item.id === 'home' ? '' : item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'text-[#39E879]'
                    : 'text-[#89968D] hover:text-[#F2F5F2]'
                }`}
              >
                {item.label}
                {item.id === 'watchlist' && watchlistCount > 0 ? ` (${watchlistCount})` : ''}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[19px] h-[2px] bg-[#39E879]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {notificationSlot}
          <button
            type="button"
            onClick={onSearchAction}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#101713] border border-[#25332A] text-sm text-[#89968D] hover:text-[#F2F5F2] hover:border-[#39E879]/50 transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-4 h-4 text-[#39E879]" aria-hidden="true" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#101713] border border-[#25332A] text-[#F2F5F2]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-[#2F4236]/80 surface-glass-elevated px-4 py-3 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#19251D] text-[#39E879]'
                    : 'text-[#89968D] hover:text-[#F2F5F2] hover:bg-[#151F19]'
                }`}
              >
                {item.label}
                {item.id === 'watchlist' && watchlistCount > 0 ? ` (${watchlistCount})` : ''}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
