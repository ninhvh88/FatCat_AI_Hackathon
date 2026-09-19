import { describe, it, expect } from 'vitest';
import { calculateCashFlow } from '../../src/services/financial-engine/cash-flow';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('CashFlowCalculator', () => {
  it('should calculate correct cash flow for demo profile', () => {
    const profile = createDemoProfile();
    const result = calculateCashFlow(profile);

    expect(result.monthlyIncome).toBe(30_000_000);
    expect(result.monthlyExpense).toBe(18_000_000);
    expect(result.monthlyFreeCashFlow).toBe(12_000_000);
    expect(result.savingRate).toBe(40);
  });

  it('should handle zero income', () => {
    const profile = createDemoProfile();
    profile.income.monthlyIncome = 0;
    profile.income.otherIncome = 0;
    const result = calculateCashFlow(profile);

    expect(result.savingRate).toBe(0);
    expect(result.monthlyFreeCashFlow).toBe(-18_000_000);
  });

  it('should include other income', () => {
    const profile = createDemoProfile();
    profile.income.otherIncome = 5_000_000;
    const result = calculateCashFlow(profile);

    expect(result.monthlyIncome).toBe(35_000_000);
    expect(result.monthlyFreeCashFlow).toBe(17_000_000);
  });

  it('should handle negative cash flow', () => {
    const profile = createDemoProfile();
    profile.expenses.housing = 30_000_000;
    const result = calculateCashFlow(profile);

    expect(result.monthlyFreeCashFlow).toBeLessThan(0);
    expect(result.savingRate).toBeLessThan(0);
  });
});
