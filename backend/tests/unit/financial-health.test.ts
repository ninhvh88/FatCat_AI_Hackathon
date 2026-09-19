import { describe, it, expect } from 'vitest';
import { calculateFinancialHealth } from '../../src/services/financial-engine/financial-health';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('FinancialHealthCalculator', () => {
  it('should calculate health score for demo profile', () => {
    const profile = createDemoProfile();
    const result = calculateFinancialHealth(profile);

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveLength(5);

    // Check components
    const components = result.breakdown.map((b) => b.component);
    expect(components).toContain('Cash Flow');
    expect(components).toContain('Emergency Fund');
    expect(components).toContain('Debt');
    expect(components).toContain('Savings');
    expect(components).toContain('Goal Progress');
  });

  it('should have score breakdowns that sum to total', () => {
    const profile = createDemoProfile();
    const result = calculateFinancialHealth(profile);

    const sum = result.breakdown.reduce((acc, b) => acc + b.score, 0);
    expect(sum).toBe(result.totalScore);
  });

  it('should have max scores matching spec', () => {
    const profile = createDemoProfile();
    const result = calculateFinancialHealth(profile);

    const maxScores = result.breakdown.map((b) => b.maxScore);
    expect(maxScores).toEqual([25, 20, 20, 15, 20]); // Total = 100
  });

  it('should have recommendations for each component', () => {
    const profile = createDemoProfile();
    const result = calculateFinancialHealth(profile);

    for (const b of result.breakdown) {
      expect(b.recommendation).toBeTruthy();
      expect(b.recommendation.length).toBeGreaterThan(10);
    }
  });

  it('should assign correct rating', () => {
    const profile = createDemoProfile();
    const result = calculateFinancialHealth(profile);

    expect(['POOR', 'FAIR', 'GOOD', 'HEALTHY', 'EXCELLENT']).toContain(result.rating);
  });

  it('should give high score for excellent profile', () => {
    const profile = createDemoProfile();
    profile.income.monthlyIncome = 100_000_000;
    profile.liabilities.loanBalance = 0;
    profile.liabilities.monthlyRepayment = 0;
    profile.assets.savings = 500_000_000;
    const result = calculateFinancialHealth(profile);

    expect(result.totalScore).toBeGreaterThan(60);
  });
});
