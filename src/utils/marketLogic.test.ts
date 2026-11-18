import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionTick,
  buildComparisonSeries,
  createPriceAlertRule,
  deriveDailySentimentSeries,
  doesPriceAlertTrigger,
  evaluatePriceAlerts,
  filterStocks,
  formatMarketCap,
  formatPKR,
  formatPercent,
  formatVolume,
  parsePriceAlertsJson,
  parseWatchlistJson,
  sortMovers,
  toggleWatchlistSymbol,
  validatePriceAlertInput,
} from './marketLogic';
import type { PricePoint, StockSummary } from '../types/market';

const SAMPLE_STOCKS: StockSummary[] = [
  {
    symbol: 'HBL',
    name: 'Habib Bank Limited',
    sector: 'Banking',
    price: 142.5,
    change: 3.2,
    changePercent: 2.3,
    volume: 4_500_000,
    marketCapBillionsPkr: 209.0,
    dividendYieldPercent: 11.2,
    peRatio: 4.1,
    trending: true,
    sparkline: [138, 140, 142.5],
  },
  {
    symbol: 'SYS',
    name: 'Systems Limited',
    sector: 'Technology',
    price: 518.0,
    change: -8.5,
    changePercent: -1.61,
    volume: 1_200_000,
    marketCapBillionsPkr: 151.0,
    dividendYieldPercent: 1.4,
    peRatio: 16.5,
    trending: true,
    sparkline: [528, 522, 518],
  },
  {
    symbol: 'OGDC',
    name: 'Oil & Gas Development Company',
    sector: 'Oil and Gas',
    price: 184.2,
    change: 7.1,
    changePercent: 4.01,
    volume: 9_800_000,
    marketCapBillionsPkr: 792.2,
    dividendYieldPercent: 6.8,
    peRatio: 3.9,
    sparkline: [176, 180, 184.2],
  },
  {
    symbol: 'TRG',
    name: 'TRG Pakistan Limited',
    sector: 'Technology',
    price: 58.4,
    change: -2.4,
    changePercent: -3.95,
    volume: 12_500_000,
    marketCapBillionsPkr: 31.8,
    dividendYieldPercent: null,
    peRatio: null,
    sparkline: [61, 59, 58.4],
  },
];

test('formatting helpers handle valid numbers and null/N/A gracefully', () => {
  assert.equal(formatPKR(142.5), 'PKR 142.50');
  assert.equal(formatPKR(null), 'N/A');
  assert.equal(formatPercent(2.3), '+2.30%');
  assert.equal(formatPercent(-1.61), '-1.61%');
  assert.equal(formatPercent(undefined), 'N/A');
  assert.equal(formatVolume(9_800_000), '9.80M');
  assert.equal(formatVolume(42_500), '42.5K');
  assert.equal(formatMarketCap(null), 'N/A');
});

test('filterStocks filters by query, sector, and discovery categories', () => {
  const byQuery = filterStocks(SAMPLE_STOCKS, { query: 'habib' });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].symbol, 'HBL');

  const byEnergy = filterStocks(SAMPLE_STOCKS, { category: 'energy' });
  assert.equal(byEnergy.length, 1);
  assert.equal(byEnergy[0].symbol, 'OGDC');

  const byDividend = filterStocks(SAMPLE_STOCKS, { category: 'dividend' });
  assert.deepEqual(
    byDividend.map((s) => s.symbol),
    ['HBL', 'OGDC']
  );

  const byGainers = filterStocks(SAMPLE_STOCKS, { category: 'gainers' });
  assert.deepEqual(
    byGainers.map((s) => s.symbol),
    ['OGDC', 'HBL']
  );
});

test('sortMovers orders gainers, losers, and active stocks properly', () => {
  const movers = sortMovers(SAMPLE_STOCKS, 2);
  assert.deepEqual(
    movers.gainers.map((s) => s.symbol),
    ['OGDC', 'HBL']
  );
  assert.deepEqual(
    movers.losers.map((s) => s.symbol),
    ['TRG', 'SYS']
  );
  assert.deepEqual(
    movers.active.map((s) => s.symbol),
    ['TRG', 'OGDC']
  );
});

test('buildComparisonSeries computes normalized percent return and raw price series', () => {
  const seriesA: PricePoint[] = [
    { date: 'Day 1', price: 100 },
    { date: 'Day 2', price: 110 },
  ];
  const seriesB: PricePoint[] = [
    { date: 'Day 1', price: 200 },
    { date: 'Day 2', price: 180 },
  ];

  const pct = buildComparisonSeries(seriesA, seriesB, 'percent');
  assert.equal(pct[0].valueA, 0);
  assert.equal(pct[0].valueB, 0);
  assert.equal(pct[1].valueA, 10);
  assert.equal(pct[1].valueB, -10);

  const raw = buildComparisonSeries(seriesA, seriesB, 'price');
  assert.equal(raw[1].valueA, 110);
  assert.equal(raw[1].valueB, 180);
});

