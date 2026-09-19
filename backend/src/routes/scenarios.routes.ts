import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProfile } from './dashboard.routes';
import { simulateScenario, getPredefinedScenarios, calculateFinancialEngine } from '../services/financial-engine';
import type { ScenarioConfig } from '../types';

// POST /api/scenarios/simulate
// GET /api/scenarios/predefined
// GET /api/scenarios/:userId/baseline
const router = Router();

const scenarioSchema = z.object({
  userId: z.string(),
  scenarios: z.array(z.object({
    type: z.string(),
    label: z.string().optional(),
    params: z.record(z.string(), z.any()).optional(),
  })),
});

// GET /api/scenarios/predefined
router.get('/predefined', (_req: Request, res: Response) => {
  res.json(getPredefinedScenarios());
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

export default router;
