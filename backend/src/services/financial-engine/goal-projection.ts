import type { FinancialProfile, FinancialGoal, GoalProjectionResult } from '../../types';
import { totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';

// ============================================================
// Goal Projection Calculator
// For each goal, calculate:
//   - current savings allocated
//   - monthly saving capacity (free cash flow)
//   - months to target
//   - expected savings by target date
//   - funding gap
//   - required monthly saving
//   - estimated target date
//   - is achievable
// ============================================================

// Conservative annual return assumption for savings growth
const ASSUMED_ANNUAL_RETURN = 0.05; // 5% per year
const ASSUMED_MONTHLY_RETURN = ASSUMED_ANNUAL_RETURN / 12;

export function calculateGoalProjection(
  profile: FinancialProfile,
  goal: FinancialGoal
): GoalProjectionResult {
  const monthlyIncome = totalMonthlyIncome(profile);
  const monthlyExpense = totalMonthlyExpenses(profile);
  const monthlyRepayment = profile.liabilities.monthlyRepayment;
  const monthlySavingCapacity = monthlyIncome - monthlyExpense;

  const currentSavings = goal.currentAllocated ?? 0;
  const targetAmount = goal.targetAmount;

  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const monthsToTarget = Math.max(
    0,
    Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );

  // Future value of current savings with assumed return
  const futureValueOfSavings =
    currentSavings * Math.pow(1 + ASSUMED_MONTHLY_RETURN, monthsToTarget);

  // Future value of monthly contributions (annuity)
  const futureValueOfContributions =
    monthlySavingCapacity > 0 && ASSUMED_MONTHLY_RETURN > 0
      ? monthlySavingCapacity *
        ((Math.pow(1 + ASSUMED_MONTHLY_RETURN, monthsToTarget) - 1) / ASSUMED_MONTHLY_RETURN)
      : monthlySavingCapacity * monthsToTarget;

  const expectedSavings = futureValueOfSavings + futureValueOfContributions;
  const fundingGap = Math.max(0, targetAmount - expectedSavings);

  // Required monthly saving to reach goal
  // targetAmount = currentSavings * (1+r)^n + requiredMonthly * [((1+r)^n - 1) / r]
  // requiredMonthly = (targetAmount - currentSavings * (1+r)^n) / [((1+r)^n - 1) / r]
  const annuityFactor =
    ASSUMED_MONTHLY_RETURN > 0
      ? (Math.pow(1 + ASSUMED_MONTHLY_RETURN, monthsToTarget) - 1) / ASSUMED_MONTHLY_RETURN
      : monthsToTarget;

  const requiredMonthlySaving =
    annuityFactor > 0
      ? Math.max(0, (targetAmount - futureValueOfSavings) / annuityFactor)
      : 0;

  // Estimated target date based on current saving capacity
  // Solve for n: targetAmount = currentSavings * (1+r)^n + monthlySaving * [((1+r)^n - 1) / r]
  // This is complex; use iterative approach
  const estimatedMonths = estimateMonthsToTarget(
    targetAmount,
    currentSavings,
    monthlySavingCapacity,
    ASSUMED_MONTHLY_RETURN
  );

  const estimatedDate = new Date(now);
  estimatedDate.setMonth(estimatedDate.getMonth() + estimatedMonths);

  const isAchievable = expectedSavings >= targetAmount;
  const progressPercentage =
    targetAmount > 0 ? Math.min(100, (currentSavings / targetAmount) * 100) : 0;

  return {
    goalName: goal.goalName,
    targetAmount,
    currentSavings,
    monthlySavingCapacity,
    monthsToTarget,
    expectedSavings: Math.round(expectedSavings),
    fundingGap: Math.round(fundingGap),
    requiredMonthlySaving: Math.round(requiredMonthlySaving),
    estimatedTargetDate: estimatedDate.toISOString(),
    isAchievable,
    progressPercentage: Math.round(progressPercentage * 100) / 100,
  };
}

function estimateMonthsToTarget(
  target: number,
  currentSavings: number,
  monthlySaving: number,
  monthlyReturn: number
): number {
  if (target <= currentSavings) return 0;
  if (monthlySaving <= 0 && monthlyReturn <= 0) return 9999; // never

  let balance = currentSavings;
  for (let month = 1; month <= 1200; month++) {
    balance = balance * (1 + monthlyReturn) + monthlySaving;
    if (balance >= target) return month;
  }
  return 9999; // exceeds 100 years
}

// Calculate all goals for a profile
export function calculateAllGoalProjections(profile: FinancialProfile): GoalProjectionResult[] {
  return profile.goals.map((goal) => calculateGoalProjection(profile, goal));
}
