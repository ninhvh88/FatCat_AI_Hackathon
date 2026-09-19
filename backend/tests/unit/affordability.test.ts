import { describe, it, expect } from 'vitest';
import { calculateAffordability } from '../../src/services/financial-engine/affordability';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('Affordability Calculator', () => {
  const profile = createDemoProfile();

  it('should determine a house is not affordable at 3B with current profile', () => {
    const result = calculateAffordability(profile, {
      price: 3_000_000_000,
      downPayment: 600_000_000,
      interestRate: 8,
      loanTermMonths: 300,
    });

    expect(result.purchasePrice).toBe(3_000_000_000);
    expect(result.loanAmount).toBe(2_400_000_000);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.debtToIncomeAfter).toBeGreaterThan(0);
    expect(result.recommendation).toBeTruthy();
  });

  it('should determine a car is affordable', () => {
    const result = calculateAffordability(profile, {
      price: 600_000_000,
      downPayment: 180_000_000,
      interestRate: 8,
      loanTermMonths: 60,
    });

    expect(result.loanAmount).toBe(420_000_000);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.recommendation).toBeTruthy();
  });

  it('should handle zero interest rate', () => {
    const result = calculateAffordability(profile, {
      price: 100_000_000,
      downPayment: 50_000_000,
      interestRate: 0,
      loanTermMonths: 12,
    });

    expect(result.loanAmount).toBe(50_000_000);
    expect(result.monthlyPayment).toBeCloseTo(50_000_000 / 12, -2);
  });

  it('should return structured result with all fields', () => {
    const result = calculateAffordability(profile, {
      price: 500_000_000,
      downPayment: 100_000_000,
      interestRate: 10,
      loanTermMonths: 120,
    });

    expect(result).toHaveProperty('affordable');
    expect(result).toHaveProperty('purchasePrice');
    expect(result).toHaveProperty('downPayment');
    expect(result).toHaveProperty('loanAmount');
    expect(result).toHaveProperty('monthlyPayment');
    expect(result).toHaveProperty('remainingCashFlow');
    expect(result).toHaveProperty('debtToIncomeAfter');
    expect(result).toHaveProperty('emergencyFundMonthsAfter');
    expect(result).toHaveProperty('healthScoreAfter');
    expect(result).toHaveProperty('recommendation');
    expect(typeof result.affordable).toBe('boolean');
  });
});
