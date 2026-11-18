import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { STOCK_DETAILS } from './server/data/psxDataset';
import {
  GeminiServiceError,
  askGreenline,
  compareStocksAi,
  explainStockMovement,
  generateMarketBrief,
} from './server/services/geminiService';
import { psxDataService } from './server/services/psxDataService';
import type { DiscoveryCategory, PsxSector, TimeRange } from './src/types/market';

const PORT = 3000;
const VALID_TIME_RANGES = new Set<TimeRange>(['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'greenline-psx-api' });
  });

  // Market overview (indices, movers, sectors, KSE-100 series, news)
  app.get('/api/market/overview', async (_req, res) => {
    try {
      const overview = await psxDataService.getMarketOverview();
      res.json(overview);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load market overview.',
      });
    }
  });

  // Search & discovery stock list
  app.get('/api/stocks', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const sector = typeof req.query.sector === 'string' ? (req.query.sector as PsxSector | 'All') : undefined;
      const category =
        typeof req.query.category === 'string' ? (req.query.category as DiscoveryCategory) : undefined;
      const data = await psxDataService.getStocks({ q, sector, category });
      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to query stocks.',
      });
    }
  });

  // Individual stock profile
  app.get('/api/stocks/:symbol', async (req, res) => {
    try {
      const result = await psxDataService.getStockBySymbol(req.params.symbol);
      if (!result) {
        res.status(404).json({ error: `Stock symbol "${req.params.symbol}" not found on GREENLINE.` });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load stock profile.',
      });
    }
  });

  // Sectors overview
  app.get('/api/sectors', async (_req, res) => {
    try {
      const data = await psxDataService.getSectors();
      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load sectors.',
      });
    }
  });

  // AI: Daily Market Brief
  app.post('/api/ai/brief', async (_req, res) => {
    try {
      const overview = await psxDataService.getMarketOverview();
      const brief = await generateMarketBrief(overview);
      res.json(brief);
    } catch (err) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Failed to generate AI market brief.',
      });
    }
  });

  // AI: Explain Stock Movement
  app.post('/api/ai/explain-stock', async (req, res) => {
    try {
      const symbol = typeof req.body?.symbol === 'string' ? req.body.symbol : '';
      const rawRange = typeof req.body?.timeframe === 'string' ? req.body.timeframe : '1M';
      const timeframe: TimeRange = VALID_TIME_RANGES.has(rawRange as TimeRange)
        ? (rawRange as TimeRange)
        : '1M';
      if (!symbol.trim()) {
        res.status(400).json({ error: 'Stock symbol is required.' });
        return;
      }
      const stockResult = await psxDataService.getStockBySymbol(symbol);
      if (!stockResult) {
        res.status(404).json({ error: `Stock "${symbol}" not found.` });
        return;
      }
      const analysis = await explainStockMovement(stockResult.stock, timeframe);
      res.json(analysis);
    } catch (err) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Failed to explain stock movement.',
      });
    }
  });

  // AI: Compare Two Stocks
  app.post('/api/ai/compare', async (req, res) => {
    try {
      const symbolA = typeof req.body?.symbolA === 'string' ? req.body.symbolA : '';
      const symbolB = typeof req.body?.symbolB === 'string' ? req.body.symbolB : '';
      if (!symbolA.trim() || !symbolB.trim()) {
        res.status(400).json({ error: 'Both symbolA and symbolB are required.' });
        return;
      }
      const [resA, resB] = await Promise.all([
        psxDataService.getStockBySymbol(symbolA),
        psxDataService.getStockBySymbol(symbolB),
      ]);
      if (!resA || !resB) {
        res.status(404).json({ error: 'One or both selected PSX symbols could not be found.' });
        return;
      }
      const comparison = await compareStocksAi(resA.stock, resB.stock);
      res.json(comparison);
    } catch (err) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Failed to generate AI comparison.',
      });
    }
  });

  // AI: Ask GREENLINE Conversational Q&A
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
      const history = rawHistory
        .filter(
          (item: unknown): item is { role: 'user' | 'assistant'; content: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as { role?: unknown }).role === 'user' ||
              (item as { role?: unknown }).role === 'assistant') &&
            typeof (item as { content?: unknown }).content === 'string'
        )
        .slice(-10)
        .map((item: { role: 'user' | 'assistant'; content: string }) => ({
          role: item.role,
          content: item.content.slice(0, 1500),
        }));
      if (!question) {
        res.status(400).json({ error: 'Please enter a question for Ask GREENLINE.' });
        return;
      }
      const overview = await psxDataService.getMarketOverview();
      const reply = await askGreenline(question, history, overview, STOCK_DETAILS);
      res.json(reply);
    } catch (err) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Ask GREENLINE encountered an error.',
      });
    }
  });

  // Unknown API route guard
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Frontend serving (Vite dev middleware in dev, static dist in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GREENLINE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
