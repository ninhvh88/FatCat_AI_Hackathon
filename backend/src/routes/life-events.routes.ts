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
import type { LifeEventType } from '../types';

// ============================================================
// Life Events & Advanced Simulation Routes
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
