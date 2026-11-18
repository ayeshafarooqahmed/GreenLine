import type {
  IndexQuote,
  NewsItem,
  PricePoint,
  PsxSector,
  SectorPerformance,
  StockDetail,
  StockSummary,
  TimeRange,
} from '../../src/types/market';

export const ILLUSTRATIVE_AS_OF = '2026-11-17T15:30:00+05:00';

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function generateSeries(
  symbol: string,
  currentPrice: number,
  dailyChangePercent: number,
  annualDriftPercent: number,
  volatility: number,
  range: TimeRange
): PricePoint[] {
  const seed = hashSeed(`${symbol}_${range}`);
  const pointsCountMap: Record<TimeRange, number> = {
    '1D': 24,
    '1W': 14,
    '1M': 22,
    '3M': 30,
    '6M': 36,
    '1Y': 52,
    ALL: 60,
  };
  const count = pointsCountMap[range];

  const prevClose = currentPrice / (1 + dailyChangePercent / 100);
  const startPrice = (() => {
    switch (range) {
      case '1D':
        return prevClose;
      case '1W':
        return currentPrice / (1 + (annualDriftPercent / 52) / 100);
      case '1M':
        return currentPrice / (1 + (annualDriftPercent / 12) / 100);
      case '3M':
        return currentPrice / (1 + (annualDriftPercent / 4) / 100);
      case '6M':
        return currentPrice / (1 + (annualDriftPercent / 2) / 100);
      case '1Y':
        return currentPrice / (1 + annualDriftPercent / 100);
      case 'ALL':
        return currentPrice / (1 + (annualDriftPercent * 2.1) / 100);
    }
  })();

  const labelForIndex = (idx: number): string => {
    if (range === '1D') {
      const totalMins = 9 * 60 + 30 + Math.round((idx / (count - 1)) * 360);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    const baseDate = new Date('2026-11-17T15:30:00+05:00');
    const stepDays =
      range === '1W'
        ? 0.5
        : range === '1M'
          ? 1.4
          : range === '3M'
            ? 3
            : range === '6M'
              ? 5
              : range === '1Y'
                ? 7
                : 24;
    const daysBack = Math.round((count - 1 - idx) * stepDays);
    const d = new Date(baseDate.getTime() - daysBack * 86400_000);
    if (range === 'ALL' || range === '1Y') {
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const points: PricePoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const linear = startPrice + (currentPrice - startPrice) * t;
    // Deterministic smooth wave + micro jitter pinned to 0 at endpoints
    const envelope = Math.sin(t * Math.PI);
    const wave =
      Math.sin(t * Math.PI * 3.5 + (seed % 11)) * 0.65 +
      Math.cos(t * Math.PI * 7.2 + (seed % 7)) * 0.35;
    const scale = range === '1D' ? volatility * 0.25 : volatility;
    const raw = i === count - 1 ? currentPrice : linear * (1 + envelope * wave * scale);
    points.push({
      date: labelForIndex(i),
      price: Number(Math.max(1, raw).toFixed(2)),
    });
  }
  return points;
}

function buildAllHistories(
  symbol: string,
  price: number,
  dailyChangePct: number,
  annualDriftPct: number,
  volatility: number
): Record<TimeRange, PricePoint[]> {
  return {
    '1D': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '1D'),
    '1W': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '1W'),
    '1M': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '1M'),
    '3M': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '3M'),
    '6M': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '6M'),
    '1Y': generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, '1Y'),
    ALL: generateSeries(symbol, price, dailyChangePct, annualDriftPct, volatility, 'ALL'),
  };
}

interface RawStockSeed {
  symbol: string;
  name: string;
  sector: PsxSector;
  price: number;
  changePercent: number;
  annualDriftPercent: number;
  volatility: number;
  volume: number;
  marketCapBillionsPkr: number | null;
  peRatio: number | null;
  epsPkr: number | null;
  dividendYieldPercent: number | null;
  week52High: number;
  week52Low: number;
  headquarters: string;
  foundedYear: number;
  featured?: boolean;
  trending?: boolean;
  description: string;
}

