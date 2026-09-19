import { Router, Request, Response } from 'express';
import { getProfile } from './dashboard.routes';
import { calculateFinancialHealth, calculateFinancialEngine } from '../services/financial-engine';

// GET /api/financial-health/:userId
const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const health = calculateFinancialHealth(profile);
    const engine = calculateFinancialEngine(profile);

    res.json({
      health,
      cashFlow: engine.cashFlow,
      netWorth: engine.netWorth,
      debtRatio: engine.debtRatio,
      emergencyFund: engine.emergencyFund,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get financial health', message: (err as Error).message });
  }
});

export default router;
