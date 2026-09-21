import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { createDemoProfile, DEMO_USER_ID } from '../utils/demo-data';
import {
  saveProfileToStore,
  getProfileFromStore,
  listProfilesFromStore,
  deleteProfileFromStore,
  isDemoUserId,
} from '../services/profile-store';
import type { FinancialProfile } from '../types';

// ============================================================
// Profile Routes
// POST   /api/profile          — create/update profile
// GET    /api/profiles         — list all profiles
// GET    /api/profile/:userId  — get profile
// PUT    /api/profile/:userId  — update profile
// DELETE /api/profile/:userId  — delete profile
// GET    /api/profile/demo     — get demo profile
// POST   /api/profile/demo     — load demo persona
// ============================================================

const router = Router();

const profileSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
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

// Build a FinancialProfile object from parsed API input
function buildProfileFromInput(userId: string, parsed: z.infer<typeof profileSchema>): FinancialProfile {
  return {
    userId,
    personal: {
      age: parsed.personal.age,
      maritalStatus: parsed.personal.maritalStatus,
      dependents: parsed.personal.dependents,
    },
    income: {
      monthlyIncome: parsed.income.monthlyIncome,
      otherIncome: parsed.income.otherIncome,
    },
    expenses: {
      housing: parsed.expenses.housing,
      food: parsed.expenses.food,
      transportation: parsed.expenses.transportation,
      family: parsed.expenses.family,
      entertainment: parsed.expenses.entertainment,
      other: parsed.expenses.other,
    },
    assets: {
      cash: parsed.assets.cash,
      savings: parsed.assets.savings,
      stocks: parsed.assets.stocks,
      realEstate: parsed.assets.realEstate,
      other: parsed.assets.other,
    },
    liabilities: {
      loanBalance: parsed.liabilities.loanBalance,
      interestRate: parsed.liabilities.interestRate,
      monthlyRepayment: parsed.liabilities.monthlyRepayment,
    },
    goals: parsed.goals.map((g) => ({
      goalType: g.goalType as any,
      goalName: g.goalName,
      targetAmount: g.targetAmount,
      targetDate: g.targetDate,
      currentAllocated: g.currentAllocated ?? 0,
    })),
  };
}

// GET /api/profiles — list all profiles
router.get('/list/all', async (_req: Request, res: Response) => {
  try {
    // Try to get profiles from DB
    let dbProfiles: any[] = [];
    try {
      dbProfiles = await prisma.financialProfile.findMany({
        include: { goals: true },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      // DB not available — use in-memory store only
    }

    // Build list from DB + in-memory store
    const seenUserIds = new Set<string>();
    const profiles: any[] = [];

    for (const dbProfile of dbProfiles) {
      const userId = dbProfile.userId;
      seenUserIds.add(userId);
      const totalAssets = Number(dbProfile.cash) + Number(dbProfile.savings) + Number(dbProfile.stocks) + Number(dbProfile.realEstate) + Number(dbProfile.otherAsset);
      profiles.push({
        userId,
        name: 'Profile ' + userId.substring(0, 12),
        createdAt: dbProfile.createdAt?.toISOString(),
        updatedAt: dbProfile.updatedAt?.toISOString(),
        summary: {
          age: dbProfile.age,
          monthlyIncome: Number(dbProfile.monthlyIncome),
          totalAssets,
          loanBalance: Number(dbProfile.loanBalance),
        },
      });
    }

    // Add in-memory profiles not already in DB
    for (const p of listProfilesFromStore()) {
      if (!seenUserIds.has(p.userId)) {
        profiles.push(p);
      }
    }

    // Sort by updatedAt desc
    profiles.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list profiles', message: (err as Error).message });
  }
});

// GET /api/profile/demo
router.get('/demo', (_req: Request, res: Response) => {
  const profile = createDemoProfile();
  res.json(profile);
});

// POST /api/profile/demo — create demo user + profile in DB (or in-memory store)
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const userId = DEMO_USER_ID;
    const demoProfile = createDemoProfile(userId);
    const name = 'Nguyễn Minh Anh (Demo)';

    // Try DB first
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { name },
        create: { id: userId, name },
      });

      await prisma.financialProfile.deleteMany({ where: { userId } });

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

      // Also save to in-memory store for consistency
      saveProfileToStore(userId, demoProfile, name);

      return res.json({ userId, profileId: profile.id, message: 'Demo persona loaded successfully' });
    } catch {
      // DB not available — save to in-memory store
      saveProfileToStore(userId, demoProfile, name);
      return res.json({ userId, profileId: 'in-memory', message: 'Demo persona loaded successfully (in-memory)' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load demo persona', message: (err as Error).message });
  }
});

// GET /api/profile/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Try DB first
    let dbProfile = null;
    try {
      dbProfile = await prisma.financialProfile.findFirst({
        where: { userId },
        include: { goals: true },
      });
    } catch {
      // DB not available — fall through to in-memory / demo
    }

    if (dbProfile) {
      return res.json(dbToProfile(dbProfile));
    }

    // Try in-memory store
    const memProfile = getProfileFromStore(userId);
    if (memProfile) {
      return res.json(memProfile);
    }

    // Fall back to demo profile
    if (isDemoUserId(userId)) {
      return res.json(createDemoProfile(userId));
    }

    return res.status(404).json({ error: 'Profile not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile', message: (err as Error).message });
  }
});

// POST /api/profile — create profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = profileSchema.parse(req.body);
    const userId = parsed.userId || `user-${Date.now()}`;
    const name = parsed.name || `Profile ${userId.substring(0, 8)}`;
    const profile = buildProfileFromInput(userId, parsed);

    // Try DB first
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { name },
        create: { id: userId, name },
      });

      await prisma.financialProfile.deleteMany({ where: { userId } });

      const dbProfile = await prisma.financialProfile.create({
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

      // Also save to in-memory store for consistency
      saveProfileToStore(userId, profile, name);

      return res.status(201).json({ userId, profileId: dbProfile.id, message: 'Profile created successfully' });
    } catch (dbErr) {
      // DB not available — save to in-memory store
      saveProfileToStore(userId, profile, name);
      return res.status(201).json({ userId, profileId: 'in-memory', message: 'Profile created successfully (in-memory)' });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to create profile', message: (err as Error).message });
  }
});

// PUT /api/profile/:userId — update profile
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const parsed = profileSchema.parse({ ...req.body, userId });
    const name = parsed.name || `Profile ${userId.substring(0, 8)}`;
    const profile = buildProfileFromInput(userId, parsed);

    // Try DB first
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { name },
        create: { id: userId, name },
      });

      await prisma.financialProfile.deleteMany({ where: { userId } });

      const dbProfile = await prisma.financialProfile.create({
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

      saveProfileToStore(userId, profile, name);
      return res.json({ userId, profileId: dbProfile.id, message: 'Profile updated successfully' });
    } catch {
      // DB not available — update in-memory store
      saveProfileToStore(userId, profile, name);
      return res.json({ userId, profileId: 'in-memory', message: 'Profile updated successfully (in-memory)' });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update profile', message: (err as Error).message });
  }
});

// DELETE /api/profile/:userId — delete profile
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (isDemoUserId(userId)) {
      return res.status(400).json({ error: 'Cannot delete demo profile' });
    }

    // Try DB first
    try {
      await prisma.financialProfile.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } catch {
      // DB not available — continue
    }

    // Also delete from in-memory store
    const deleted = deleteProfileFromStore(userId);

    if (!deleted) {
      // Might have only been in DB
      return res.json({ message: 'Profile deleted' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete profile', message: (err as Error).message });
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