const RAW_STOCKS: RawStockSeed[] = [
  {
    symbol: 'HBL',
    name: 'Habib Bank Limited',
    sector: 'Banking',
    price: 146.8,
    changePercent: 2.66,
    annualDriftPercent: 34.5,
    volatility: 0.045,
    volume: 6_420_000,
    marketCapBillionsPkr: 215.3,
    peRatio: 4.18,
    epsPkr: 35.12,
    dividendYieldPercent: 10.9,
    week52High: 152.4,
    week52Low: 101.2,
    headquarters: 'Karachi',
    foundedYear: 1941,
    featured: true,
    trending: true,
    description:
      'Pakistan’s largest commercial bank by branch footprint and assets, operating retail, corporate, Islamic, and treasury banking across domestic and international corridors.',
  },
  {
    symbol: 'MEBL',
    name: 'Meezan Bank Limited',
    sector: 'Banking',
    price: 238.4,
    changePercent: 3.12,
    annualDriftPercent: 48.2,
    volatility: 0.04,
    volume: 5_180_000,
    marketCapBillionsPkr: 427.1,
    peRatio: 5.02,
    epsPkr: 47.49,
    dividendYieldPercent: 11.74,
    week52High: 249.0,
    week52Low: 151.5,
    headquarters: 'Karachi',
    foundedYear: 1997,
    featured: true,
    trending: true,
    description:
      'Pakistan’s premier full-fledged Islamic commercial bank, recognized for high-growth Shariah-compliant deposit mobilization, trade finance, and strong return on equity.',
  },
  {
    symbol: 'OGDC',
    name: 'Oil & Gas Development Company',
    sector: 'Oil and Gas',
    price: 191.5,
    changePercent: 4.19,
    annualDriftPercent: 52.0,
    volatility: 0.055,
    volume: 14_850_000,
    marketCapBillionsPkr: 823.6,
    peRatio: 3.85,
    epsPkr: 49.74,
    dividendYieldPercent: 6.27,
    week52High: 196.8,
    week52Low: 114.0,
    headquarters: 'Islamabad',
    foundedYear: 1961,
    featured: true,
    trending: true,
    description:
      'Pakistan’s flagship upstream exploration and production enterprise, holding the largest share of domestic crude oil and natural gas reserves and heavy KSE-100 index weighting.',
  },
  {
    symbol: 'LUCK',
    name: 'Lucky Cement Limited',
    sector: 'Cement',
    price: 942.0,
    changePercent: 1.84,
    annualDriftPercent: 29.4,
    volatility: 0.038,
    volume: 920_000,
    marketCapBillionsPkr: 276.0,
    peRatio: 7.45,
    epsPkr: 126.44,
    dividendYieldPercent: 1.91,
    week52High: 968.0,
    week52Low: 684.0,
    headquarters: 'Karachi',
    foundedYear: 1993,
    featured: true,
    trending: false,
    description:
      'Diversified industrial conglomerate anchored by Pakistan’s largest cement producer, with strategic holdings in power generation, automotive assembly, chemicals, and mobile handsets.',
  },
  {
    symbol: 'PPL',
    name: 'Pakistan Petroleum Limited',
    sector: 'Oil and Gas',
    price: 158.25,
    changePercent: 3.57,
    annualDriftPercent: 46.8,
    volatility: 0.058,
    volume: 12_340_000,
    marketCapBillionsPkr: 430.6,
    peRatio: 3.92,
    epsPkr: 40.37,
    dividendYieldPercent: 4.42,
    week52High: 164.0,
    week52Low: 96.5,
    headquarters: 'Karachi',
    foundedYear: 1950,
    featured: true,
    trending: true,
    description:
      'Leading upstream oil and gas exploration company operating major gas fields including Sui, Adhi, and Kandhkot, sensitive to circular-debt settlement reforms and wellhead pricing.',
  },
  {
    symbol: 'PSO',
    name: 'Pakistan State Oil Company',
    sector: 'Oil and Gas',
    price: 264.1,
    changePercent: -1.42,
    annualDriftPercent: 38.0,
    volatility: 0.062,
    volume: 7_640_000,
    marketCapBillionsPkr: 124.0,
    peRatio: 5.84,
    epsPkr: 45.22,
    dividendYieldPercent: 3.79,
    week52High: 281.5,
    week52Low: 158.0,
    headquarters: 'Karachi',
    foundedYear: 1976,
    featured: true,
    trending: true,
    description:
      'Pakistan’s largest state-affiliated oil marketing company (OMC), managing nationwide petroleum storage, retail fuel distribution, aviation refueling, and LNG supply chains.',
  },
  {
    symbol: 'SYS',
    name: 'Systems Limited',
    sector: 'Technology',
    price: 534.5,
    changePercent: 2.2,
    annualDriftPercent: 24.5,
    volatility: 0.044,
    volume: 1_540_000,
    marketCapBillionsPkr: 155.7,
    peRatio: 16.82,
    epsPkr: 31.78,
    dividendYieldPercent: 1.5,
    week52High: 552.0,
    week52Low: 389.0,
    headquarters: 'Lahore',
    foundedYear: 1977,
    featured: true,
    trending: true,
    description:
      'Pakistan’s premier publicly listed enterprise software and IT services exporter, generating the majority of revenue in USD/AED/EUR from Middle East, North America, and European clients.',
  },
  {
    symbol: 'MCB',
    name: 'MCB Bank Limited',
    sector: 'Banking',
    price: 249.6,
    changePercent: 1.15,
    annualDriftPercent: 27.8,
    volatility: 0.035,
    volume: 1_890_000,
    marketCapBillionsPkr: 295.8,
    peRatio: 4.55,
    epsPkr: 54.86,
    dividendYieldPercent: 14.42,
    week52High: 258.0,
    week52Low: 179.0,
    headquarters: 'Lahore',
    foundedYear: 1947,
    description:
      'Established commercial bank known for low-cost current account deposits, disciplined credit underwriting, and one of the highest cash dividend payout ratios on the PSX.',
  },
  {
    symbol: 'UBL',
    name: 'United Bank Limited',
    sector: 'Banking',
    price: 312.0,
    changePercent: 2.09,
    annualDriftPercent: 44.0,
    volatility: 0.042,
    volume: 2_310_000,
    marketCapBillionsPkr: 381.9,
    peRatio: 5.4,
    epsPkr: 57.78,
    dividendYieldPercent: 14.1,
    week52High: 320.5,
    week52Low: 185.0,
    headquarters: 'Karachi',
    foundedYear: 1959,
    description:
      'Major universal Pakistani bank with a deep digital banking franchise, international GCC presence, and strong sovereign fixed-income treasury earnings.',
  },
  {
    symbol: 'ENGRO',
    name: 'Engro Corporation Limited',
    sector: 'Fertilizer',
    price: 368.75,
    changePercent: 0.96,
    annualDriftPercent: 18.4,
    volatility: 0.036,
    volume: 1_120_000,
    marketCapBillionsPkr: 197.9,
    peRatio: 6.12,
    epsPkr: 60.25,
    dividendYieldPercent: 9.22,
    week52High: 382.0,
    week52Low: 292.0,
    headquarters: 'Karachi',
    foundedYear: 1965,
    description:
      'Flagship industrial holding company with core investments in fertilizers (EFERT), petrochemicals (EPCL), energy, telecom infrastructure, and LNG/chemical terminals.',
  },
  {
    symbol: 'EFERT',
    name: 'Engro Fertilizers Limited',
    sector: 'Fertilizer',
    price: 196.4,
    changePercent: -0.76,
    annualDriftPercent: 32.1,
    volatility: 0.034,
    volume: 3_150_000,
    marketCapBillionsPkr: 262.2,
    peRatio: 8.9,
    epsPkr: 22.07,
    dividendYieldPercent: 12.73,
    week52High: 207.5,
    week52Low: 118.4,
    headquarters: 'Karachi',
    foundedYear: 2009,
    description:
      'Leading domestic urea and phosphate fertilizer manufacturer operating high-efficiency plants in Daharki, supplying Pakistan’s agricultural sector with consistent cash dividends.',
  },
  {
    symbol: 'FFC',
    name: 'Fauji Fertilizer Company',
    sector: 'Fertilizer',
    price: 284.5,
    changePercent: 1.97,
    annualDriftPercent: 56.4,
    volatility: 0.039,
    volume: 3_880_000,
    marketCapBillionsPkr: 361.9,
    peRatio: 7.65,
    epsPkr: 37.19,
    dividendYieldPercent: 10.54,
    week52High: 291.0,
    week52Low: 129.0,
    headquarters: 'Rawalpindi',
    foundedYear: 1978,
    trending: true,
    description:
      'Pakistan’s largest urea producer by market share, reinforced by strategic equity stakes in banking, wind power, food processing, and associate fertilizer facilities.',
  },
  {
    symbol: 'HUBC',
    name: 'The Hub Power Company',
    sector: 'Power and Energy',
    price: 114.2,
    changePercent: -2.89,
    annualDriftPercent: -8.5,
    volatility: 0.056,
    volume: 11_420_000,
    marketCapBillionsPkr: 148.1,
    peRatio: 3.28,
    epsPkr: 34.82,
    dividendYieldPercent: 10.51,
    week52High: 166.9,
    week52Low: 98.4,
    headquarters: 'Karachi',
    foundedYear: 1991,
    trending: true,
    description:
      'Pakistan’s oldest and largest independent power producer (IPP), transitioning from legacy oil-fired generation toward coal, hydro, EV joint ventures, and upstream exploration.',
  },
  {
    symbol: 'TRG',
    name: 'TRG Pakistan Limited',
    sector: 'Technology',
    price: 57.6,
    changePercent: -3.68,
    annualDriftPercent: -19.2,
    volatility: 0.075,
    volume: 16_900_000,
    marketCapBillionsPkr: 31.4,
    peRatio: null,
    epsPkr: -4.15,
    dividendYieldPercent: null,
    week52High: 81.5,
    week52Low: 48.2,
    headquarters: 'Karachi',
    foundedYear: 2002,
    trending: true,
    description:
      'Technology investment holding company with economic exposure to global customer-experience BPO (IBEX) and enterprise AI software investments; high-beta retail trading favorite.',
  },
  {
    symbol: 'MARI',
    name: 'Mari Energies Limited',
    sector: 'Oil and Gas',
    price: 452.0,
    changePercent: 2.96,
    annualDriftPercent: 61.0,
    volatility: 0.048,
    volume: 2_140_000,
    marketCapBillionsPkr: 542.6,
    peRatio: 7.12,
    epsPkr: 63.48,
    dividendYieldPercent: 5.1,
    week52High: 465.0,
    week52Low: 234.0,
    headquarters: 'Islamabad',
    foundedYear: 1984,
    description:
      'Low-cost gas producer operating Pakistan’s largest gas reservoir at Daharki, expanding into mineral mining, cloud/data center infrastructure, and new exploration blocks.',
  },
  {
    symbol: 'MLCF',
    name: 'Maple Leaf Cement Factory',
    sector: 'Cement',
    price: 41.85,
    changePercent: 1.58,
    annualDriftPercent: 14.6,
    volatility: 0.052,
    volume: 9_450_000,
    marketCapBillionsPkr: 43.8,
    peRatio: 6.72,
    epsPkr: 6.23,
    dividendYieldPercent: null,
    week52High: 45.9,
    week52Low: 31.4,
    headquarters: 'Lahore',
    foundedYear: 1956,
    description:
      'Major northern-zone grey and white cement producer benefiting from captive coal/waste-heat power generation and easing domestic policy interest rates.',
  },
  {
    symbol: 'DGKC',
    name: 'D.G. Khan Cement Company',
    sector: 'Cement',
    price: 89.4,
    changePercent: -1.11,
    annualDriftPercent: 22.0,
    volatility: 0.054,
    volume: 6_180_000,
    marketCapBillionsPkr: 39.2,
    peRatio: 11.4,
    epsPkr: 7.84,
    dividendYieldPercent: null,
    week52High: 96.2,
    week52Low: 63.5,
    headquarters: 'Lahore',
    foundedYear: 1978,
    description:
      'One of Pakistan’s largest cement manufacturers with plants in both north and south zones, plus export clinker capacity via Hub.',
  },
  {
    symbol: 'INDU',
    name: 'Indus Motor Company',
    sector: 'Automobile',
    price: 1865.0,
    changePercent: 1.36,
    annualDriftPercent: 39.5,
    volatility: 0.036,
    volume: 68_400,
    marketCapBillionsPkr: 146.6,
    peRatio: 8.64,
    epsPkr: 215.86,
    dividendYieldPercent: 7.24,
    week52High: 1920.0,
    week52Low: 1185.0,
    headquarters: 'Karachi',
    foundedYear: 1989,
    description:
      'Assembler and distributor of Toyota vehicles in Pakistan, including Corolla, Yaris, Fortuner, and locally assembled hybrid-electric Cross models.',
  },
  {
    symbol: 'SAZEW',
    name: 'Sazgar Engineering Works',
    sector: 'Automobile',
    price: 1024.0,
    changePercent: 4.81,
    annualDriftPercent: 112.0,
    volatility: 0.065,
    volume: 1_260_000,
    marketCapBillionsPkr: 61.9,
    peRatio: 6.45,
    epsPkr: 158.76,
    dividendYieldPercent: 2.34,
    week52High: 1110.0,
    week52Low: 380.0,
    headquarters: 'Lahore',
    foundedYear: 1991,
    trending: true,
    description:
      'Manufacturer of three-wheelers and local assembler of GWM Haval hybrid SUVs, driving rapid earnings expansion in Pakistan’s passenger SUV segment.',
  },
  {
    symbol: 'SEARL',
    name: 'The Searle Company Limited',
    sector: 'Pharmaceuticals',
    price: 78.9,
    changePercent: 2.47,
    annualDriftPercent: 31.2,
    volatility: 0.055,
    volume: 8_230_000,
    marketCapBillionsPkr: 40.4,
    peRatio: 18.2,
    epsPkr: 4.34,
    dividendYieldPercent: null,
    week52High: 83.4,
    week52Low: 46.8,
    headquarters: 'Karachi',
    foundedYear: 1965,
    description:
      'Major Pakistani pharmaceutical and healthcare group benefiting from non-essential drug price deregulation and lower borrowing costs.',
  },
  {
    symbol: 'GLAXO',
    name: 'GlaxoSmithKline Pakistan',
    sector: 'Pharmaceuticals',
    price: 268.0,
    changePercent: -0.92,
    annualDriftPercent: 68.5,
    volatility: 0.049,
    volume: 1_410_000,
    marketCapBillionsPkr: 85.3,
    peRatio: 14.1,
    epsPkr: 19.01,
    dividendYieldPercent: 2.61,
    week52High: 289.0,
    week52Low: 89.5,
    headquarters: 'Karachi',
    foundedYear: 1948,
    description:
      'Multinational pharmaceutical leader in Pakistan producing anti-infectives, respiratory, dermatology, and vaccines across wide retail distribution.',
  },
  {
    symbol: 'AIRLINK',
    name: 'Air Link Communication',
    sector: 'Technology',
    price: 142.3,
    changePercent: -2.13,
    annualDriftPercent: 72.0,
    volatility: 0.064,
    volume: 10_820_000,
    marketCapBillionsPkr: 56.2,
    peRatio: 11.8,
    epsPkr: 12.06,
    dividendYieldPercent: 2.81,
    week52High: 158.0,
    week52Low: 58.0,
    headquarters: 'Lahore',
    foundedYear: 2014,
    description:
      'Smartphone assembler and technology distributor in Pakistan with local manufacturing partnerships for Xiaomi, Tecno, and Acer hardware lines.',
  },
  {
    symbol: 'NBP',
    name: 'National Bank of Pakistan',
    sector: 'Banking',
    price: 68.4,
    changePercent: 3.48,
    annualDriftPercent: 78.0,
    volatility: 0.058,
    volume: 13_450_000,
    marketCapBillionsPkr: 145.5,
    peRatio: 2.95,
    epsPkr: 23.19,
    dividendYieldPercent: 11.7,
    week52High: 72.1,
    week52Low: 31.8,
    headquarters: 'Karachi',
    foundedYear: 1949,
    trending: true,
    description:
      'Pakistan’s largest public-sector commercial bank acting as federal treasury agent with deep nationwide branch reach and strong sovereign asset exposure.',
  },
  {
    symbol: 'BAHL',
    name: 'Bank AL Habib Limited',
    sector: 'Banking',
    price: 114.6,
    changePercent: 1.42,
    annualDriftPercent: 31.5,
    volatility: 0.036,
    volume: 2_680_000,
    marketCapBillionsPkr: 127.4,
    peRatio: 3.41,
    epsPkr: 33.61,
    dividendYieldPercent: 12.22,
    week52High: 121.0,
    week52Low: 76.4,
    headquarters: 'Multan',
    foundedYear: 1991,
    description:
      'Commercial bank recognized for trade-finance leadership, conservative asset quality, and steady retail deposit mobilization.',
  },
  {
    symbol: 'BOP',
    name: 'The Bank of Punjab',
    sector: 'Banking',
    price: 9.85,
    changePercent: 5.12,
    annualDriftPercent: 64.0,
    volatility: 0.072,
    volume: 42_150_000,
    marketCapBillionsPkr: 32.2,
    peRatio: 2.48,
    epsPkr: 3.97,
    dividendYieldPercent: 10.15,
    week52High: 10.45,
    week52Low: 4.55,
    headquarters: 'Lahore',
    foundedYear: 1989,
    trending: true,
    description:
      'Provincial and commercial banking institution serving retail, agriculture, and SME lending corridors across Pakistan with high retail trading liquidity.',
  },
  {
    symbol: 'ATRL',
    name: 'Attock Refinery Limited',
    sector: 'Oil and Gas',
    price: 492.5,
    changePercent: -1.85,
    annualDriftPercent: 42.0,
    volatility: 0.068,
    volume: 3_120_000,
    marketCapBillionsPkr: 52.5,
    peRatio: 4.12,
    epsPkr: 119.54,
    dividendYieldPercent: 3.05,
    week52High: 534.0,
    week52Low: 298.0,
    headquarters: 'Rawalpindi',
    foundedYear: 1922,
    description:
      'Northern Pakistan crude oil refinery processing Potohar indigenous crude into motor gasoline, diesel, jet fuel, and specialty petroleum products.',
  },
  {
    symbol: 'PRL',
    name: 'Pakistan Refinery Limited',
    sector: 'Oil and Gas',
    price: 27.9,
    changePercent: -2.45,
    annualDriftPercent: 18.5,
    volatility: 0.074,
    volume: 18_740_000,
    marketCapBillionsPkr: 17.6,
    peRatio: 5.2,
    epsPkr: 5.37,
    dividendYieldPercent: 7.17,
    week52High: 33.4,
    week52Low: 21.1,
    headquarters: 'Karachi',
    foundedYear: 1960,
    description:
      'Coastal hydroskimming refinery supplying refined fuels to Karachi and southern distribution corridors, advancing brownfield refinery upgrade plans.',
  },
  {
    symbol: 'CHCC',
    name: 'Cherat Cement Company',
    sector: 'Cement',
    price: 248.0,
    changePercent: 2.31,
    annualDriftPercent: 54.0,
    volatility: 0.047,
    volume: 1_920_000,
    marketCapBillionsPkr: 48.2,
    peRatio: 7.1,
    epsPkr: 34.93,
    dividendYieldPercent: 2.22,
    week52High: 259.0,
    week52Low: 141.0,
    headquarters: 'Peshawar',
    foundedYear: 1981,
    description:
      'High-margin northern cement producer backed by solar and waste-heat captive power infrastructure serving domestic construction and Afghan export demand.',
  },
  {
    symbol: 'PIOC',
    name: 'Pioneer Cement Limited',
    sector: 'Cement',
    price: 198.4,
    changePercent: 1.69,
    annualDriftPercent: 62.5,
    volatility: 0.051,
    volume: 2_450_000,
    marketCapBillionsPkr: 45.1,
    peRatio: 8.15,
    epsPkr: 24.34,
    dividendYieldPercent: 7.56,
    week52High: 212.0,
    week52Low: 109.5,
    headquarters: 'Lahore',
    foundedYear: 1986,
    description:
      'Central-region cement manufacturer in Punjab benefiting from deleveraging, lower policy rates, and grid/captive coal power optimization.',
  },
  {
    symbol: 'NETSOL',
    name: 'NetSol Technologies Limited',
    sector: 'Technology',
    price: 138.75,
    changePercent: 1.95,
    annualDriftPercent: 26.8,
    volatility: 0.066,
    volume: 4_810_000,
    marketCapBillionsPkr: 12.2,
    peRatio: 9.8,
    epsPkr: 14.16,
    dividendYieldPercent: null,
    week52High: 155.0,
    week52Low: 92.4,
    headquarters: 'Lahore',
    foundedYear: 1996,
    description:
      'Enterprise asset-finance and leasing software provider exporting SaaS and licensing platforms to automotive and equipment finance firms globally.',
  },
  {
    symbol: 'KEL',
    name: 'K-Electric Limited',
    sector: 'Power and Energy',
    price: 4.92,
    changePercent: 2.71,
    annualDriftPercent: 19.0,
    volatility: 0.078,
    volume: 54_800_000,
    marketCapBillionsPkr: 135.9,
    peRatio: null,
    epsPkr: -0.38,
    dividendYieldPercent: null,
    week52High: 5.48,
    week52Low: 3.65,
    headquarters: 'Karachi',
    foundedYear: 1913,
    trending: true,
    description:
      'Vertically integrated electric utility generating, transmitting, and distributing power across Karachi and adjoining industrial corridors.',
  },
  {
    symbol: 'KAPCO',
    name: 'Kot Addu Power Company',
    sector: 'Power and Energy',
    price: 33.4,
    changePercent: -1.18,
    annualDriftPercent: 11.2,
    volatility: 0.044,
    volume: 5_140_000,
    marketCapBillionsPkr: 29.4,
    peRatio: 6.1,
    epsPkr: 5.48,
    dividendYieldPercent: 25.45,
    week52High: 37.8,
    week52Low: 26.2,
    headquarters: 'Lahore',
    foundedYear: 1996,
    description:
      'Multi-fuel power generation company holding substantial cash and sovereign-backed yields while evaluating power purchase renewal and diversification.',
  },
  {
    symbol: 'AGP',
    name: 'AGP Limited',
    sector: 'Pharmaceuticals',
    price: 148.2,
    changePercent: 2.14,
    annualDriftPercent: 74.0,
    volatility: 0.048,
    volume: 1_650_000,
    marketCapBillionsPkr: 41.5,
    peRatio: 16.4,
    epsPkr: 9.04,
    dividendYieldPercent: 1.69,
    week52High: 159.0,
    week52Low: 68.5,
    headquarters: 'Karachi',
    foundedYear: 2014,
    description:
      'Fast-growing Pakistani pharmaceutical manufacturer expanding branded generics across gastroenterology, cardiology, and gynecology portfolios.',
  },
  {
    symbol: 'HCAR',
    name: 'Honda Atlas Cars (Pakistan)',
    sector: 'Automobile',
    price: 286.5,
    changePercent: -0.87,
    annualDriftPercent: 34.0,
    volatility: 0.058,
    volume: 1_980_000,
    marketCapBillionsPkr: 40.9,
    peRatio: 12.9,
    epsPkr: 22.21,
    dividendYieldPercent: 2.27,
    week52High: 318.0,
    week52Low: 186.0,
    headquarters: 'Lahore',
    foundedYear: 1992,
    description:
      'Local assembler and distributor of Honda Civic, City, BR-V, and HR-V passenger vehicles with localized supply-chain operations near Lahore.',
  },
];

