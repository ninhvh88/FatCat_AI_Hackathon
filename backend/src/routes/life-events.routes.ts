import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProfile } from './dashboard.routes';
import {
  simulateLifeEvent,
  getDefaultAssumptions,
  getLifeEventLabels,
  calculateAffordability,
  calculateLoanBurden,
} from '../services/financial-engine';
import { analyzeEventWithAI, analyzeEventStream, getMarketEventTemplates } from '../services/ai/event-analysis';
import type { LifeEventType } from '../types';

// ============================================================
// Life Events & Advanced Simulation Routes
// GET  /types, GET /market-events
// POST /simulate, POST /ai-analyze, POST /affordability, POST /loan-burden
// ============================================================

const router = Router();

// GET /api/life-events/types — list available life event types
router.get('/types', (_req: Request, res: Response) => {
  const labels = getLifeEventLabels();
  const result = labels.map((l) => ({
    ...l,
    defaultAssumptions: getDefaultAssumptions(l.type as LifeEventType),
  }));
  res.json(result);
});

// GET /api/life-events/market-events — market event templates
router.get('/market-events', (_req: Request, res: Response) => {
  res.json(getMarketEventTemplates());
});

// POST /api/life-events/simulate — simulate a life event
const lifeEventSchema = z.object({
  userId: z.string(),
  type: z.string(),
  label: z.string().optional(),
  assumptions: z.record(z.string(), z.number()).optional(),
});

router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const parsed = lifeEventSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const type = parsed.type as LifeEventType;
    const assumptions = parsed.assumptions ?? getDefaultAssumptions(type);

    const result = simulateLifeEvent(profile, {
      type,
      label: parsed.label || type,
      assumptions,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to simulate life event', message: (err as Error).message });
  }
});

// POST /api/life-events/ai-analyze — simulate + AI personalized impact analysis
const aiAnalyzeEventSchema = z.object({
  userId: z.string(),
  type: z.string(),
  label: z.string().optional(),
  assumptions: z.record(z.string(), z.number()).optional(),
  customQuestion: z.string().optional(),
});

router.post('/ai-analyze', async (req: Request, res: Response) => {
  try {
    const parsed = aiAnalyzeEventSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Vui lòng tạo hồ sơ trước.' });
    }

    const type = parsed.type as LifeEventType;
    const assumptions = parsed.assumptions ?? getDefaultAssumptions(type);
    const label = parsed.label || type;

    // Step 1: Run deterministic simulation (Financial Engine)
    const eventImpact = simulateLifeEvent(profile, { type, label, assumptions });

    // Step 2: AI analysis (LLM interprets personalized impact)
    const aiAnalysis = await analyzeEventWithAI(profile, eventImpact, type, label, parsed.customQuestion);

    // Step 3: Return both engine results + AI analysis
    res.json({
      eventImpact,
      aiAnalysis,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to analyze event', message: (err as Error).message });
  }
});

// POST /api/life-events/ai-analyze/stream — SSE streaming event analysis
// Events: thinking → metadata (metrics + impact) → delta* → done | error
router.post('/ai-analyze/stream', async (req: Request, res: Response) => {
  try {
    const parsed = aiAnalyzeEventSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Vui lòng tạo hồ sơ trước.' });
    }

    const type = parsed.type as LifeEventType;
    const assumptions = parsed.assumptions ?? getDefaultAssumptions(type);
    const label = parsed.label || type;

    // Step 1: Run deterministic simulation (Financial Engine)
    const eventImpact = simulateLifeEvent(profile, { type, label, assumptions });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Step 2: Stream AI analysis
    for await (const evt of analyzeEventStream(profile, eventImpact, type, label, parsed.customQuestion)) {
      switch (evt.type) {
        case 'thinking':
          sendEvent('thinking', { message: evt.message });
          break;
        case 'metadata':
          sendEvent('metadata', { metrics: evt.metrics, impactLevel: evt.impactLevel, eventImpact: evt.eventImpact });
          break;
        case 'delta':
          sendEvent('delta', { content: evt.content });
          break;
        case 'done':
          sendEvent('done', { analysis: evt.analysis });
          break;
        case 'error':
          sendEvent('error', { message: evt.message });
          break;
      }
    }

    res.end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream event analysis', message: (err as Error).message });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal error' })}\n\n`);
      res.end();
    }
  }
});

// POST /api/life-events/affordability — check affordability of a purchase
const affordabilitySchema = z.object({
  userId: z.string(),
  price: z.number().positive(),
  downPayment: z.number().min(0),
  interestRate: z.number().min(0),
  loanTermMonths: z.number().positive(),
});

router.post('/affordability', async (req: Request, res: Response) => {
  try {
    const parsed = affordabilitySchema.parse(req.body);
    const profile = await getProfile(parsed.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const result = calculateAffordability(profile, {
      price: parsed.price,
      downPayment: parsed.downPayment,
      interestRate: parsed.interestRate,
      loanTermMonths: parsed.loanTermMonths,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to calculate affordability', message: (err as Error).message });
  }
});

// POST /api/life-events/loan-burden — check loan burden
const loanBurdenSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
  interestRate: z.number().min(0),
  loanTermMonths: z.number().positive(),
});

router.post('/loan-burden', async (req: Request, res: Response) => {
  try {
    const parsed = loanBurdenSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const result = calculateLoanBurden(profile, {
      amount: parsed.amount,
      interestRate: parsed.interestRate,
      loanTermMonths: parsed.loanTermMonths,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to calculate loan burden', message: (err as Error).message });
  }
});

export default router;
