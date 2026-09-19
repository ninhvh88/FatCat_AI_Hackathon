import type {
  FinancialProfile,
  ScenarioConfig,
  ScenarioResult,
  FinancialEngineResult,
} from '../../types';
import { calculateCashFlow } from './cash-flow';
import { calculateNetWorth } from './net-worth';
import { calculateDebtRatio } from './debt-ratio';
import { calculateEmergencyFund } from './emergency-fund';
import { calculateAllGoalProjections } from './goal-projection';
import { calculateFinancialHealth } from './financial-health';

// Local engine aggregator (avoids circular dependency with index.ts)
function calculateFinancialEngine(profile: FinancialProfile): FinancialEngineResult {
  return {
    cashFlow: calculateCashFlow(profile),
    netWorth: calculateNetWorth(profile),
    debtRatio: calculateDebtRatio(profile),
    emergencyFund: calculateEmergencyFund(profile),
    goalProjection: calculateAllGoalProjections(profile),
    financialHealth: calculateFinancialHealth(profile),
  };
}

// ============================================================
// Scenario Simulator
// Applies scenario modifications to a profile, then re-runs
// the financial engine to produce comparison results.
// ============================================================

// Default estimated costs for life events (VND/month)
const ESTIMATED_CHILD_MONTHLY_COST = 5_000_000; // 5M VND/month per child
const ESTIMATED_CAR_PRICE = 600_000_000; // 600M VND
const ESTIMATED_HOUSE_DOWN_PAYMENT_PERCENT = 0.30; // 30% down payment

