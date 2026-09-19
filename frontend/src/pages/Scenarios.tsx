import { useEffect, useState } from 'react';
import { scenariosApi } from '../api';
import { formatVND, formatPercent } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '../components/Charts';
import type { ScenarioConfig, ScenarioResult } from '../types';

const DEMO_USER_ID = 'demo-user-minhanh';

export default function Scenarios() {
  const [predefined, setPredefined] = useState<ScenarioConfig[]>([]);
  const [baseline, setBaseline] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || DEMO_USER_ID;
    Promise.all([
      scenariosApi.getPredefined().then(setPredefined),
      scenariosApi.getBaseline(userId).then(setBaseline),
    ]).finally(() => setLoading(false));
  }, []);

  const toggle = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const simulate = async () => {
    if (selected.size === 0) return;
    setSimulating(true);
    try {
      const userId = localStorage.getItem('userId') || DEMO_USER_ID;
      const scenariosToSim = predefined.filter((s) => selected.has(s.label));
      const data = await scenariosApi.simulate({
        userId,
        scenarios: scenariosToSim.map((s) => ({ type: s.type, label: s.label, params: s.params })),
      });
      setResults(data.results);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Đang tải...</div>;

  const baselineCashFlow = baseline?.baseline?.cashFlow;
  const baselineHealth = baseline?.baseline?.financialHealth;
  const baselineNetWorth = baseline?.baseline?.netWorth;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Scenario Simulator</h1>
      <p className="text-gray-500 mb-8">Mô phỏng các kịch bản tài chính và so sánh với hiện tại</p>

      {/* Current scenario */}
      {baselineCashFlow && (
        <div className="card mb-6 bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Hiện tại</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Dòng tiền tự do</p>
              <p className="text-lg font-bold text-gray-900">{formatVND(baselineCashFlow.monthlyFreeCashFlow)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tỷ lệ tiết kiệm</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(baselineCashFlow.savingRate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tài sản ròng</p>
              <p className="text-lg font-bold text-gray-900">{formatVND(baselineNetWorth?.netWorth ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Điểm sức khỏe</p>
              <p className="text-lg font-bold text-gray-900">{baselineHealth?.totalScore ?? 0}/100</p>
            </div>
          </div>
        </div>
      )}

      {/* Scenario selection */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Chọn kịch bản để mô phỏng</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {predefined.map((s) => (
            <button
              key={s.label}
              onClick={() => toggle(s.label)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected.has(s.label)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  selected.has(s.label) ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                }`}>
                  {selected.has(s.label) && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="font-medium text-sm text-gray-900">{s.label}</span>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={simulate}
          disabled={selected.size === 0 || simulating}
          className="btn-primary mt-4 disabled:opacity-50"
        >
          {simulating ? 'Đang mô phỏng...' : `Mô phỏng ${selected.size} kịch bản`}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Comparison table */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">So sánh kịch bản</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500">Kịch bản</th>
                    <th className="text-right py-2 px-3 text-gray-500">Dòng tiền tự do</th>
                    <th className="text-right py-2 px-3 text-gray-500">Thay đổi</th>
                    <th className="text-right py-2 px-3 text-gray-500">Tỷ lệ tiết kiệm</th>
                    <th className="text-right py-2 px-3 text-gray-500">Điểm sức khỏe</th>
                    <th className="text-right py-2 px-3 text-gray-500">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-2 px-3 font-medium">Hiện tại</td>
                    <td className="text-right py-2 px-3">{formatVND(baselineCashFlow?.monthlyFreeCashFlow ?? 0)}</td>
                    <td className="text-right py-2 px-3">—</td>
                    <td className="text-right py-2 px-3">{formatPercent(baselineCashFlow?.savingRate ?? 0)}</td>
                    <td className="text-right py-2 px-3">{baselineHealth?.totalScore ?? 0}</td>
                    <td className="text-right py-2 px-3">—</td>
                  </tr>
                  {results.map((r) => (
                    <tr key={r.config.label} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{r.config.label}</td>
                      <td className="text-right py-2 px-3">{formatVND(r.engineResult.cashFlow.monthlyFreeCashFlow)}</td>
                      <td className={`text-right py-2 px-3 font-medium ${r.comparison.cashFlowDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {r.comparison.cashFlowDelta >= 0 ? '+' : ''}{formatVND(r.comparison.cashFlowDelta)}
                      </td>
                      <td className="text-right py-2 px-3">{formatPercent(r.engineResult.cashFlow.savingRate)}</td>
                      <td className="text-right py-2 px-3">{r.engineResult.financialHealth.totalScore}</td>
                      <td className={`text-right py-2 px-3 font-medium ${r.comparison.healthScoreDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {r.comparison.healthScoreDelta >= 0 ? '+' : ''}{r.comparison.healthScoreDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Biểu đồ so sánh</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={[
                { name: 'Hiện tại', 'Dòng tiền': baselineCashFlow?.monthlyFreeCashFlow ?? 0, 'Tài sản ròng': baselineNetWorth?.netWorth ?? 0 },
                ...results.map((r) => ({
                  name: r.config.label,
                  'Dòng tiền': r.engineResult.cashFlow.monthlyFreeCashFlow,
                  'Tài sản ròng': r.engineResult.netWorth.netWorth,
                })),
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatVND(v)} />
                <Tooltip formatter={(v: number) => formatVND(v)} />
                <Legend />
                <Bar dataKey="Dòng tiền" fill="#3b82f6" />
                <Bar dataKey="Tài sản ròng" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