export const ILLUSTRATIVE_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Exploration & Production stocks lead index gains on circular-debt settlement outlook',
    source: 'GREENLINE Market Desk (Illustrative)',
    publishedAt: '2026-11-17T14:45:00+05:00',
    summary:
      'OGDC, PPL, and MARI attracted heavy institutional turnover in the afternoon session following market commentary on gas pricing reforms and cash-collection improvement.',
    symbols: ['OGDC', 'PPL', 'MARI'],
    sentimentHint: 'positive',
  },
  {
    id: 'news-2',
    title: 'Islamic banking & large-cap lenders extend advance amid steady net interest margins',
    source: 'GREENLINE Market Desk (Illustrative)',
    publishedAt: '2026-11-17T13:20:00+05:00',
    summary:
      'MEBL, HBL, and UBL traded higher as investors weighed dividend payout visibility against gradual monetary policy easing.',
    symbols: ['MEBL', 'HBL', 'UBL', 'MCB'],
    sentimentHint: 'positive',
  },
  {
    id: 'news-3',
    title: 'Power sector faces profit-taking after tariff renegotiation discussions',
    source: 'GREENLINE Market Desk (Illustrative)',
    publishedAt: '2026-11-17T12:10:00+05:00',
    summary:
      'HUBC slipped nearly 3% on elevated volume as traders reassessed future capacity-payment cash flows for legacy IPPs.',
    symbols: ['HUBC', 'PSO'],
    sentimentHint: 'negative',
  },
  {
    id: 'news-4',
    title: 'Tech & auto names diverge: SYS and SAZEW gain while TRG sees retail selling',
    source: 'GREENLINE Market Desk (Illustrative)',
    publishedAt: '2026-11-17T11:30:00+05:00',
    summary:
      'Export-oriented IT leader SYS and hybrid SUV assembler SAZEW posted gains, contrasting with short-term pressure in TRG and AIRLINK.',
    symbols: ['SYS', 'SAZEW', 'TRG', 'AIRLINK'],
    sentimentHint: 'neutral',
  },
  {
    id: 'news-5',
    title: 'Cement & pharma sectors monitor financing cost trajectory and input energy prices',
    source: 'GREENLINE Market Desk (Illustrative)',
    publishedAt: '2026-11-17T10:15:00+05:00',
    summary:
      'LUCK and MLCF edged higher on lower coal benchmarks while SEARL extended recovery post pharmaceutical pricing adjustments.',
    symbols: ['LUCK', 'MLCF', 'DGKC', 'SEARL', 'GLAXO'],
    sentimentHint: 'positive',
  },
];

