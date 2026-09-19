import type {
  FinancialProfile,
  LifeEventConfig,
  LifeEventImpact,
  LifeEventType,
} from '../../types';
import { calculateFinancialEngine } from './index';
import { totalMonthlyIncome, totalMonthlyExpenses, formatVND } from '../../utils/demo-data';

// ============================================================
// Life Event Simulator
// Simulates major life events (having a child, getting married,
// job change, income loss, etc.) and computes their financial impact.
// All assumptions are visible and editable.
// ============================================================

// Default assumptions per life event type
export function getDefaultAssumptions(type: LifeEventType): Record<string, number> {
  switch (type) {
    case 'HAVE_CHILD':
      return {
        monthlyChildCost: 5_000_000,     // additional monthly expense
        oneTimeCost: 20_000_000,          // birth/preparation costs
        incomeReductionMonths: 3,         // maternity/paternity leave
        incomeReductionPercent: 30,       // % income reduction during leave
      };
    case 'GET_MARRIED':
      return {
        weddingCost: 200_000_000,         // one-time wedding cost
        housingIncrease: 2_000_000,       // monthly housing increase
        combinedIncomePercent: 0,         // partner income as % of current (0 = single income)
      };
    case 'BUY_HOUSE':
      return {
        housePrice: 3_000_000_000,
        downPaymentPercent: 30,
        interestRate: 8,
        loanTermYears: 25,
      };
    case 'BUY_CAR':
      return {
        carPrice: 600_000_000,
        downPaymentPercent: 30,
        interestRate: 8,
        loanTermMonths: 60,
      };
    case 'JOB_CHANGE':
      return {
        incomeChangePercent: 20,          // % increase (negative for decrease)
        relocationCost: 10_000_000,
      };
    case 'INCOME_LOSS':
      return {
        lossDurationMonths: 6,            // months without income
        incomeLossPercent: 100,           // % of income lost
      };
    case 'START_BUSINESS':
      return {
        initialCapital: 100_000_000,
        monthlyRevenue: 15_000_000,
        monthlyExpense: 8_000_000,
        rampUpMonths: 6,                  // months to reach full revenue
      };
    case 'MOVE':
      return {
        movingCost: 15_000_000,
        housingChange: 2_000_000,         // monthly housing difference
      };
    default:
      return {};
  }
}

export function getLifeEventLabels(): Array<{ type: LifeEventType; label: string; icon: string }> {
  return [
    { type: 'HAVE_CHILD', label: 'Sinh con', icon: '👶' },
    { type: 'GET_MARRIED', label: 'Kết hôn', icon: '💍' },
    { type: 'BUY_HOUSE', label: 'Mua nhà', icon: '🏠' },
    { type: 'BUY_CAR', label: 'Mua xe', icon: '🚗' },
    { type: 'JOB_CHANGE', label: 'Đổi việc', icon: '💼' },
    { type: 'INCOME_LOSS', label: 'Mất thu nhập', icon: '⚠️' },
    { type: 'START_BUSINESS', label: 'Khởi nghiệp', icon: '🚀' },
    { type: 'MOVE', label: 'Chuyển nơi ở', icon: '📦' },
  ];
}

