import type { FinancialProfile, FinancialEngineResult, ActionPlan, ActionPlanItem } from '../types';
import { formatVND } from '../utils/demo-data';

// ============================================================
// Action Plan Service
// Generates a prioritized action plan based on Financial Engine output.
// All numbers come from the engine — LLM does NOT calculate.
// ============================================================

export function generateActionPlan(
  profile: FinancialProfile,
  engine: FinancialEngineResult
): ActionPlan {
  const items: ActionPlanItem[] = [];
  const breakdown = engine.financialHealth.breakdown;

  // Sort components by score ratio (ascending — worst first)
  const sorted = [...breakdown].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);

  let priority = 1;

  for (const comp of sorted) {
    if (comp.score / comp.maxScore >= 0.8) continue; // skip good areas

    const item = createActionItem(comp, engine, profile, priority);
    if (item) {
      items.push(item);
      priority++;
    }
  }

  // Always ensure at least the goal is mentioned
  if (engine.goalProjection.length > 0) {
    const goal = engine.goalProjection[0];
    const hasGoalItem = items.some((i) => i.category === 'GOAL');
    if (!hasGoalItem) {
      items.push({
        priority: priority++,
        title: `Mục tiêu: ${goal.goalName}`,
        description: goal.isAchievable
          ? `Mục tiêu khả thi với tốc độ tiết kiệm hiện tại. Dự kiến đạt trong ${goal.monthsToTarget} tháng.`
          : `Cần tăng tiết kiệm lên ${formatVND(goal.requiredMonthlySaving)}/tháng hoặc điều chỉnh thời gian. Khoảng cách tài trợ: ${formatVND(goal.fundingGap)}.`,
        target: formatVND(goal.targetAmount),
        category: 'GOAL',
      });
    }
  }

  // Generate summary
  const score = engine.financialHealth.totalScore;
  const summary = `Điểm sức khỏe tài chính: ${score}/100 (${engine.financialHealth.rating}). ${items.length > 0 ? `Ưu tiên hàng đầu: "${items[0].title}".` : 'Tài chính đang ở mức tốt.'}`;

  return { items, summary };
}

function createActionItem(
  comp: { component: string; score: number; maxScore: number; recommendation: string },
  engine: FinancialEngineResult,
  profile: FinancialProfile,
  priority: number
): ActionPlanItem | null {
  switch (comp.component) {
    case 'Emergency Fund':
      return {
        priority,
        title: 'Xây dựng quỹ dự phòng',
        description: comp.recommendation,
        target: `Mục tiêu: ${formatVND(engine.emergencyFund.recommendedFund)} (6 tháng chi phí)`,
        category: 'EMERGENCY_FUND',
      };

    case 'Debt':
      return {
        priority,
        title: 'Tối ưu hóa khoản nợ',
        description: comp.recommendation,
        target: `Tỷ lệ nợ/thu nhập hiện tại: ${engine.debtRatio.debtToIncome.toFixed(1)}%`,
        category: 'DEBT',
      };

    case 'Cash Flow':
      return {
        priority,
        title: 'Kiểm soát chi phí',
        description: comp.recommendation,
        target: `Mục tiêu tăng tiết kiệm: +${formatVND(Math.round(engine.cashFlow.monthlyFreeCashFlow * 0.1))}/tháng`,
        category: 'SPENDING',
      };

    case 'Savings':
      return {
        priority,
        title: 'Tăng khả năng tiết kiệm',
        description: comp.recommendation,
        target: `Dòng tiền tự do: ${formatVND(engine.cashFlow.monthlyFreeCashFlow)}/tháng`,
        category: 'INCOME',
      };

    case 'Goal Progress':
      if (engine.goalProjection.length > 0) {
        const goal = engine.goalProjection[0];
        return {
          priority,
          title: `Đạt mục tiêu: ${goal.goalName}`,
          description: comp.recommendation,
          target: goal.isAchievable
            ? `Đạt trong ${goal.monthsToTarget} tháng`
            : `Cần ${formatVND(goal.requiredMonthlySaving)}/tháng`,
          category: 'GOAL',
        };
      }
      return null;

    default:
      return null;
  }
}