export function applyScenario(profile: FinancialProfile, scenario: ScenarioConfig): FinancialProfile {
  // Deep clone the profile
  const modified: FinancialProfile = JSON.parse(JSON.stringify(profile));

  switch (scenario.type) {
    case 'INCOME_INCREASE': {
      const percent = scenario.params.percent ?? 20;
      modified.income.monthlyIncome = Math.round(
        modified.income.monthlyIncome * (1 + percent / 100)
      );
      break;
    }

    case 'INCOME_DECREASE': {
      const percent = scenario.params.percent ?? 20;
      modified.income.monthlyIncome = Math.round(
        modified.income.monthlyIncome * (1 - percent / 100)
      );
      break;
    }

    case 'EXPENSE_INCREASE': {
      const amount = scenario.params.amount ?? 5_000_000;
      modified.expenses.family += amount;
      break;
    }

    case 'NEW_CHILD': {
      const childCost = scenario.params.monthlyCost ?? ESTIMATED_CHILD_MONTHLY_COST;
      modified.personal.dependents += 1;
      modified.expenses.family += childCost;
      if (modified.personal.maritalStatus === 'SINGLE') {
        modified.personal.maritalStatus = 'MARRIED'; // assume marriage with child
      }
      break;
    }

    case 'BUY_CAR': {
      const carPrice = scenario.params.price ?? ESTIMATED_CAR_PRICE;
      const downPayment = scenario.params.downPayment ?? carPrice * 0.30;
      const loanAmount = carPrice - downPayment;
      const interestRate = scenario.params.interestRate ?? 8; // 8%/year
      const loanTermMonths = scenario.params.loanTermMonths ?? 60; // 5 years

      // Add car as asset
      modified.assets.other += carPrice;
      // Add car loan as liability
      modified.liabilities.loanBalance += loanAmount;
      // Calculate monthly repayment (amortized)
      const monthlyRate = interestRate / 100 / 12;
      const monthlyRepayment =
        monthlyRate > 0
          ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
            (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
          : loanAmount / loanTermMonths;
      modified.liabilities.monthlyRepayment += Math.round(monthlyRepayment);
      // Reduce cash by down payment
      modified.assets.cash = Math.max(0, modified.assets.cash - downPayment);
      break;
    }

    case 'BUY_HOUSE': {
      const housePrice = scenario.params.price ?? 3_000_000_000;
      const downPayment = scenario.params.downPayment ?? housePrice * ESTIMATED_HOUSE_DOWN_PAYMENT_PERCENT;
      const loanAmount = housePrice - downPayment;
      const interestRate = scenario.params.interestRate ?? 8;
      const loanTermMonths = scenario.params.loanTermMonths ?? 360; // 30 years

      modified.assets.realEstate += housePrice;
      modified.liabilities.loanBalance += loanAmount;
      const monthlyRate = interestRate / 100 / 12;
      const monthlyRepayment =
        monthlyRate > 0
          ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
            (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
          : loanAmount / loanTermMonths;
      modified.liabilities.monthlyRepayment += Math.round(monthlyRepayment);
      modified.liabilities.interestRate = interestRate;
      modified.assets.cash = Math.max(0, modified.assets.cash - downPayment);
      break;
    }

    case 'LOAN_INTEREST_INCREASE': {
      const percent = scenario.params.percent ?? 3;
      modified.liabilities.interestRate += percent;
      // Recalculate monthly repayment based on new rate
      const remainingBalance = modified.liabilities.loanBalance;
      const remainingTermMonths = 240; // assume 20 years remaining
      const monthlyRate = modified.liabilities.interestRate / 100 / 12;
      if (monthlyRate > 0) {
        modified.liabilities.monthlyRepayment = Math.round(
          (remainingBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingTermMonths)) /
            (Math.pow(1 + monthlyRate, remainingTermMonths) - 1)
        );
      }
      break;
    }

    case 'CUSTOM': {
      // Apply custom modifications from params
      if (scenario.params.incomeDelta) {
        modified.income.monthlyIncome += scenario.params.incomeDelta;
      }
      if (scenario.params.expenseDelta) {
        modified.expenses.other += scenario.params.expenseDelta;
      }
      if (scenario.params.dependentsDelta) {
        modified.personal.dependents += scenario.params.dependentsDelta;
      }
      break;
    }
  }

  return modified;
}

export function simulateScenario(
  profile: FinancialProfile,
  scenario: ScenarioConfig
): ScenarioResult {
  const modifiedProfile = applyScenario(profile, scenario);
  const engineResult = calculateFinancialEngine(modifiedProfile);
  const baselineResult = calculateFinancialEngine(profile);

  const comparison = {
    cashFlowDelta:
      engineResult.cashFlow.monthlyFreeCashFlow - baselineResult.cashFlow.monthlyFreeCashFlow,
    netWorthDelta: engineResult.netWorth.netWorth - baselineResult.netWorth.netWorth,
    goalDateDelta: calculateGoalDateDelta(baselineResult, engineResult),
    savingRateDelta:
      engineResult.cashFlow.savingRate - baselineResult.cashFlow.savingRate,
    healthScoreDelta:
      engineResult.financialHealth.totalScore - baselineResult.financialHealth.totalScore,
  };

  return {
    config: scenario,
    modifiedProfile,
    engineResult,
    comparison,
  };
}

function calculateGoalDateDelta(
  baseline: FinancialEngineResult,
  scenario: FinancialEngineResult
): number {
  if (baseline.goalProjection.length === 0 || scenario.goalProjection.length === 0) return 0;
  const baselineMonths = baseline.goalProjection[0].monthsToTarget;
  const scenarioMonths = scenario.goalProjection[0].monthsToTarget;
  return scenarioMonths - baselineMonths;
}

// Predefined scenarios from the spec
export function getPredefinedScenarios(): ScenarioConfig[] {
  return [
    {
      type: 'INCOME_INCREASE',
      label: 'Thu nhập +20%',
      params: { percent: 20 },
    },
    {
      type: 'INCOME_DECREASE',
      label: 'Thu nhập -20%',
      params: { percent: 20 },
    },
    {
      type: 'EXPENSE_INCREASE',
      label: 'Chi phí +5M/tháng',
      params: { amount: 5_000_000 },
    },
    {
      type: 'NEW_CHILD',
      label: 'Sinh con',
      params: { monthlyCost: ESTIMATED_CHILD_MONTHLY_COST },
    },
    {
      type: 'BUY_CAR',
      label: 'Mua ô tô',
      params: { price: 600_000_000, downPayment: 180_000_000, interestRate: 8, loanTermMonths: 60 },
    },
    {
      type: 'BUY_HOUSE',
      label: 'Mua nhà',
      params: { price: 3_000_000_000, downPayment: 900_000_000, interestRate: 8, loanTermMonths: 360 },
    },
    {
      type: 'LOAN_INTEREST_INCREASE',
      label: 'Lãi suất vay +3%',
      params: { percent: 3 },
    },
  ];
}
