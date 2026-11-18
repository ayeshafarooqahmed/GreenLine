import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AiBriefResponse,
  AiComparisonResponse,
  AiStockAnalysisResponse,
  ChatMessage,
  MarketOverviewResponse,
  StockDetail,
  TimeRange,
} from '../../src/types/market';

const MODEL_NAME = 'gemini-4-hydrogen';

export class GeminiServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to enable live AI intelligence.',
      503
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseJsonSafely<T>(rawText: string | undefined, fallback: T): T {
  const cleaned = (rawText ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  if (!cleaned) return fallback;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiServiceError('Gemini returned malformed JSON. Please retry.', 502);
  }
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('free tier is not available') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('NOT_FOUND')
  ) {
    return false;
  }
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNRESET')
  );
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1 || !isRetryableGeminiError(err)) {
        throw err;
      }
      const delayMs = 350 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function handleGeminiError(err: unknown): never {
  if (err instanceof GeminiServiceError) {
    throw err;
  }
  const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
  console.error('[GeminiService]', message);
  if (message.includes('free tier is not available') || message.includes('billing')) {
    throw new GeminiServiceError(
      'The Gemini API free tier is not available for this project. Please select a billing-enabled API key in Settings > Secrets.',
      403
    );
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
    throw new GeminiServiceError(
      'Gemini API authentication failed. Please check your GEMINI_API_KEY in Settings > Secrets.',
      403
    );
  }
  if (message.includes('NOT_FOUND') || message.includes('404')) {
    throw new GeminiServiceError(
      'The configured Gemini model was not found or is unsupported for this key.',
      404
    );
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    throw new GeminiServiceError(
      'Gemini API rate limit reached. Please try again in a few moments.',
      429
    );
  }
  throw new GeminiServiceError(`AI generation failed: ${message}`, 502);
}

