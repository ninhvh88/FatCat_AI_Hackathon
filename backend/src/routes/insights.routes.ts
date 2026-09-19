import { Router, Request, Response } from 'express';
import { getProfile } from './dashboard.routes';
import { calculateFinancialEngine } from '../services/financial-engine';
import { generateInsights } from '../services/insight.service';
import { generateActionPlan } from '../services/action-plan.service';

// GET /api/insights/:userId
// GET /api/insights/:userId/action-plan
const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const engine = calculateFinancialEngine(profile);
    const insights = generateInsights(profile, engine);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get insights', message: (err as Error).message });
  }
});

router.get('/:userId/action-plan', async (req: Request, res: Response) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const engine = calculateFinancialEngine(profile);
    const actionPlan = generateActionPlan(profile, engine);
    res.json(actionPlan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get action plan', message: (err as Error).message });
  }
});

export default router;
