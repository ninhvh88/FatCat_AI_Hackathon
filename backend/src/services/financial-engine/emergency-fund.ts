import type { FinancialProfile, EmergencyFundResult } from '../../types';
import { totalMonthlyExpenses, liquidAssets } from '../../utils/demo-data';

// ============================================================
// Emergency Fund Calculator
// How many months of expenses can liquid assets cover?
// Recommended: 6 months of expenses
// ============================================================

export function calculateEmergencyFund(profile: FinancialProfile): EmergencyFundResult {
  const emergencyFundBalance = liquidAssets(profile);
  const monthlyExpense = totalMonthlyExpenses(profile);
  const recommendedFund = monthlyExpense * 6;

  const emergencyFundMonths =
    monthlyExpense > 0 ? emergencyFundBalance / monthlyExpense : 0;

  const shortfall = Math.max(0, recommendedFund - emergencyFundBalance);

  return {
    emergencyFundBalance,
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    recommendedFund,
    shortfall,
  };
}