export const ILLUSTRATIVE_INDICES: IndexQuote[] = [
  {
    symbol: 'KSE-100',
    name: 'Karachi Stock Exchange 100 Index',
    value: 94_826.45,
    change: 1_142.8,
    changePercent: 1.22,
    volumeMillions: 318.4,
    high: 95_040.1,
    low: 93_710.25,
    sparkline: [93420, 93680, 93590, 93940, 94210, 94530, 94826.45],
  },
  {
    symbol: 'KSE-30',
    name: 'KSE 30 Free-Float Index',
    value: 29_418.9,
    change: 312.45,
    changePercent: 1.07,
    volumeMillions: 142.8,
    high: 29_512.0,
    low: 29_105.4,
    sparkline: [29040, 29110, 29090, 29210, 29300, 29360, 29418.9],
  },
  {
    symbol: 'KMI-30',
    name: 'KSE Meezan 30 Islamic Index',
    value: 145_612.3,
    change: 2_190.15,
    changePercent: 1.53,
    volumeMillions: 184.2,
    high: 146_020.0,
    low: 143_520.8,
    sparkline: [143120, 143650, 143800, 144290, 144850, 145190, 145612.3],
  },
];

export const KSE100_HISTORY: Record<TimeRange, PricePoint[]> = buildAllHistories(
  'KSE100',
  94_826.45,
  1.22,
  48.6,
  0.035
);

