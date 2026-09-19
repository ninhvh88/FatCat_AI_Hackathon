import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { getProfile } from './dashboard.routes';
import { calculateGoalProjection, calculateAllGoalProjections } from '../services/financial-engine';
import type { FinancialGoal } from '../types';

// POST /api/goals — add a goal
// GET /api/goals/:userId — list goals with projections
// GET /api/goals/:userId/projection — goal projections with 3 scenarios
const router = Router();

const goalSchema = z.object({
  userId: z.string(),
  profileId: z.string().optional(),
  goalType: z.string(),
  goalName: z.string(),
  targetAmount: z.number().min(0),
  targetDate: z.string(),
  currentAllocated: z.number().min(0).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = goalSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Save goal to DB if profile exists
    if (profile.id) {
      const goal = await prisma.financialGoal.create({
        data: {
          profileId: profile.id,
          goalType: parsed.goalType,
          goalName: parsed.goalName,
          targetAmount: parsed.targetAmount,
          targetDate: new Date(parsed.targetDate),
          currentAllocated: parsed.currentAllocated ?? 0,
        },
      });
      return res.status(201).json({ id: goal.id, message: 'Goal created' });
    }

    // Return projection for non-DB profile
    const goal: FinancialGoal = {
      goalType: parsed.goalType as any,
      goalName: parsed.goalName,
      targetAmount: parsed.targetAmount,
      targetDate: parsed.targetDate,
      currentAllocated: parsed.currentAllocated ?? 0,
    };
    const projection = calculateGoalProjection(profile, goal);
    res.status(201).json({ goal, projection });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to create goal', message: (err as Error).message });
  }
});

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const projections = calculateAllGoalProjections(profile);
    res.json({ goals: profile.goals, projections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get goals', message: (err as Error).message });
  }
});

// Goal projection with 3 scenarios: Conservative, Base, Optimistic
router.get('/:userId/projection', async (req: Request, res: Response) => {
  try {
    const profile = await getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.goals.length === 0) {
      return res.json({ scenarios: [], message: 'No goals found' });
    }

    const goal = profile.goals[0];
    const baseProjection = calculateGoalProjection(profile, goal);

    // Conservative: 80% of free cash flow
    const conservativeProfile = { ...profile, income: { ...profile.income } };
    const conservativeGoal = { ...goal };
    const conservativeProjection = calculateGoalProjection(
      { ...profile, income: { ...profile.income, monthlyIncome: profile.income.monthlyIncome * 0.8 } },
      conservativeGoal
    );

    // Optimistic: 120% of free cash flow
    const optimisticProjection = calculateGoalProjection(
      { ...profile, income: { ...profile.income, monthlyIncome: profile.income.monthlyIncome * 1.2 } },
      goal
    );

    res.json({
      goal,
      scenarios: [
        {
          name: 'Conservative',
          label: 'Bảo thủ',
          monthlySaving: conservativeProjection.monthlySavingCapacity,
          projection: conservativeProjection,
        },
        {
          name: 'Base',
          label: 'Cơ sở',
          monthlySaving: baseProjection.monthlySavingCapacity,
          projection: baseProjection,
        },
        {
          name: 'Optimistic',
          label: 'Lạc quan',
          monthlySaving: optimisticProjection.monthlySavingCapacity,
          projection: optimisticProjection,
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get goal projection', message: (err as Error).message });
  }
});

export default router;
