import type {
  DiscoveryCategory,
  MarketOverviewResponse,
  PsxSector,
  SectorPerformance,
  StockDetail,
  StockSummary,
} from '../../src/types/market';
import { filterStocks, sortMovers } from '../../src/utils/marketLogic';
import {
  ILLUSTRATIVE_AS_OF,
  ILLUSTRATIVE_INDICES,
  ILLUSTRATIVE_NEWS,
  KSE100_HISTORY,
  SECTOR_PERFORMANCE,
  STOCK_DETAILS,
  STOCK_SUMMARIES,
} from '../data/psxDataset';

/**
 * PSX Market Data Service
 *
 * Connects to an external PSX market feed if PSX_DATA_API_URL is configured.
 * Otherwise serves the clearly labelled Illustrative PSX Reference Dataset so
 * figures are never misrepresented as live exchange quotes.
 */
class PsxDataService {
  private get hasExternalProvider(): boolean {
    return Boolean(process.env.PSX_DATA_API_URL?.trim());
  }

  private async tryFetchExternal<T>(path: string): Promise<T | null> {
    if (!this.hasExternalProvider) return null;
    const baseUrl = process.env.PSX_DATA_API_URL!.replace(/\/+$/, '');
    const apiKey = process.env.PSX_DATA_API_KEY?.trim();
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async getMarketOverview(): Promise<MarketOverviewResponse> {
    const live = await this.tryFetchExternal<MarketOverviewResponse>('/market/overview');
    if (live) return live;

    const { gainers, losers, active } = sortMovers(STOCK_SUMMARIES, 5);
    const featured = STOCK_SUMMARIES.filter((s) => s.featured);
    const totalVol = STOCK_SUMMARIES.reduce((acc, s) => acc + s.volume, 0) / 1_000_000;
    const advancersCount = STOCK_SUMMARIES.filter((s) => s.changePercent > 0).length;
    const declinersCount = STOCK_SUMMARIES.filter((s) => s.changePercent < 0).length;
    const unchangedCount = STOCK_SUMMARIES.length - advancersCount - declinersCount;

    return {
      meta: {
        dataMode: 'illustrative',
        dataLabel: 'Illustrative PSX Reference Dataset · Not live exchange quotes',
        marketStatus: 'Illustrative Reference',
        asOfTimestamp: ILLUSTRATIVE_AS_OF,
      },
      indices: ILLUSTRATIVE_INDICES,
      kse100History: KSE100_HISTORY,
      gainers,
      losers,
      active,
      featured,
      sectors: SECTOR_PERFORMANCE,
      totalVolumeMillions: Number((totalVol + 195.6).toFixed(1)),
      totalValueBillionsPkr: 24.8,
      advancersCount,
      declinersCount,
      unchangedCount,
      news: ILLUSTRATIVE_NEWS,
    };
  }

  async getStocks(filters?: {
    q?: string;
    sector?: PsxSector | 'All';
    category?: DiscoveryCategory;
  }): Promise<{ stocks: StockSummary[]; dataMode: 'illustrative' | 'live'; asOfTimestamp: string }> {
    const liveStocks = await this.tryFetchExternal<StockSummary[]>('/stocks');
    const sourceStocks = Array.isArray(liveStocks) && liveStocks.length > 0 ? liveStocks : STOCK_SUMMARIES;
    const isLive = sourceStocks !== STOCK_SUMMARIES;

    const stocks = filterStocks(sourceStocks, {
      query: filters?.q,
      sector: filters?.sector,
      category: filters?.category,
    });

    return {
      stocks,
      dataMode: isLive ? 'live' : 'illustrative',
      asOfTimestamp: isLive ? new Date().toISOString() : ILLUSTRATIVE_AS_OF,
    };
  }

  async getStockBySymbol(
    symbol: string
  ): Promise<{ stock: StockDetail; dataMode: 'illustrative' | 'live'; asOfTimestamp: string } | null> {
    const normalized = symbol.trim().toUpperCase();
    const live = await this.tryFetchExternal<StockDetail>(`/stocks/${encodeURIComponent(normalized)}`);
    if (live) {
      return {
        stock: live,
        dataMode: 'live',
        asOfTimestamp: new Date().toISOString(),
      };
    }

    const found = STOCK_DETAILS.find((s) => s.symbol === normalized);
    if (!found) return null;

    return {
      stock: found,
      dataMode: 'illustrative',
      asOfTimestamp: ILLUSTRATIVE_AS_OF,
    };
  }

  async getSectors(): Promise<{ sectors: SectorPerformance[]; asOfTimestamp: string }> {
    const liveSectors = await this.tryFetchExternal<SectorPerformance[]>('/sectors');
    if (Array.isArray(liveSectors) && liveSectors.length > 0) {
      return {
        sectors: liveSectors,
        asOfTimestamp: new Date().toISOString(),
      };
    }
    return {
      sectors: SECTOR_PERFORMANCE,
      asOfTimestamp: ILLUSTRATIVE_AS_OF,
    };
  }
}

export const psxDataService = new PsxDataService();