export const STOCK_DETAILS: StockDetail[] = RAW_STOCKS.map((raw) => {
  const change = Number(((raw.price * raw.changePercent) / 100).toFixed(2));
  const history = buildAllHistories(
    raw.symbol,
    raw.price,
    raw.changePercent,
    raw.annualDriftPercent,
    raw.volatility
  );
  const sparkline = history['1W'].slice(-8).map((p) => p.price);
  const relatedNews = ILLUSTRATIVE_NEWS.filter((n) => n.symbols.includes(raw.symbol));

  return {
    symbol: raw.symbol,
    name: raw.name,
    sector: raw.sector,
    price: raw.price,
    change,
    changePercent: raw.changePercent,
    volume: raw.volume,
    marketCapBillionsPkr: raw.marketCapBillionsPkr,
    dividendYieldPercent: raw.dividendYieldPercent,
    peRatio: raw.peRatio,
    featured: raw.featured,
    trending: raw.trending,
    sparkline,
    description: raw.description,
    headquarters: raw.headquarters,
    foundedYear: raw.foundedYear,
    financials: {
      marketCapBillionsPkr: raw.marketCapBillionsPkr,
      peRatio: raw.peRatio,
      epsPkr: raw.epsPkr,
      dividendYieldPercent: raw.dividendYieldPercent,
      week52High: raw.week52High,
      week52Low: raw.week52Low,
      volume: raw.volume,
    },
    history,
    relatedNews,
  };
});

