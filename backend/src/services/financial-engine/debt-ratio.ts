import type { FinancialProfile, DebtRatioResult } from '../../types';
import { totalMonthlyIncome } from '../../utils/demo-data';

// ============================================================
// Debt Ratio Calculator
// debt-to-income, debt-to-asset, repayment-to-income
// ============================================================

export function calculateDebtRatio(profile: FinancialProfile): DebtRatioResult {
  const monthlyIncome = totalMonthlyIncome(profile);
  const annualIncome = monthlyIncome * 12;
  const totalDebt = profile.liabilities.loanBalance;
  const monthlyRepayment = profile.liabilities.monthlyRepayment;

  const totalAssets =
    profile.assets.cash +
    profile.assets.savings +
    profile.assets.stocks +
    profile.assets.realEstate +
    profile.assets.other;

  const debtToIncome = annualIncome > 0 ? (totalDebt / annualIncome) * 100 : 0;
  const debtToAsset = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const monthlyRepaymentToIncome =
    monthlyIncome > 0 ? (monthlyRepayment / monthlyIncome) * 100 : 0;

  return {
    debtToIncome: Math.round(debtToIncome * 100) / 100,
    debtToAsset: Math.round(debtToAsset * 100) / 100,
    monthlyRepaymentToIncome: Math.round(monthlyRepaymentToIncome * 100) / 100,
  };
}