test('watchlist helpers parse, deduplicate, and toggle symbols safely', () => {
  assert.deepEqual(parseWatchlistJson('["hbl", "SYS", "HBL", ""]'), ['HBL', 'SYS']);
  assert.deepEqual(parseWatchlistJson('invalid json'), []);
  const added = toggleWatchlistSymbol(['SYS'], 'hbl');
  assert.deepEqual(added, ['HBL', 'SYS']);
  const removed = toggleWatchlistSymbol(added, 'HBL');
  assert.deepEqual(removed, ['SYS']);
});

test('deriveDailySentimentSeries produces bounded scores and marks AI Brief on latest day', () => {
  const series: PricePoint[] = [
    { date: 'Nov 10', price: 92000 },
    { date: 'Nov 12', price: 93200 },
    { date: 'Nov 17', price: 94800 },
  ];
  const withoutBrief = deriveDailySentimentSeries(series, 15, 7, null);
  assert.equal(withoutBrief.length, 3);
  assert.equal(withoutBrief[2].source, 'Market Breadth');

  const withBrief = deriveDailySentimentSeries(series, 15, 7, {
    headline: 'Energy and banking stocks advance on strong gains',
    marketSummary: 'Broad rally lifted the benchmark higher.',
    positiveMoversNote: 'OGDC and MEBL posted strong gains.',
    negativeMoversNote: 'HUBC slipped slightly.',
    outlook: 'Constructive momentum.',
    insights: ['Positive breadth across large caps'],
  });
  assert.equal(withBrief[2].source, 'AI Brief');
  assert.ok(withBrief[2].score >= 15 && withBrief[2].score <= 95);
});

test('applySessionTick deterministically updates subset of stocks and records movers', () => {
  const { updatedStocks, changedMovers } = applySessionTick(SAMPLE_STOCKS, 0);
  assert.equal(updatedStocks.length, SAMPLE_STOCKS.length);
  assert.ok(changedMovers.length >= 1);
  assert.notEqual(changedMovers[0].stock.price, SAMPLE_STOCKS[0].price);
});

test('price alert validation and JSON parsing handle edge cases safely', () => {
  assert.equal(validatePriceAlertInput('').valid, false);
  assert.equal(validatePriceAlertInput('-10').valid, false);
  assert.equal(validatePriceAlertInput('0').valid, false);
  const ok = validatePriceAlertInput('145.556');
  assert.equal(ok.valid, true);
  assert.equal(ok.value, 145.56);

  const parsed = parsePriceAlertsJson(
    JSON.stringify([
      { id: 'a1', symbol: 'hbl', side: 'buy', targetPrice: 140 },
      { id: 'bad', symbol: 'SYS', side: 'hold', targetPrice: 500 },
      { id: 'bad2', symbol: 'OGDC', side: 'sell', targetPrice: -5 },
    ])
  );
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].symbol, 'HBL');
  assert.equal(parsed[0].active, true);
});

test('evaluatePriceAlerts triggers buy at/below target and sell at/above target exactly once until re-armed', () => {
  const buyHit = createPriceAlertRule('HBL', 'buy', 142.5, '2026-11-17T10:00:00Z');
  const buyMiss = createPriceAlertRule('HBL', 'buy', 135.0, '2026-11-17T10:00:00Z');
  const sellHit = createPriceAlertRule('OGDC', 'sell', 180.0, '2026-11-17T10:00:00Z');
  const sellMiss = createPriceAlertRule('SYS', 'sell', 550.0, '2026-11-17T10:00:00Z');

  assert.equal(doesPriceAlertTrigger(buyHit, 142.5), true);
  assert.equal(doesPriceAlertTrigger(buyMiss, 142.5), false);
  assert.equal(doesPriceAlertTrigger(sellHit, 184.2), true);
  assert.equal(doesPriceAlertTrigger(sellMiss, 518.0), false);

  const firstRun = evaluatePriceAlerts(
    [buyHit, buyMiss, sellHit, sellMiss],
    SAMPLE_STOCKS,
    '2026-11-17T10:05:00Z'
  );
  assert.equal(firstRun.triggered.length, 2);
  assert.deepEqual(
    firstRun.triggered.map((t) => `${t.alert.symbol}:${t.alert.side}`),
    ['HBL:buy', 'OGDC:sell']
  );
  assert.equal(firstRun.nextAlerts[0].active, false);
  assert.equal(firstRun.nextAlerts[0].triggeredPrice, 142.5);

  // Subsequent ticks must not re-fire already triggered alerts
  const secondRun = evaluatePriceAlerts(
    firstRun.nextAlerts,
    SAMPLE_STOCKS,
    '2026-11-17T10:06:00Z'
  );
  assert.equal(secondRun.triggered.length, 0);
});