export const STOCK_SUMMARIES: StockSummary[] = STOCK_DETAILS.map((d) => ({
  symbol: d.symbol,
  name: d.name,
  sector: d.sector,
  price: d.price,
  change: d.change,
  changePercent: d.changePercent,
  volume: d.volume,
  marketCapBillionsPkr: d.marketCapBillionsPkr,
  dividendYieldPercent: d.dividendYieldPercent,
  peRatio: d.peRatio,
  featured: d.featured,
  trending: d.trending,
  sparkline: d.sparkline,
}));

export const SECTOR_PERFORMANCE: SectorPerformance[] = (() => {
  const sectors: PsxSector[] = [
    'Oil and Gas',
    'Banking',
    'Fertilizer',
    'Cement',
    'Automobile',
    'Pharmaceuticals',
    'Technology',
    'Power and Energy',
  ];
  const totalCap = STOCK_DETAILS.reduce(
    (sum, s) => sum + (s.marketCapBillionsPkr ?? 0),
    0
  );

  return sectors.map((sector) => {
    const items = STOCK_DETAILS.filter((s) => s.sector === sector);
    const avgChange =
      items.reduce((sum, s) => sum + s.changePercent, 0) / Math.max(1, items.length);
    const sectorCap = items.reduce((sum, s) => sum + (s.marketCapBillionsPkr ?? 0), 0);
    const advancers = items.filter((s) => s.changePercent > 0).length;
    const decliners = items.filter((s) => s.changePercent < 0).length;
    const top = [...items].sort((a, b) => b.changePercent - a.changePercent)[0];
    const volumeMillions =
      items.reduce((sum, s) => sum + s.volume, 0) / 1_000_000;

    return {
      sector,
      changePercent: Number(avgChange.toFixed(2)),
      marketCapSharePercent: Number(((sectorCap / Math.max(1, totalCap)) * 100).toFixed(1)),
      advancers,
      decliners,
      topStockSymbol: top?.symbol ?? '',
      volumeMillions: Number(volumeMillions.toFixed(2)),
    };
  });
})();