function applyLifeEvent(profile: FinancialProfile, config: LifeEventConfig): FinancialProfile {
  const modified: FinancialProfile = JSON.parse(JSON.stringify(profile));
  const a = config.assumptions;

  switch (config.type) {
    case 'HAVE_CHILD':
      modified.personal.dependents += 1;
      if (modified.personal.maritalStatus === 'SINGLE') {
        modified.personal.maritalStatus = 'MARRIED';
      }
      modified.expenses.family += a.monthlyChildCost ?? 5_000_000;
      modified.assets.cash = Math.max(0, modified.assets.cash - (a.oneTimeCost ?? 20_000_000));
      break;

    case 'GET_MARRIED':
      if (modified.personal.maritalStatus === 'SINGLE') {
        modified.personal.maritalStatus = 'MARRIED';
      }
      modified.assets.cash = Math.max(0, modified.assets.cash - (a.weddingCost ?? 200_000_000));
      modified.expenses.housing += a.housingIncrease ?? 0;
      // Partner income contribution
      const partnerPercent = a.combinedIncomePercent ?? 0;
      if (partnerPercent > 0) {
        modified.income.otherIncome += (modified.income.monthlyIncome * partnerPercent) / 100;
      }
      break;

    case 'BUY_HOUSE': {
      const price = a.housePrice ?? 3_000_000_000;
      const downPct = a.downPaymentPercent ?? 30;
      const down = (price * downPct) / 100;
      const loan = price - down;
      const rate = (a.interestRate ?? 8) / 100 / 12;
      const term = (a.loanTermYears ?? 25) * 12;
      const monthlyRate = rate;
      let payment: number;
      if (monthlyRate === 0) {
        payment = loan / term;
      } else {
        const f = Math.pow(1 + monthlyRate, term);
        payment = (loan * monthlyRate * f) / (f - 1);
      }
      modified.assets.realEstate += price;
      modified.assets.cash = Math.max(0, modified.assets.cash - down);
      modified.liabilities.loanBalance += loan;
      modified.liabilities.mortgage = (modified.liabilities.mortgage ?? 0) + loan;
      modified.liabilities.monthlyRepayment += payment;
      break;
    }

    case 'BUY_CAR': {
      const price = a.carPrice ?? 600_000_000;
      const downPct = a.downPaymentPercent ?? 30;
      const down = (price * downPct) / 100;
      const loan = price - down;
      const rate = (a.interestRate ?? 8) / 100 / 12;
      const term = a.loanTermMonths ?? 60;
      let payment: number;
      if (rate === 0) {
        payment = loan / term;
      } else {
        const f = Math.pow(1 + rate, term);
        payment = (loan * rate * f) / (f - 1);
      }
      modified.assets.other += price;
      modified.assets.cash = Math.max(0, modified.assets.cash - down);
      modified.liabilities.loanBalance += loan;
      modified.liabilities.consumerLoans = (modified.liabilities.consumerLoans ?? 0) + loan;
      modified.liabilities.monthlyRepayment += payment;
      break;
    }

    case 'JOB_CHANGE': {
      const changePct = a.incomeChangePercent ?? 20;
      modified.income.monthlyIncome *= 1 + changePct / 100;
      modified.assets.cash = Math.max(0, modified.assets.cash - (a.relocationCost ?? 0));
      break;
    }

    case 'INCOME_LOSS': {
      // Model as reduced other income (negative) for the period
      // For snapshot: reduce monthly income by loss percentage
      const lossPct = a.incomeLossPercent ?? 100;
      modified.income.monthlyIncome *= 1 - lossPct / 100;
      break;
    }

    case 'START_BUSINESS': {
      const capital = a.initialCapital ?? 100_000_000;
      const revenue = a.monthlyRevenue ?? 15_000_000;
      const expense = a.monthlyExpense ?? 8_000_000;
      modified.assets.cash = Math.max(0, modified.assets.cash - capital);
      // Net business income replaces part of salary
      modified.income.monthlyIncome = revenue;
      modified.expenses.other += expense;
      break;
    }

    case 'MOVE': {
      modified.assets.cash = Math.max(0, modified.assets.cash - (a.movingCost ?? 15_000_000));
      modified.expenses.housing += a.housingChange ?? 0;
      break;
    }
  }

  return modified;
}

export function simulateLifeEvent(
  profile: FinancialProfile,
  config: LifeEventConfig
): LifeEventImpact {
  const beforeEngine = calculateFinancialEngine(profile);
  const beforeIncome = totalMonthlyIncome(profile);
  const beforeExpense = totalMonthlyExpenses(profile);
  const beforeSaving = beforeIncome - beforeExpense;
  const beforeHealth = beforeEngine.financialHealth.totalScore;
  const beforeGoalMonths =
    beforeEngine.goalProjection.length > 0
      ? beforeEngine.goalProjection[0].monthsToTarget
      : 0;

  const modifiedProfile = applyLifeEvent(profile, config);
  const afterEngine = calculateFinancialEngine(modifiedProfile);
  const afterIncome = totalMonthlyIncome(modifiedProfile);
  const afterExpense = totalMonthlyExpenses(modifiedProfile);
  const afterSaving = afterIncome - afterExpense;
  const afterHealth = afterEngine.financialHealth.totalScore;
  const afterGoalMonths =
    afterEngine.goalProjection.length > 0
      ? afterEngine.goalProjection[0].monthsToTarget
      : 0;

  return {
    before: {
      monthlyIncome: beforeIncome,
      monthlyExpense: beforeExpense,
      monthlySaving: beforeSaving,
      healthScore: beforeHealth,
      goalTimelineMonths: beforeGoalMonths,
    },
    after: {
      monthlyIncome: afterIncome,
      monthlyExpense: afterExpense,
      monthlySaving: afterSaving,
      healthScore: afterHealth,
      goalTimelineMonths: afterGoalMonths,
    },
    deltas: {
      monthlySavingDelta: Math.round(afterSaving - beforeSaving),
      healthScoreDelta: afterHealth - beforeHealth,
      goalTimelineDeltaMonths: afterGoalMonths - beforeGoalMonths,
    },
    assumptions: config.assumptions,
    modifiedProfile,
  };
}
