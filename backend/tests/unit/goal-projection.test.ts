import { describe, it, expect } from 'vitest';
import { calculateGoalProjection } from '../../src/services/financial-engine/goal-projection';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('GoalProjectionCalculator', () => {
  it('should calculate goal projection for demo profile', () => {
    const profile = createDemoProfile();
    const goal = profile.goals[0];
    const result = calculateGoalProjection(profile, goal);

    expect(result.goalName).toBe('Mua nhà');
    expect(result.targetAmount).toBe(3_000_000_000);
    expect(result.currentSavings).toBe(250_000_000);
    expect(result.monthlySavingCapacity).toBe(12_000_000); // 30M - 18M
    expect(result.monthsToTarget).toBeGreaterThan(50); // ~60 months for 5 years
    expect(result.fundingGap).toBeGreaterThan(0); // 3B is a lot
    expect(result.requiredMonthlySaving).toBeGreaterThan(0);
    expect(result.isAchievable).toBe(false); // 12M/month won't reach 3B in 5 years
    expect(result.progressPercentage).toBeCloseTo(8.33, 1); // 250M / 3B
  });

  it('should handle achievable goal', () => {
    const profile = createDemoProfile();
    profile.goals[0].targetAmount = 500_000_000; // 500M target
    const result = calculateGoalProjection(profile, profile.goals[0]);

    expect(result.isAchievable).toBe(true);
    expect(result.fundingGap).toBe(0);
  });

  it('should handle zero saving capacity', () => {
    const profile = createDemoProfile();
    profile.income.monthlyIncome = 18_000_000; // equal to expenses
    const result = calculateGoalProjection(profile, profile.goals[0]);

    expect(result.monthlySavingCapacity).toBe(0);
    expect(result.isAchievable).toBe(false);
  });

  it('should calculate progress percentage', () => {
    const profile = createDemoProfile();
    profile.goals[0].currentAllocated = 1_500_000_000; // 50% of 3B
    const result = calculateGoalProjection(profile, profile.goals[0]);

    expect(result.progressPercentage).toBeCloseTo(50, 0);
  });
});
