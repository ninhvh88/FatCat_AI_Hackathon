import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Import the app (we'll test without DB by using demo endpoints)
import profileRoutes from '../../src/routes/profile.routes';
import { calculateFinancialEngine, simulateScenario, getPredefinedScenarios } from '../../src/services/financial-engine';
import { createDemoProfile } from '../../src/utils/demo-data';
import { generateInsights } from '../../src/services/insight.service';
import { generateActionPlan } from '../../src/services/action-plan.service';

// Build a test app without DB-dependent middleware
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/profile', profileRoutes);

app.get('/api/dashboard/demo', (_req, res) => {
  const profile = createDemoProfile();
  const engineResult = calculateFinancialEngine(profile);
  const insights = generateInsights(profile, engineResult);
  const actionPlan = generateActionPlan(profile, engineResult);
  res.json({ profile, engineResult, insights, actionPlan });
});

app.get('/api/financial-health/demo', (_req, res) => {
  const profile = createDemoProfile();
  const engine = calculateFinancialEngine(profile);
  res.json(engine.financialHealth);
});

app.get('/api/scenarios/predefined', (_req, res) => {
  res.json(getPredefinedScenarios());
});

app.post('/api/scenarios/simulate', (req, res) => {
  const profile = createDemoProfile();
  const results = (req.body.scenarios || []).map((s: any) =>
    simulateScenario(profile, { type: s.type, label: s.label || s.type, params: s.params || {} })
  );
  res.json({ baseline: calculateFinancialEngine(profile), results });
});

describe('Profile API', () => {
  it('GET /api/profile/demo should return demo profile', async () => {
    const res = await request(app).get('/api/profile/demo');
    expect(res.status).toBe(200);
    expect(res.body.personal.age).toBe(28);
    expect(res.body.income.monthlyIncome).toBe(30_000_000);
    expect(res.body.goals[0].targetAmount).toBe(3_000_000_000);
  });
});

describe('Dashboard API', () => {
  it('GET /api/dashboard/demo should return full dashboard', async () => {
    const res = await request(app).get('/api/dashboard/demo');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.engineResult).toBeDefined();
    expect(res.body.insights).toBeDefined();
    expect(res.body.actionPlan).toBeDefined();
    expect(res.body.engineResult.financialHealth.totalScore).toBeGreaterThan(0);
  });
});

describe('Financial Health API', () => {
  it('GET /api/financial-health/demo should return health score', async () => {
    const res = await request(app).get('/api/financial-health/demo');
    expect(res.status).toBe(200);
    expect(res.body.totalScore).toBeGreaterThan(0);
    expect(res.body.breakdown).toHaveLength(5);
  });
});

describe('Scenario API', () => {
  it('GET /api/scenarios/predefined should return 7 scenarios', async () => {
    const res = await request(app).get('/api/scenarios/predefined');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
  });

  it('POST /api/scenarios/simulate should simulate scenarios', async () => {
    const res = await request(app)
      .post('/api/scenarios/simulate')
      .send({
        scenarios: [
          { type: 'INCOME_INCREASE', label: 'Income +20%', params: { percent: 20 } },
          { type: 'NEW_CHILD', label: 'New Child', params: { monthlyCost: 5000000 } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].comparison.cashFlowDelta).toBe(6_000_000);
    expect(res.body.results[1].comparison.cashFlowDelta).toBe(-5_000_000);
  });
});
