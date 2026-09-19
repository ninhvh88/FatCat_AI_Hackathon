import { describe, it, expect } from 'vitest';
import { calculateEmergencyFund } from '../../src/services/financial-engine/emergency-fund';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('EmergencyFundCalculator', () => {
  it('should calculate correct emergency fund for demo profile', () => {
    const profile = createDemoProfile();
    const result = calculateEmergencyFund(profile);

    // Liquid assets = cash 50M + savings 200M = 250M
    // Monthly expenses = 18M
    // Months = 250M / 18M ≈ 13.9
    expect(result.emergencyFundBalance).toBe(250_000_000);
    expect(result.emergencyFundMonths).toBeCloseTo(13.9, 0);
    expect(result.recommendedFund).toBe(108_000_000); // 18M * 6
    expect(result.shortfall).toBe(0); // has more than enough
  });

  it('should calculate shortfall when fund is insufficient', () => {
    const profile = createDemoProfile();
    profile.assets.cash = 10_000_000;
    profile.assets.savings = 20_000_000;
    const result = calculateEmergencyFund(profile);

    expect(result.emergencyFundBalance).toBe(30_000_000);
    expect(result.shortfall).toBe(78_000_000); // 108M - 30M
  });

  it('should handle zero expenses', () => {
    const profile = createDemoProfile();
    profile.expenses.housing = 0;
    profile.expenses.food = 0;
    profile.expenses.transportation = 0;
    profile.expenses.family = 0;
    profile.expenses.entertainment = 0;
    profile.expenses.other = 0;
    profile.expenses.education = 0;
    profile.expenses.healthcare = 0;
    profile.expenses.recurring = 0;
    const result = calculateEmergencyFund(profile);

    expect(result.emergencyFundMonths).toBe(0);
    expect(result.recommendedFund).toBe(0);
  });
});
