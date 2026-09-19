import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { createDemoProfile, DEMO_USER_ID } from '../utils/demo-data';
import type { FinancialProfile } from '../types';

// ============================================================
// Profile Routes
// POST /api/profile — create/update profile
// GET /api/profile/:userId — get profile
// GET /api/profile/demo — get demo profile
// POST /api/profile/demo — load demo persona
// ============================================================

const router = Router();

const profileSchema = z.object({
  userId: z.string().optional(),
  personal: z.object({
    age: z.number().min(18).max(100),
    maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']),
    dependents: z.number().min(0).max(20),
  }),
  income: z.object({
    monthlyIncome: z.number().min(0),
    otherIncome: z.number().min(0).default(0),
  }),
  expenses: z.object({
    housing: z.number().min(0).default(0),
    food: z.number().min(0).default(0),
    transportation: z.number().min(0).default(0),
    family: z.number().min(0).default(0),
    entertainment: z.number().min(0).default(0),
    other: z.number().min(0).default(0),
  }),
  assets: z.object({
    cash: z.number().min(0).default(0),
    savings: z.number().min(0).default(0),
    stocks: z.number().min(0).default(0),
    realEstate: z.number().min(0).default(0),
    other: z.number().min(0).default(0),
  }),
  liabilities: z.object({
    loanBalance: z.number().min(0).default(0),
    interestRate: z.number().min(0).max(100).default(0),
    monthlyRepayment: z.number().min(0).default(0),
  }),
  goals: z.array(z.object({
    goalType: z.string(),
    goalName: z.string(),
    targetAmount: z.number().min(0),
    targetDate: z.string(),
    currentAllocated: z.number().min(0).optional(),
  })).default([]),
});

// GET /api/profile/demo
router.get('/demo', (_req: Request, res: Response) => {
  const profile = createDemoProfile();
  res.json(profile);
});

// POST /api/profile/demo — create demo user + profile in DB
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const userId = DEMO_USER_ID;
    const demoProfile = createDemoProfile(userId);

    // Upsert user
    await prisma.user.upsert({
      where: { id: userId },
      update: { name: 'Nguyễn Minh Anh' },
      create: { id: userId, name: 'Nguyễn Minh Anh' },
    });

    // Delete existing profile
    await prisma.financialProfile.deleteMany({ where: { userId } });

    // Create profile
    const profile = await prisma.financialProfile.create({
      data: {
        userId,
        age: demoProfile.personal.age,
        maritalStatus: demoProfile.personal.maritalStatus,
        dependents: demoProfile.personal.dependents,
        monthlyIncome: demoProfile.income.monthlyIncome,
        otherIncome: demoProfile.income.otherIncome,
        housing: demoProfile.expenses.housing,
        food: demoProfile.expenses.food,
        transportation: demoProfile.expenses.transportation,
        family: demoProfile.expenses.family,
        entertainment: demoProfile.expenses.entertainment,
        otherExpense: demoProfile.expenses.other,
        cash: demoProfile.assets.cash,
        savings: demoProfile.assets.savings,
        stocks: demoProfile.assets.stocks,
        realEstate: demoProfile.assets.realEstate,
        otherAsset: demoProfile.assets.other,
        loanBalance: demoProfile.liabilities.loanBalance,
        interestRate: demoProfile.liabilities.interestRate,
        monthlyRepayment: demoProfile.liabilities.monthlyRepayment,
        goals: {
          create: demoProfile.goals.map((g) => ({
            goalType: g.goalType,
            goalName: g.goalName,
            targetAmount: g.targetAmount,
            targetDate: new Date(g.targetDate),
            currentAllocated: g.currentAllocated ?? 0,
          })),
        },
      },
    });

    res.json({ userId, profileId: profile.id, message: 'Demo persona loaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load demo persona', message: (err as Error).message });
  }
});

// GET /api/profile/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dbProfile = await prisma.financialProfile.findFirst({
      where: { userId },
      include: { goals: true },
    });

    if (!dbProfile) {
      // If demo user, return demo profile without DB
      if (userId === DEMO_USER_ID) {
        return res.json(createDemoProfile(userId));
      }
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = dbToProfile(dbProfile);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile', message: (err as Error).message });
  }
});

// POST /api/profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = profileSchema.parse(req.body);
    const userId = parsed.userId || `user-${Date.now()}`;

    // Upsert user
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Delete existing profile
    await prisma.financialProfile.deleteMany({ where: { userId } });

    // Create new profile
    const profile = await prisma.financialProfile.create({
      data: {
        userId,
        age: parsed.personal.age,
        maritalStatus: parsed.personal.maritalStatus,
        dependents: parsed.personal.dependents,
        monthlyIncome: parsed.income.monthlyIncome,
        otherIncome: parsed.income.otherIncome,
        housing: parsed.expenses.housing,
        food: parsed.expenses.food,
        transportation: parsed.expenses.transportation,
        family: parsed.expenses.family,
        entertainment: parsed.expenses.entertainment,
        otherExpense: parsed.expenses.other,
        cash: parsed.assets.cash,
        savings: parsed.assets.savings,
        stocks: parsed.assets.stocks,
        realEstate: parsed.assets.realEstate,
        otherAsset: parsed.assets.other,
        loanBalance: parsed.liabilities.loanBalance,
        interestRate: parsed.liabilities.interestRate,
        monthlyRepayment: parsed.liabilities.monthlyRepayment,
        goals: {
          create: parsed.goals.map((g) => ({
            goalType: g.goalType,
            goalName: g.goalName,
            targetAmount: g.targetAmount,
            targetDate: new Date(g.targetDate),
            currentAllocated: g.currentAllocated ?? 0,
          })),
        },
      },
    });

    res.status(201).json({ userId, profileId: profile.id, message: 'Profile created successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to create profile', message: (err as Error).message });
  }
});

// Helper: convert DB record to FinancialProfile
function dbToProfile(db: any): FinancialProfile {
  return {
    id: db.id,
    userId: db.userId,
    personal: {
      age: db.age,
      maritalStatus: db.maritalStatus,
      dependents: db.dependents,
    },
    income: {
      monthlyIncome: Number(db.monthlyIncome),
      otherIncome: Number(db.otherIncome),
    },
    expenses: {
      housing: Number(db.housing),
      food: Number(db.food),
      transportation: Number(db.transportation),
      family: Number(db.family),
      entertainment: Number(db.entertainment),
      other: Number(db.otherExpense),
    },
    assets: {
      cash: Number(db.cash),
      savings: Number(db.savings),
      stocks: Number(db.stocks),
      realEstate: Number(db.realEstate),
      other: Number(db.otherAsset),
    },
    liabilities: {
      loanBalance: Number(db.loanBalance),
      interestRate: Number(db.interestRate),
      monthlyRepayment: Number(db.monthlyRepayment),
    },
    goals: (db.goals || []).map((g: any) => ({
      id: g.id,
      goalType: g.goalType,
      goalName: g.goalName,
      targetAmount: Number(g.targetAmount),
      targetDate: g.targetDate.toISOString(),
      currentAllocated: Number(g.currentAllocated),
    })),
    createdAt: db.createdAt?.toISOString(),
    updatedAt: db.updatedAt?.toISOString(),
  };
}

export { dbToProfile };
export default router;