export async function generateMarketBrief(
  overview: MarketOverviewResponse
): Promise<AiBriefResponse> {
  const ai = getAiClient();

  const contextPayload = {
    dataMode: overview.meta.dataMode,
    asOfTimestamp: overview.meta.asOfTimestamp,
    indices: overview.indices.map((i) => ({
      symbol: i.symbol,
      value: i.value,
      changePercent: i.changePercent,
      volumeMillions: i.volumeMillions,
    })),
    breadth: {
      advancers: overview.advancersCount,
      decliners: overview.declinersCount,
      unchanged: overview.unchangedCount,
      totalVolumeMillions: overview.totalVolumeMillions,
    },
    topGainers: overview.gainers.map((g) => ({
      symbol: g.symbol,
      name: g.name,
      sector: g.sector,
      pricePkr: g.price,
      changePercent: g.changePercent,
    })),
    topLosers: overview.losers.map((l) => ({
      symbol: l.symbol,
      name: l.name,
      sector: l.sector,
      pricePkr: l.price,
      changePercent: l.changePercent,
    })),
    sectors: overview.sectors,
    news: overview.news.map((n) => ({
      title: n.title,
      summary: n.summary,
      symbols: n.symbols,
    })),
  };

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Generate a concise Pakistan Stock Exchange (PSX) briefing based strictly on the supplied market snapshot:\n\n${JSON.stringify(contextPayload)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are GREENLINE, a financial intelligence analyst for the Pakistan Stock Exchange (PSX). ' +
            'Summarize ONLY the provided data. Never invent news, macro announcements, or prices not present in the JSON. ' +
            'Keep every string crisp, readable, and free of filler or investment advice. ' +
            'Include 3 punchy bullet insights in the `insights` array.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING, description: 'Short 6-10 word editorial headline summarizing the session.' },
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 concise insights highlighting key index, sector, and mover dynamics.',
              },
              marketSummary: { type: Type.STRING, description: '2-3 sentence overall PSX session summary.' },
              positiveMoversNote: { type: Type.STRING, description: '1-2 sentences covering major advancing stocks/sectors.' },
              negativeMoversNote: { type: Type.STRING, description: '1-2 sentences covering major declining stocks/sectors.' },
              keyDevelopments: { type: Type.STRING, description: '1-2 sentences summarizing the supplied market developments.' },
              outlook: { type: Type.STRING, description: '1-2 sentence neutral observation strictly grounded in supplied data without price targets or buy/sell advice.' },
            },
            required: [
              'headline',
              'insights',
              'marketSummary',
              'positiveMoversNote',
              'negativeMoversNote',
              'keyDevelopments',
              'outlook',
            ],
          },
        },
      })
    );

    const parsed = parseJsonSafely<Partial<AiBriefResponse>>(response.text, {});
    return {
      headline: parsed.headline ?? 'PSX Market Session Summary',
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
      marketSummary: parsed.marketSummary ?? '',
      positiveMoversNote: parsed.positiveMoversNote ?? '',
      negativeMoversNote: parsed.negativeMoversNote ?? '',
      keyDevelopments: parsed.keyDevelopments ?? '',
      outlook: parsed.outlook ?? '',
      generatedAt: new Date().toISOString(),
      dataMode: overview.meta.dataMode,
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function explainStockMovement(
  stock: StockDetail,
  timeframe: TimeRange
): Promise<AiStockAnalysisResponse> {
  const ai = getAiClient();
  const series = stock.history[timeframe] ?? stock.history['1M'];
  const periodStart = series[0]?.price ?? stock.price;
  const periodEnd = series[series.length - 1]?.price ?? stock.price;
  const periodChangePct = periodStart > 0 ? Number((((periodEnd - periodStart) / periodStart) * 100).toFixed(2)) : 0;

  const payload = {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    currentPricePkr: stock.price,
    dailyChangePkr: stock.change,
    dailyChangePercent: stock.changePercent,
    selectedTimeframe: timeframe,
    periodStartPricePkr: periodStart,
    periodReturnPercent: periodChangePct,
    financials: stock.financials,
    companyDescription: stock.description,
    relatedNews: stock.relatedNews,
  };

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Analyze this PSX stock's movement and metrics strictly from the provided payload:\n\n${JSON.stringify(payload)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are GREENLINE, a PSX equity intelligence analyst. ' +
            'Clearly distinguish verified supplied data (prices, ratios, supplied news headlines) from analytical interpretation. ' +
            'Never invent corporate filings, earnings dates, or news events. ' +
            'Explicitly state in dataLimitations where supplied data is illustrative or lacks full financial statements/intraday order flow. ' +
            'Do not issue buy/sell recommendations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              movementOverview: { type: Type.STRING, description: 'Concise factual summary of daily and selected-timeframe price movement.' },
              contributingFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 possible contributing factors clearly framed as interpretation based on sector/news context.',
              },
              newsContext: { type: Type.STRING, description: 'Summary of supplied news items, or explicit statement if none are available.' },
              performanceObservations: { type: Type.STRING, description: 'Observations on valuation (P/E, dividend yield, 52W range) from supplied metrics, noting any N/A fields.' },
              riskFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 balanced risk factors relevant to this PSX sector/company.',
              },
              dataLimitations: { type: Type.STRING, description: 'Explicit note on gaps or illustrative nature of supplied dataset.' },
            },
            required: [
              'movementOverview',
              'contributingFactors',
              'newsContext',
              'performanceObservations',
              'riskFactors',
              'dataLimitations',
            ],
          },
        },
      })
    );

    const parsed = parseJsonSafely<Partial<AiStockAnalysisResponse>>(response.text, {});
    return {
      symbol: stock.symbol,
      movementOverview: parsed.movementOverview ?? '',
      contributingFactors: Array.isArray(parsed.contributingFactors) ? parsed.contributingFactors : [],
      newsContext: parsed.newsContext ?? '',
      performanceObservations: parsed.performanceObservations ?? '',
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      dataLimitations: parsed.dataLimitations ?? '',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function compareStocksAi(
  stockA: StockDetail,
  stockB: StockDetail
): Promise<AiComparisonResponse> {
  const ai = getAiClient();

  const summarizeForPrompt = (s: StockDetail) => {
    const hist1Y = s.history['1Y'];
    const start1Y = hist1Y[0]?.price ?? s.price;
    const return1Y = start1Y > 0 ? Number((((s.price - start1Y) / start1Y) * 100).toFixed(2)) : 0;
    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      pricePkr: s.price,
      dailyChangePercent: s.changePercent,
      oneYearReturnPercent: return1Y,
      financials: s.financials,
      description: s.description,
    };
  };

  const payload = {
    stockA: summarizeForPrompt(stockA),
    stockB: summarizeForPrompt(stockB),
  };

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Compare these two PSX-listed companies strictly using the supplied metrics and historical returns:\n\n${JSON.stringify(payload)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are GREENLINE, a PSX equity comparison analyst. ' +
            'Compare performance differences, valuation ratios (P/E, EPS, dividend yield, market cap), strengths, weaknesses, risk factors, and data limitations. ' +
            'Explicitly handle any null/N/A metrics without inventing numbers. Do NOT recommend buying or selling either stock.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              performanceComparison: { type: Type.STRING },
              financialMetricsComparison: { type: Type.STRING },
              strengthsAndWeaknesses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['symbol', 'strengths', 'weaknesses'],
                },
              },
              riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              dataLimitations: { type: Type.STRING },
            },
            required: [
              'executiveSummary',
              'performanceComparison',
              'financialMetricsComparison',
              'strengthsAndWeaknesses',
              'riskFactors',
              'dataLimitations',
            ],
          },
        },
      })
    );

    const parsed = parseJsonSafely<Partial<AiComparisonResponse>>(response.text, {});
    return {
      symbolA: stockA.symbol,
      symbolB: stockB.symbol,
      executiveSummary: parsed.executiveSummary ?? '',
      performanceComparison: parsed.performanceComparison ?? '',
      financialMetricsComparison: parsed.financialMetricsComparison ?? '',
      strengthsAndWeaknesses: Array.isArray(parsed.strengthsAndWeaknesses)
        ? parsed.strengthsAndWeaknesses
        : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      dataLimitations: parsed.dataLimitations ?? '',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function askGreenline(
  question: string,
  history: Pick<ChatMessage, 'role' | 'content'>[],
  overview: MarketOverviewResponse,
  allStocks: StockDetail[]
): Promise<{ answer: string; answeredAt: string }> {
  const ai = getAiClient();

  const marketSnapshot = {
    dataMode: overview.meta.dataMode,
    asOf: overview.meta.asOfTimestamp,
    indices: overview.indices.map((i) => ({
      symbol: i.symbol,
      value: i.value,
      changePercent: i.changePercent,
    })),
    sectors: overview.sectors.map((s) => ({
      sector: s.sector,
      changePercent: s.changePercent,
      topStock: s.topStockSymbol,
    })),
    stocks: allStocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      pricePkr: s.price,
      changePct: s.changePercent,
      pe: s.financials.peRatio,
      eps: s.financials.epsPkr,
      divYieldPct: s.financials.dividendYieldPercent,
      mktCapBillions: s.financials.marketCapBillionsPkr,
    })),
    recentNews: overview.news.map((n) => n.title),
  };

  const recentTurns = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'GREENLINE'}: ${m.content}`)
    .join('\n');

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents:
          `PSX Application Context (${overview.meta.dataLabel}):\n${JSON.stringify(marketSnapshot)}\n\n` +
          (recentTurns ? `Conversation so far:\n${recentTurns}\n\n` : '') +
          `User Question: ${question}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are Ask GREENLINE, a concise, educational financial intelligence assistant for the Pakistan Stock Exchange (PSX). ' +
            'For questions about PSX indices, stocks, or today’s session, use the supplied PSX Application Context and clearly note that figures come from the current dataset. ' +
            'For general financial education concepts (e.g., P/E ratio, dividend yield, KSE-100 mechanics), explain clearly in simple, beginner-friendly language with brief PSX examples. ' +
            'Keep answers concise (under 180 words unless a comparison requires slightly more structure), use clean plain text or simple bullet points, and never give personalized buy/sell financial advice.',
        },
      })
    );

    return {
      answer: (response.text ?? 'Unable to generate a response.').trim(),
      answeredAt: new Date().toISOString(),
    };
  } catch (err) {
    handleGeminiError(err);
  }
}
