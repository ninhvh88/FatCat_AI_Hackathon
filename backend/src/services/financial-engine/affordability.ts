import type { FinancialProfile, AffordabilityResult } from '../../types';
import { calculateFinancialEngine } from './index';
import { totalMonthlyIncome, totalMonthlyExpenses, formatVND } from '../../utils/demo-data';

// ============================================================
// Affordability Calculator
// Determines whether a user can afford a purchase (e.g. house, car)
// based on down payment, loan terms, and post-purchase cash flow.
// ============================================================

export function calculateAffordability(
  profile: FinancialProfile,
  purchase: {
    price: number;
    downPayment: number;
    interestRate: number; // annual %
    loanTermMonths: number;
  }
): AffordabilityResult {
  const loanAmount = purchase.price - purchase.downPayment;
  const monthlyRate = purchase.interestRate / 100 / 12;

  // Amortized monthly payment
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / purchase.loanTermMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, purchase.loanTermMonths);
    monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  // Post-purchase financials
  const income = totalMonthlyIncome(profile);
  const expenses = totalMonthlyExpenses(profile);
  const remainingCashFlow = income - expenses - monthlyPayment;

  // DTI after purchase (annual debt / annual income)
  const existingDebt = profile.liabilities.loanBalance;
  const totalDebt = existingDebt + loanAmount;
  const annualIncome = income * 12;
  const debtToIncomeAfter = annualIncome > 0 ? (totalDebt / annualIncome) * 100 : 0;

  // Emergency fund after using down payment
  const liquidAssetsAfter = profile.assets.cash + profile.assets.savings - purchase.downPayment;
  const emergencyFundMonthsAfter = expenses > 0 ? liquidAssetsAfter / expenses : 0;

  // Health score after purchase (simulate modified profile)
  const modifiedProfile: FinancialProfile = {
    ...profile,
    assets: {
      ...profile.assets,
      cash: Math.max(0, profile.assets.cash - purchase.downPayment),
    },
    liabilities: {
      ...profile.liabilities,
      loanBalance: existingDebt + loanAmount,
      monthlyRepayment: profile.liabilities.monthlyRepayment + monthlyPayment,
    },
  };
  const engineAfter = calculateFinancialEngine(modifiedProfile);
  const healthScoreAfter = engineAfter.financialHealth.totalScore;

  // Affordability criteria: positive cash flow, DTI < 50%, emergency fund > 3 months
  const affordable =
    remainingCashFlow > 0 &&
    debtToIncomeAfter < 50 &&
    emergencyFundMonthsAfter >= 3;

  let recommendation: string;
  if (affordable) {
    recommendation = `Khả thi. Sau khi mua, dòng tiền tự do còn ${formatVND(remainingCashFlow)}/tháng, tỷ lệ nợ/thu nhập ${debtToIncomeAfter.toFixed(1)}%. Điểm sức khỏe tài chính dự kiến ${healthScoreAfter}/100.`;
  } else if (remainingCashFlow <= 0) {
    recommendation = `Không khả thi. Khoản trả hàng tháng ${formatVND(monthlyPayment)} sẽ làm dòng tiền âm (${formatVND(remainingCashFlow)}). Cần tăng thu nhập, giảm chi phí, hoặc giảm giá mua.`;
  } else if (debtToIncomeAfter >= 50) {
    recommendation = `Rủi ro cao. Tỷ lệ nợ/thu nhập sau khi mua sẽ đạt ${debtToIncomeAfter.toFixed(1)}% — vượt ngưỡng an toàn 50%. Cân nhắc tăng down payment hoặc kéo dài kỳ hạn.`;
  } else {
    recommendation = `Cần thận trọng. Quỹ dự phòng sau khi mua chỉ còn ${emergencyFundMonthsAfter.toFixed(1)} tháng chi phí. Nên bổ sung quỹ dự phòng trước khi mua.`;
  }

  return {
    affordable,
    purchasePrice: purchase.price,
    downPayment: purchase.downPayment,
    loanAmount,
    monthlyPayment: Math.round(monthlyPayment),
    remainingCashFlow: Math.round(remainingCashFlow),
    debtToIncomeAfter: Math.round(debtToIncomeAfter * 10) / 10,
    emergencyFundMonthsAfter: Math.round(emergencyFundMonthsAfter * 10) / 10,
    healthScoreAfter,
    recommendation,
  };
}
