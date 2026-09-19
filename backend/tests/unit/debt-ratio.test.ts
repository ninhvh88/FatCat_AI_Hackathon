import { describe, it, expect } from 'vitest';
import { calculateDebtRatio } from '../../src/services/financial-engine/debt-ratio';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('DebtRatioCalculator', () => {
  it('should calculate correct debt ratio for demo profile', () => {
    const profile = createDemoProfile();
    const result = calculateDebtRatio(profile);

    // Annual income = 30M * 12 = 360M
    // DTI = 200M / 360M * 100 = 55.56%
    expect(result.debtToIncome).toBeCloseTo(55.56, 1);
    expect(result.debtToAsset).toBeCloseTo(80, 0); // 200M / 250M
    expect(result.monthlyRepaymentToIncome).toBeCloseTo(14.67, 0); // 4.4M / 30M
  });

  it('should handle zero debt', () => {
    const profile = createDemoProfile();
    profile.liabilities.loanBalance = 0;
    profile.liabilities.monthlyRepayment = 0;
    const result = calculateDebtRatio(profile);

    expect(result.debtToIncome).toBe(0);
    expect(result.monthlyRepaymentToIncome).toBe(0);
  });

  it('should handle zero income', () => {
    const profile = createDemoProfile();
    profile.income.monthlyIncome = 0;
    profile.income.otherIncome = 0;
    const result = calculateDebtRatio(profile);

    expect(result.debtToIncome).toBe(0);
    expect(result.monthlyRepaymentToIncome).toBe(0);
  });
});
