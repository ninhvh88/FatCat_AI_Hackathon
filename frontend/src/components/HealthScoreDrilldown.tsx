import type { FinancialHealthBreakdown } from '../types';

interface Props {
  breakdown: FinancialHealthBreakdown;
  onClose: () => void;
}

// Reference thresholds for each health dimension
const THRESHOLDS: Record<string, { good: string; warning: string; poor: string; factors: string[]; actions: string[] }> = {
  'Cash Flow': {
    good: '≥ 40% saving rate',
    warning: '20-40% saving rate',
    poor: '< 20% saving rate',
    factors: ['Monthly income', 'Monthly expenses', 'Lifestyle spending'],
    actions: ['Reduce non-essential expenses', 'Increase income via side hustle', 'Negotiate recurring bills'],
  },
  'Emergency Fund': {
    good: '≥ 6 months of expenses',
    warning: '3-6 months of expenses',
    poor: '< 3 months of expenses',
    factors: ['Cash + savings balance', 'Monthly expense level'],
    actions: ['Build emergency fund to 6 months', 'Automate monthly savings', 'Keep in liquid account'],
  },
  'Debt': {
    good: 'DTI < 20%',
    warning: 'DTI 20-36%',
    poor: 'DTI > 36%',
    factors: ['Total loan balance', 'Annual income', 'Interest rates'],
    actions: ['Prioritize high-interest debt', 'Consider debt consolidation', 'Avoid new borrowing'],
  },
  'Savings': {
    good: '≥ 30% free cash flow ratio',
    warning: '15-30% free cash flow ratio',
    poor: '< 15% free cash flow ratio',
    factors: ['Free cash flow', 'Income level', 'Expense optimization'],
    actions: ['Increase saving rate by 5%', 'Set up automatic transfers', 'Track spending categories'],
  },
  'Goal Progress': {
    good: '≥ 80% average progress',
    warning: '40-80% average progress',
    poor: '< 40% average progress',
    factors: ['Current savings', 'Target amount', 'Monthly contribution', 'Time remaining'],
    actions: ['Increase monthly contribution', 'Adjust target date', 'Review investment returns'],
  },
};

export default function HealthScoreDrilldown({ breakdown, onClose }: Props) {
  const threshold = THRESHOLDS[breakdown.component] ?? {
    good: 'N/A', warning: 'N/A', poor: 'N/A',
    factors: [], actions: [],
  };
  const ratio = breakdown.score / breakdown.maxScore;
  const level = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'warning' : 'poor';
  const levelLabel = { good: 'Tốt', warning: 'Cần cải thiện', poor: 'Yếu' }[level];
  const levelColor = { good: 'text-green-600', warning: 'text-yellow-600', poor: 'text-red-500' }[level];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{breakdown.component}</h3>
            <p className="text-sm text-gray-500">Chỉ số sức khỏe tài chính</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-gray-50">
          <div className="text-4xl font-bold text-gray-900">
            {breakdown.score}
            <span className="text-lg text-gray-400">/{breakdown.maxScore}</span>
          </div>
          <div>
            <p className={`font-semibold ${levelColor}`}>{levelLabel}</p>
            <p className="text-xs text-gray-500">Đạt {Math.round(ratio * 100)}% điểm tối đa</p>
          </div>
        </div>

        {/* Reference thresholds */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Tham chiếu</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">Tốt</span>
              <span className="text-gray-600">{threshold.good}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Cần cải thiện</span>
              <span className="text-gray-600">{threshold.warning}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-500">Yếu</span>
              <span className="text-gray-600">{threshold.poor}</span>
            </div>
          </div>
        </div>

        {/* Why this score */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Tại sao điểm này?</h4>
          <p className="text-sm text-gray-600">{breakdown.recommendation}</p>
        </div>

        {/* Factors */}
        {threshold.factors.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Yếu tố ảnh hưởng</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {threshold.factors.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {threshold.actions.length > 0 && (
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Hành động cải thiện</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {threshold.actions.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">→</span>{a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
          ⚠️ Đây là chỉ số sức khỏe tài chính nội bộ, không phải sự thật tuyệt đối về tài chính cá nhân.
        </p>
      </div>
    </div>
  );
}
