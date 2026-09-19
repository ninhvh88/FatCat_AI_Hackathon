import type { FinancialProfile } from '../types';

// ============================================================
// Demo Persona - Nguyễn Minh Anh
// As specified in PROJECT_SPEC.md Section 2
// ============================================================

export const DEMO_USER_ID = 'demo-user-minhanh';

export function createDemoProfile(userId: string = DEMO_USER_ID): FinancialProfile {
  const now = new Date();
  const targetDate = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());

  return {
    userId,
    personal: {
      age: 28,
      maritalStatus: 'SINGLE',
      dependents: 0,
      location: 'Ho Chi Minh City',
    },
    income: {
      monthlyIncome: 30_000_000, // 30M VND/month
      otherIncome: 0,
      bonus: 30_000_000, // ~1 month salary annual bonus
    },
    expenses: {
      housing: 5_000_000,
      food: 4_000_000,
      transportation: 2_000_000,
      family: 2_000_000,
      entertainment: 3_000_000,
      other: 500_000,
      education: 0,
      healthcare: 1_000_000,
      recurring: 500_000,
      // Total: 18M VND/month (same as before, now with richer categories)
    },
    assets: {
      cash: 50_000_000,
      savings: 200_000_000, // 200M VND savings
      stocks: 0,
      realEstate: 0,
      other: 0,
    },
    liabilities: {
      loanBalance: 200_000_000, // 200M VND loan
      interestRate: 10, // 10%/year
      monthlyRepayment: 4_400_000, // approximate monthly repayment
      mortgage: 0,
      consumerLoans: 200_000_000,
      creditCards: 0,
      otherDebt: 0,
    },
    goals: [
      {
        goalType: 'BUY_HOUSE',
        goalName: 'Mua nhà',
        targetAmount: 3_000_000_000, // 3B VND
        targetDate: targetDate.toISOString(),
        currentAllocated: 250_000_000, // cash + savings allocated toward goal
        monthlyContribution: 12_000_000,
        priority: 1,
        status: 'ACTIVE',
      },
    ],
    riskProfile: {
      tolerance: 'MODERATE',
      horizon: 10,
      experience: 'INTERMEDIATE',
    },
  };
}

// Helper to compute total monthly expenses
export function totalMonthlyExpenses(profile: FinancialProfile): number {
  const e = profile.expenses;
  return (
    e.housing +
    e.food +
    e.transportation +
    e.family +
    e.entertainment +
    e.other +
    (e.education ?? 0) +
    (e.healthcare ?? 0) +
    (e.recurring ?? 0)
  );
}

// Helper to compute total monthly income
export function totalMonthlyIncome(profile: FinancialProfile): number {
  return profile.income.monthlyIncome + profile.income.otherIncome;
}

// Helper to compute total assets
export function totalAssets(profile: FinancialProfile): number {
  const a = profile.assets;
  return a.cash + a.savings + a.stocks + a.realEstate + a.other;
}

// Helper to compute total liabilities
export function totalLiabilities(profile: FinancialProfile): number {
  return profile.liabilities.loanBalance;
}

// Helper to compute liquid assets (cash + savings) for emergency fund
export function liquidAssets(profile: FinancialProfile): number {
  return profile.assets.cash + profile.assets.savings;
}

// Format VND
export function formatVND(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B VND`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M VND`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K VND`;
  }
  return `${amount.toFixed(0)} VND`;
}
