import type {
  FinancialProfile,
  FinancialHealthResult,
  FinancialHealthBreakdown,
} from '../../types';
import { calculateCashFlow } from './cash-flow';
import { calculateDebtRatio } from './debt-ratio';
import { calculateEmergencyFund } from './emergency-fund';
import { calculateAllGoalProjections } from './goal-projection';
import { totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';

// ============================================================
// Financial Health Score Calculator
// Score: 0-100
//   Cash Flow:       25% (max 25)
//   Emergency Fund:  20% (max 20)
//   Debt:            20% (max 20)
//   Savings:         15% (max 15)
//   Goal Progress:   20% (max 20)
// ============================================================

export function calculateFinancialHealth(profile: FinancialProfile): FinancialHealthResult {
  const cashFlow = calculateCashFlow(profile);
  const debtRatio = calculateDebtRatio(profile);
  const emergencyFund = calculateEmergencyFund(profile);
  const goalProjections = calculateAllGoalProjections(profile);

  const breakdown: FinancialHealthBreakdown[] = [];

  // 1. Cash Flow Score (max 25) — based on saving rate: 40%+ = full, 0% = 0
  const savingRate = cashFlow.savingRate;
  const cashFlowScore = Math.min(25, Math.max(0, (savingRate / 40) * 25));
  breakdown.push({
    component: 'Cash Flow',
    score: Math.round(cashFlowScore),
    maxScore: 25,
    recommendation:
      savingRate >= 30
        ? 'Dòng tiền tốt. Bạn đang tiết kiệm một phần đáng kể thu nhập.'
        : savingRate >= 15
          ? 'Dòng tiền khá. Cân nhắc tăng tỷ lệ tiết kiệm lên 20-30%.'
          : 'Dòng tiền cần cải thiện. Nên giảm chi phí hoặc tăng thu nhập để cải thiện tỷ lệ tiết kiệm.',
  });

  // 2. Emergency Fund Score (max 20) — months covered: 6+ = full, 0 = 0
  const efMonths = emergencyFund.emergencyFundMonths;
  const emergencyScore = Math.min(20, Math.max(0, (efMonths / 6) * 20));
  breakdown.push({
    component: 'Emergency Fund',
    score: Math.round(emergencyScore),
    maxScore: 20,
    recommendation:
      efMonths >= 6
        ? 'Quỹ dự phòng đủ tốt. Bạn có đủ dự phòng cho 6 tháng trở lên.'
        : efMonths >= 3
          ? 'Quỹ dự phòng khá. Nên bổ sung để đạt 6 tháng chi phí.'
          : 'Quỹ dự phòng thấp. Ưu tiên tích lũy quỹ dự phòng tương đương 3-6 tháng chi phí.',
  });

  // 3. Debt Score (max 20) — debt-to-income: 0% = full, 50%+ = 0
  const dti = debtRatio.debtToIncome;
  const debtScore = Math.min(20, Math.max(0, 20 - (dti / 50) * 20));
  breakdown.push({
    component: 'Debt',
    score: Math.round(debtScore),
    maxScore: 20,
    recommendation:
      dti <= 20
        ? 'Tỷ lệ nợ trên thu nhập tốt. Nợ đang ở mức an toàn.'
        : dti <= 36
          ? 'Tỷ lệ nợ khá. Cân nhắc trả nợ nhanh hơn để giảm rủi ro.'
          : 'Tỷ lệ nợ cao. Ưu tiên trả nợ để giảm gánh nặng tài chính.',
  });

  // 4. Savings Score (max 15) — based on free cash flow ratio
  const monthlyIncome = totalMonthlyIncome(profile);
  const monthlyExpense = totalMonthlyExpenses(profile);
  const freeCashFlow = monthlyIncome - monthlyExpense;
  const fcfRatio = monthlyIncome > 0 ? freeCashFlow / monthlyIncome : 0;
  const savingsScore = Math.min(15, Math.max(0, (fcfRatio / 0.3) * 15));
  breakdown.push({
    component: 'Savings',
    score: Math.round(savingsScore),
    maxScore: 15,
    recommendation:
      fcfRatio >= 0.3
        ? 'Khả năng tiết kiệm tốt. Đang tích lũy trên 30% thu nhập.'
        : fcfRatio >= 0.15
          ? 'Khả năng tiết kiệm khá. Nên duy trì và tăng dần.'
          : 'Khả năng tiết kiệm thấp. Nên tối ưu chi phí để tăng quỹ tiết kiệm.',
  });

  // 5. Goal Progress Score (max 20)
  let goalScore = 0;
  if (goalProjections.length > 0) {
    const avgProgress =
      goalProjections.reduce((sum, g) => sum + g.progressPercentage, 0) /
      goalProjections.length;
    goalScore = Math.min(20, (avgProgress / 100) * 20);
  }
  breakdown.push({
    component: 'Goal Progress',
    score: Math.round(goalScore),
    maxScore: 20,
    recommendation:
      goalScore >= 15
        ? 'Tiến độ mục tiêu tốt. Bạn đang đi đúng hướng.'
        : goalScore >= 10
          ? 'Tiến độ mục tiêu khá. Cần duy trì tốc độ tiết kiệm.'
          : 'Tiến độ mục tiêu thấp. Cần điều chỉnh kế hoạch hoặc tăng thu nhập để đạt mục tiêu.',
  });

  const totalScore = Math.round(breakdown.reduce((sum, b) => sum + b.score, 0));

  const rating: FinancialHealthResult['rating'] =
    totalScore >= 85 ? 'EXCELLENT'
      : totalScore >= 70 ? 'HEALTHY'
        : totalScore >= 55 ? 'GOOD'
          : totalScore >= 40 ? 'FAIR'
            : 'POOR';

  return { totalScore, rating, breakdown };
}
