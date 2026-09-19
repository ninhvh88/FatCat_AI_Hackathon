import type { FinancialProfile, FinancialEngineResult, AIInsight } from '../types';
import { formatVND, totalMonthlyIncome, totalMonthlyExpenses } from '../utils/demo-data';

// ============================================================
// Insight Service
// Generates 3-5 AI insights based on Financial Engine output.
// All numbers come from the engine — LLM does NOT calculate.
// ============================================================

export function generateInsights(
  profile: FinancialProfile,
  engine: FinancialEngineResult
): AIInsight[] {
  const insights: AIInsight[] = [];

  // 1. Strength insight — best scoring component
  const bestComponent = [...engine.financialHealth.breakdown].sort(
    (a, b) => b.score / b.maxScore - a.score / a.maxScore
  )[0];

  if (bestComponent && bestComponent.score / bestComponent.maxScore >= 0.7) {
    insights.push({
      id: 'insight-strength',
      type: 'STRENGTH',
      title: 'Điểm mạnh nhất',
      category: bestComponent.component,
      message: getStrengthMessage(bestComponent.component, engine),
      metric: bestComponent.score,
    });
  }

  // 2. Warning insight — worst scoring component
  const worstComponent = [...engine.financialHealth.breakdown].sort(
    (a, b) => a.score / a.maxScore - b.score / b.maxScore
  )[0];

  if (worstComponent && worstComponent.score / worstComponent.maxScore < 0.7) {
    insights.push({
      id: 'insight-warning',
      type: 'WARNING',
      title: 'Cần lưu ý',
      category: worstComponent.component,
      message: getWarningMessage(worstComponent.component, engine, profile),
      metric: worstComponent.score,
    });
  }

  // 3. Opportunity insight
  const monthlyIncome = totalMonthlyIncome(profile);
  const freeCashFlow = engine.cashFlow.monthlyFreeCashFlow;
  if (freeCashFlow > 0 && engine.goalProjection.length > 0) {
    const goal = engine.goalProjection[0];
    const extraSaving = Math.min(freeCashFlow * 0.25, 3_000_000); // suggest saving 25% more, max 3M
    const monthsSaved = goal.fundingGap > 0 ? Math.round(goal.fundingGap / extraSaving) : 0;
    insights.push({
      id: 'insight-opportunity',
      type: 'OPPORTUNITY',
      title: 'Cơ hội',
      category: 'Goal',
      message: `Nếu tăng tiết kiệm thêm ${formatVND(extraSaving)}/tháng, bạn có thể rút ngắn ${monthsSaved} tháng để đạt mục tiêu "${goal.goalName}".`,
      metric: extraSaving,
    });
  }

  // 4. Cash flow insight
  const savingRate = engine.cashFlow.savingRate;
  if (savingRate > 0) {
    insights.push({
      id: 'insight-cashflow',
      type: 'STRENGTH',
      title: 'Dòng tiền',
      category: 'Cash Flow',
      message: `Bạn đang giữ được ${savingRate.toFixed(1)}% thu nhập mỗi tháng (${formatVND(freeCashFlow)} dòng tiền tự do).`,
      metric: savingRate,
    });
  }

  // 5. Debt insight
  const dti = engine.debtRatio.debtToIncome;
  if (dti > 0) {
    insights.push({
      id: 'insight-debt',
      type: dti > 36 ? 'WARNING' : 'STRENGTH',
      title: dti > 36 ? 'Tỷ lệ nợ cao' : 'Tỷ lệ nợ an toàn',
      category: 'Debt',
      message: `Khoản vay đang chiếm ${dti.toFixed(1)}% thu nhập hàng năm. ${dti > 36 ? 'Nên ưu tiên trả nợ.' : 'Mức nợ đang trong vùng an toàn.'}`,
      metric: dti,
    });
  }

  return insights.slice(0, 5);
}

function getStrengthMessage(component: string, engine: FinancialEngineResult): string {
  switch (component) {
    case 'Cash Flow':
      return `Bạn đang giữ được ${engine.cashFlow.savingRate.toFixed(1)}% thu nhập mỗi tháng.`;
    case 'Emergency Fund':
      return `Quỹ dự phòng đủ cho ${engine.emergencyFund.emergencyFundMonths} tháng chi phí.`;
    case 'Debt':
      return `Tỷ lệ nợ trên thu nhập ${engine.debtRatio.debtToIncome.toFixed(1)}% — mức an toàn.`;
    case 'Savings':
      return `Dòng tiền tự do ${formatVND(engine.cashFlow.monthlyFreeCashFlow)}/tháng.`;
    case 'Goal Progress':
      return `Tiến độ mục tiêu tốt, đang đi đúng hướng.`;
    default:
      return 'Vùng tài chính tốt.';
  }
}

function getWarningMessage(
  component: string,
  engine: FinancialEngineResult,
  profile: FinancialProfile
): string {
  switch (component) {
    case 'Cash Flow':
      return `Tỷ lệ tiết kiệm ${engine.cashFlow.savingRate.toFixed(1)}% — nên cải thiện dòng tiền.`;
    case 'Emergency Fund':
      return `Quỹ dự phòng chỉ đủ ${engine.emergencyFund.emergencyFundMonths} tháng — nên bổ sung lên 6 tháng.`;
    case 'Debt':
      return `Khoản vay chiếm ${engine.debtRatio.debtToIncome.toFixed(1)}% thu nhập — nên ưu tiên trả nợ.`;
    case 'Savings':
      return `Khả năng tiết kiệm thấp — nên tối ưu chi phí.`;
    case 'Goal Progress':
      if (engine.goalProjection.length > 0) {
        const gap = engine.goalProjection[0].fundingGap;
        return `Khoảng cách tài trợ ${formatVND(gap)} — cần điều chỉnh kế hoạch.`;
      }
      return 'Tiến độ mục tiêu thấp.';
    default:
      return 'Cần cải thiện vùng tài chính này.';
  }
}
