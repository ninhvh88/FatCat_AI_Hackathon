import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProfile } from './dashboard.routes';
import { simulateScenario, getPredefinedScenarios, calculateFinancialEngine } from '../services/financial-engine';
import { getGroupedScenarios } from '../services/financial-engine/scenario-simulator';
import { analyzeScenarioWithAI, analyzeScenarioStream } from '../services/ai/scenario-analysis';
import type { ScenarioConfig } from '../types';

// POST /api/scenarios/simulate
// GET  /api/scenarios/predefined
// GET  /api/scenarios/grouped
// GET  /api/scenarios/:userId/baseline
// POST /api/scenarios/ai-analyze  — simulation + AI analysis
const router = Router();

const scenarioSchema = z.object({
  userId: z.string(),
  scenarios: z.array(z.object({
    type: z.string(),
    label: z.string().optional(),
    params: z.record(z.string(), z.any()).optional(),
  })),
});

const aiAnalyzeSchema = z.object({
  userId: z.string(),
  type: z.string(),
  label: z.string().optional(),
  params: z.record(z.string(), z.any()).optional(),
  customQuestion: z.string().optional(),
});

// GET /api/scenarios/predefined
router.get('/predefined', (_req: Request, res: Response) => {
  res.json(getPredefinedScenarios());
});

// GET /api/scenarios/grouped — grouped scenario templates
router.get('/grouped', (_req: Request, res: Response) => {
  res.json(getGroupedScenarios());
});

// GET /api/scenarios/:userId/baseline
router.get('/:userId/baseline', async (req: Request, res: Response) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const baseline = calculateFinancialEngine(profile);
    res.json({ profile, baseline });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get baseline', message: (err as Error).message });
  }
});

// POST /api/scenarios/simulate
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const parsed = scenarioSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const baseline = calculateFinancialEngine(profile);
    const results = parsed.scenarios.map((s) => {
      const config: ScenarioConfig = {
        type: s.type as ScenarioConfig['type'],
        label: s.label || s.type,
        params: (s.params as Record<string, number>) ?? {},
      };
      return simulateScenario(profile, config);
    });

    res.json({ baseline, results });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to simulate scenario', message: (err as Error).message });
  }
});

// POST /api/scenarios/ai-analyze — run simulation + AI analysis
router.post('/ai-analyze', async (req: Request, res: Response) => {
  try {
    const parsed = aiAnalyzeSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Vui lòng tạo hồ sơ trước.' });
    }

    // Step 1: Run deterministic simulation (Financial Engine)
    const config: ScenarioConfig = {
      type: parsed.type as ScenarioConfig['type'],
      label: parsed.label || parsed.type,
      params: (parsed.params as Record<string, number>) ?? {},
    };
    const scenarioResult = simulateScenario(profile, config);

    // Step 2: AI analysis (LLM interprets the results)
    const aiAnalysis = await analyzeScenarioWithAI(profile, scenarioResult, parsed.customQuestion);

    // Step 3: Return both engine results + AI analysis
    res.json({
      scenarioResult,
      aiAnalysis,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to analyze scenario', message: (err as Error).message });
  }
});

// POST /api/scenarios/ai-analyze/stream — SSE streaming scenario analysis
// Events: thinking → metadata (scorecard + risk) → delta* → done | error
router.post('/ai-analyze/stream', async (req: Request, res: Response) => {
  try {
    const parsed = aiAnalyzeSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Vui lòng tạo hồ sơ trước.' });
    }

    // Step 1: Run deterministic simulation (Financial Engine)
    const config: ScenarioConfig = {
      type: parsed.type as ScenarioConfig['type'],
      label: parsed.label || parsed.type,
      params: (parsed.params as Record<string, number>) ?? {},
    };
    const scenarioResult = simulateScenario(profile, config);

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
    for await (const evt of analyzeScenarioStream(profile, scenarioResult, parsed.customQuestion)) {
      switch (evt.type) {
        case 'thinking':
          sendEvent('thinking', { message: evt.message });
          break;
        case 'metadata':
          sendEvent('metadata', { scorecard: evt.scorecard, riskLevel: evt.riskLevel, scenarioResult: evt.scenarioResult });
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
      res.status(500).json({ error: 'Failed to stream scenario analysis', message: (err as Error).message });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal error' })}\n\n`);
      res.end();
    }
  }
});

export default router;
