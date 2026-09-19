import { useEffect, useState } from 'react';
import { lifeEventsApi, profileApi } from '../api';
import { formatVND } from '../utils/format';
import type { LifeEventTypeInfo, LifeEventImpact } from '../types';

const DEMO_USER_ID = 'demo-user-minhanh';

export default function LifeEvents() {
  const [eventTypes, setEventTypes] = useState<LifeEventTypeInfo[]>([]);
  const [selected, setSelected] = useState<LifeEventTypeInfo | null>(null);
  const [assumptions, setAssumptions] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LifeEventImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    lifeEventsApi.getTypes().then(setEventTypes).finally(() => setLoading(false));
  }, []);

  const selectEvent = (event: LifeEventTypeInfo) => {
    setSelected(event);
    setAssumptions({ ...event.defaultAssumptions });
    setResult(null);
  };

  const simulate = async () => {
    if (!selected) return;
    setSimulating(true);
    try {
      const userId = localStorage.getItem('userId') || DEMO_USER_ID;
      const data = await lifeEventsApi.simulate({
        userId,
        type: selected.type,
        label: selected.label,
        assumptions,
      });
      setResult(data);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Đang tải...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Life Event Simulator</h1>
      <p className="text-gray-500 mb-8">Mô phỏng tác động tài chính của các sự kiện cuộc sống</p>

      {/* Event type selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {eventTypes.map((event) => (
          <button
            key={event.type}
            onClick={() => selectEvent(event)}
            className={`p-5 rounded-2xl border-2 text-center transition-all ${
              selected?.type === event.type
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-3xl mb-2">{event.icon}</div>
            <p className="font-medium text-sm text-gray-900">{event.label}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assumptions panel */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">Giả định</h3>
            <p className="text-sm text-gray-500 mb-4">Có thể chỉnh sửa các giả định để xem tác động</p>
            <div className="space-y-4">
              {Object.entries(assumptions).map(([key, value]) => (
                <div key={key}>
                  <label className="label">{ASSUMPTION_LABELS[key] || key}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setAssumptions({ ...assumptions, [key]: Number(e.target.value) })}
                      className="input flex-1"
                    />
                    <span className="text-sm text-gray-500 w-20">{ASSUMPTION_UNITS[key] || ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={simulate}
              disabled={simulating}
              className="btn-primary mt-6 w-full disabled:opacity-50"
            >
              {simulating ? 'Đang mô phỏng...' : `Mô phỏng "${selected.label}"`}
            </button>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="space-y-4">
                {/* Before/After comparison */}
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">So sánh trước/sau</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-medium text-gray-500">Chỉ số</div>
                    <div className="font-medium text-gray-500 text-right">Trước</div>
                    <div className="font-medium text-gray-500 text-right">Sau</div>
                  </div>
                  <ComparisonRow label="Thu nhập" before={result.before.monthlyIncome} after={result.after.monthlyIncome} format="vnd" />
                  <ComparisonRow label="Chi phí" before={result.before.monthlyExpense} after={result.after.monthlyExpense} format="vnd" />
                  <ComparisonRow label="Tiết kiệm" before={result.before.monthlySaving} after={result.after.monthlySaving} format="vnd" highlight />
                  <ComparisonRow label="Sức khỏe" before={result.before.healthScore} after={result.after.healthScore} format="score" />
                  <ComparisonRow label="Mục tiêu (tháng)" before={result.before.goalTimelineMonths} after={result.after.goalTimelineMonths} format="months" />
                </div>

                {/* Impact summary */}
                <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Tác động</h3>
                  <div className="space-y-2">
                    <ImpactRow
                      label="Thay đổi tiết kiệm"
                      value={`${result.deltas.monthlySavingDelta >= 0 ? '+' : ''}${formatVND(result.deltas.monthlySavingDelta)}/tháng`}
                      positive={result.deltas.monthlySavingDelta >= 0}
                    />
                    <ImpactRow
                      label="Thay đổi sức khỏe"
                      value={`${result.deltas.healthScoreDelta >= 0 ? '+' : ''}${result.deltas.healthScoreDelta} điểm`}
                      positive={result.deltas.healthScoreDelta >= 0}
                    />
                    <ImpactRow
                      label="Thay đổi thời gian mục tiêu"
                      value={`${result.deltas.goalTimelineDeltaMonths >= 0 ? '+' : ''}${result.deltas.goalTimelineDeltaMonths} tháng`}
                      positive={result.deltas.goalTimelineDeltaMonths <= 0}
                    />
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="text-xs text-gray-400 p-3 rounded-xl bg-gray-50">
                  ⚠️ Đây là kết quả mô phỏng dựa trên giả định, không phải dự báo chính xác.
                  Các số liệu thực tế có thể khác biệt. Không phải lời khuyên tài chính chính thức.
                </div>
              </div>
            ) : (
              <div className="card flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <div className="text-4xl mb-3">{selected.icon}</div>
                  <p className="text-gray-500">Chỉnh sửa giả định và nhấn "Mô phỏng" để xem tác động</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonRow({ label, before, after, format, highlight }: {
  label: string; before: number; after: number; format: string; highlight?: boolean;
}) {
  const fmt = (v: number) => {
    if (format === 'vnd') return formatVND(v);
    if (format === 'score') return `${v}/100`;
    if (format === 'months') return v > 9000 ? '∞' : `${v}`;
    return String(v);
  };
  const delta = after - before;
  const deltaColor = highlight ? (delta >= 0 ? 'text-green-600' : 'text-red-500') : '';

  return (
    <div className="grid grid-cols-3 gap-4 text-sm py-2 border-t border-gray-100">
      <div className="text-gray-600">{label}</div>
      <div className="text-right text-gray-700">{fmt(before)}</div>
      <div className={`text-right font-medium ${deltaColor}`}>
        {fmt(after)}
        {delta !== 0 && (
          <span className="text-xs ml-1 opacity-60">
            ({delta > 0 ? '+' : ''}{format === 'vnd' ? formatVND(delta) : delta})
          </span>
        )}
      </div>
    </div>
  );
}

function ImpactRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>{value}</span>
    </div>
  );
}

const ASSUMPTION_LABELS: Record<string, string> = {
  monthlyChildCost: 'Chi phí con/tháng',
  oneTimeCost: 'Chi phí một lần',
  incomeReductionMonths: 'Số tháng giảm thu nhập',
  incomeReductionPercent: '% giảm thu nhập',
  weddingCost: 'Chi phí đám cưới',
  housingIncrease: 'Tăng chi phí nhà/tháng',
  combinedIncomePercent: '% thu nhập bạn đời',
  housePrice: 'Giá nhà',
  downPaymentPercent: '% trả trước',
  interestRate: 'Lãi suất (%)',
  loanTermYears: 'Kỳ hạn (năm)',
  loanTermMonths: 'Kỳ hạn (tháng)',
  carPrice: 'Giá xe',
  incomeChangePercent: '% thay đổi thu nhập',
  relocationCost: 'Chi phí chuyển đi',
  lossDurationMonths: 'Số tháng mất thu nhập',
  incomeLossPercent: '% thu nhập mất',
  initialCapital: 'Vốn khởi nghiệp',
  monthlyRevenue: 'Doanh thu/tháng',
  monthlyExpense: 'Chi phí/tháng',
  rampUpMonths: 'Tháng đạt doanh thu đầy đủ',
  movingCost: 'Chi phí dọn nhà',
  housingChange: 'Thay đổi chi phí nhà/tháng',
};

const ASSUMPTION_UNITS: Record<string, string> = {
  monthlyChildCost: 'VND',
  oneTimeCost: 'VND',
  weddingCost: 'VND',
  housingIncrease: 'VND',
  housePrice: 'VND',
  carPrice: 'VND',
  relocationCost: 'VND',
  initialCapital: 'VND',
  monthlyRevenue: 'VND',
  monthlyExpense: 'VND',
  movingCost: 'VND',
  housingChange: 'VND',
};
