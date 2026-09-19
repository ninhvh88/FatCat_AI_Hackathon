import type { FinancialProfile, CashFlowResult } from '../../types';
import { totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';

// ============================================================
// Cash Flow Calculator
// Calculates monthly income, expense, free cash flow, saving rate
// ============================================================

export function calculateCashFlow(profile: FinancialProfile): CashFlowResult {
  const monthlyIncome = totalMonthlyIncome(profile);
  const monthlyExpense = totalMonthlyExpenses(profile);
  const monthlyFreeCashFlow = monthlyIncome - monthlyExpense;
  const savingRate = monthlyIncome > 0 ? (monthlyFreeCashFlow / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    monthlyExpense,
    monthlyFreeCashFlow,
    savingRate: Math.round(savingRate * 100) / 100,
  };
}
