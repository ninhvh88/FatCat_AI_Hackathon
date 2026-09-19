import type { FinancialProfile, LoanBurdenResult } from '../../types';
import { totalMonthlyIncome, formatVND } from '../../utils/demo-data';

// ============================================================
// Loan Burden Calculator
// Projects debt-to-income ratio after taking a new loan
// and classifies the burden level.
// ============================================================

export function calculateLoanBurden(
  profile: FinancialProfile,
  newLoan: {
    amount: number;
    interestRate: number; // annual %
    loanTermMonths: number;
  }
): LoanBurdenResult {
  const monthlyRate = newLoan.interestRate / 100 / 12;

  // Monthly payment for new loan (amortized)
  let newMonthlyPayment: number;
  if (monthlyRate === 0) {
    newMonthlyPayment = newLoan.amount / newLoan.loanTermMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, newLoan.loanTermMonths);
    newMonthlyPayment = (newLoan.amount * monthlyRate * factor) / (factor - 1);
  }

  const income = totalMonthlyIncome(profile);
  const annualIncome = income * 12;

  // Current DTI
  const currentDebt = profile.liabilities.loanBalance;
  const currentDTI = annualIncome > 0 ? (currentDebt / annualIncome) * 100 : 0;

  // Projected DTI with new loan
  const totalDebt = currentDebt + newLoan.amount;
  const projectedDTI = annualIncome > 0 ? (totalDebt / annualIncome) * 100 : 0;

  // Total monthly debt payment
  const totalMonthlyDebtPayment = profile.liabilities.monthlyRepayment + newMonthlyPayment;

  // Classify burden level based on projected DTI
  let burdenLevel: LoanBurdenResult['burdenLevel'];
  let recommendation: string;

  if (projectedDTI < 20) {
    burdenLevel = 'SAFE';
    recommendation = `An toàn. Tỷ lệ nợ/thu nhập sau vay sẽ là ${projectedDTI.toFixed(1)}% — trong vùng an toàn. Có thể cân nhắc vay thêm nếu cần.`;
  } else if (projectedDTI < 36) {
    burdenLevel = 'MODERATE';
    recommendation = `Vừa phải. Tỷ lệ nợ/thu nhập ${projectedDTI.toFixed(1)}% — chấp nhận được nhưng nên kiểm soát chi phí. Trả ${formatVND(totalMonthlyDebtPayment)}/tháng cho nợ.`;
  } else if (projectedDTI < 50) {
    burdenLevel = 'HIGH';
    recommendation = `Cao. Tỷ lệ nợ/thu nhập ${projectedDTI.toFixed(1)}% — cần cẩn thận. Trả ${formatVND(totalMonthlyDebtPayment)}/tháng chiếm đáng kể thu nhập. Nên ưu tiên trả nợ nhanh.`;
  } else {
    burdenLevel = 'CRITICAL';
    recommendation = `Nguy hiểm. Tỷ lệ nợ/thu nhập ${projectedDTI.toFixed(1)}% — vượt ngưỡng an toàn. Không nên vay thêm. Cần cơ cấu lại nợ hoặc tăng thu nhập.`;
  }

  return {
    currentDTI: Math.round(currentDTI * 10) / 10,
    projectedDTI: Math.round(projectedDTI * 10) / 10,
    monthlyPayment: Math.round(newMonthlyPayment),
    totalMonthlyDebtPayment: Math.round(totalMonthlyDebtPayment),
    burdenLevel,
    recommendation,
  };
}
