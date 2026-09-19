import { describe, it, expect } from 'vitest';
import { simulateScenario, applyScenario, getPredefinedScenarios } from '../../src/services/financial-engine/scenario-simulator';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('ScenarioSimulator', () => {
  it('should have 7 predefined scenarios', () => {
    const scenarios = getPredefinedScenarios();
    expect(scenarios).toHaveLength(7);
    expect(scenarios.map((s) => s.type)).toContain('INCOME_INCREASE');
    expect(scenarios.map((s) => s.type)).toContain('NEW_CHILD');
    expect(scenarios.map((s) => s.type)).toContain('BUY_HOUSE');
  });

  it('should simulate income increase +20%', () => {
    const profile = createDemoProfile();
    const result = simulateScenario(profile, {
      type: 'INCOME_INCREASE',
      label: 'Income +20%',
      params: { percent: 20 },
    });

    expect(result.modifiedProfile.income.monthlyIncome).toBe(36_000_000);
    expect(result.engineResult.cashFlow.monthlyFreeCashFlow).toBe(18_000_000); // 36M - 18M
    expect(result.comparison.cashFlowDelta).toBe(6_000_000); // 18M - 12M
    expect(result.comparison.savingRateDelta).toBeGreaterThan(0);
  });

  it('should simulate new child scenario', () => {
    const profile = createDemoProfile();
    const result = simulateScenario(profile, {
      type: 'NEW_CHILD',
      label: 'New Child',
      params: { monthlyCost: 5_000_000 },
    });

    expect(result.modifiedProfile.personal.dependents).toBe(1);
    expect(result.modifiedProfile.expenses.family).toBe(7_000_000); // 2M + 5M
    expect(result.comparison.cashFlowDelta).toBe(-5_000_000); // -5M
  });

  it('should simulate income decrease -20%', () => {
    const profile = createDemoProfile();
    const result = simulateScenario(profile, {
      type: 'INCOME_DECREASE',
      label: 'Income -20%',
      params: { percent: 20 },
    });

    expect(result.modifiedProfile.income.monthlyIncome).toBe(24_000_000);
    expect(result.comparison.cashFlowDelta).toBe(-6_000_000);
  });

  it('should simulate expense increase', () => {
    const profile = createDemoProfile();
    const result = simulateScenario(profile, {
      type: 'EXPENSE_INCREASE',
      label: 'Expense +5M',
      params: { amount: 5_000_000 },
    });

    expect(result.comparison.cashFlowDelta).toBe(-5_000_000);
  });

  it('should simulate loan interest increase', () => {
    const profile = createDemoProfile();
    const result = simulateScenario(profile, {
      type: 'LOAN_INTEREST_INCREASE',
      label: 'Interest +3%',
      params: { percent: 3 },
    });

    expect(result.modifiedProfile.liabilities.interestRate).toBe(13); // 10 + 3
  });

  it('should not modify original profile', () => {
    const profile = createDemoProfile();
    const originalIncome = profile.income.monthlyIncome;
    simulateScenario(profile, {
      type: 'INCOME_INCREASE',
      label: 'Income +20%',
      params: { percent: 20 },
    });

    expect(profile.income.monthlyIncome).toBe(originalIncome);
  });
});
