import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { createDemoProfile, DEMO_USER_ID } from '../utils/demo-data';
import { calculateFinancialEngine } from '../services/financial-engine';
import { generateInsights } from '../services/insight.service';
import { generateActionPlan } from '../services/action-plan.service';
import { dbToProfile } from './profile.routes';
import { getProfileFromStore, isDemoUserId } from '../services/profile-store';
import type { FinancialProfile, DashboardData } from '../types';

// GET /api/dashboard/:userId
const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const engineResult = calculateFinancialEngine(profile);
    const insights = generateInsights(profile, engineResult);
    const actionPlan = generateActionPlan(profile, engineResult);

    const dashboard: DashboardData = {
      profile,
      engineResult,
      insights,
      actionPlan,
    };

    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dashboard', message: (err as Error).message });
  }
});

export async function getProfile(userId: string): Promise<FinancialProfile | null> {
  // Try DB first
  try {
    const dbProfile = await prisma.financialProfile.findFirst({
      where: { userId },
      include: { goals: true },
    });
    if (dbProfile) {
      return dbToProfile(dbProfile);
    }
  } catch {
    // DB not available, fall through to in-memory store
  }

  // Try in-memory store (covers custom profiles created without DB)
  const memProfile = getProfileFromStore(userId);
  if (memProfile) {
    return memProfile;
  }

  // Fall back to demo profile
  if (isDemoUserId(userId)) {
    return createDemoProfile(DEMO_USER_ID);
  }

  return null;
}

export default router;
