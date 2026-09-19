import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, profileApi } from '../api';
import type { DashboardData, FinancialHealthBreakdown } from '../types';
import { formatVND, formatPercent, formatMonths, getHealthColor, getHealthBg, getInsightColor, getInsightIcon } from '../utils/format';
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ProgressView,
} from '../components/Charts';
import HealthScoreDrilldown from '../components/HealthScoreDrilldown';

const DEMO_USER_ID = 'demo-user-minhanh';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<FinancialHealthBreakdown | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId') || DEMO_USER_ID;
    dashboardApi.get(userId).then(setData).catch((e) => {
      setError('Không thể tải dashboard. Vui lòng load demo trước.');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Đang tải...</div>;
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-gray-500">{error || 'Không có dữ liệu'}</p>
      <button onClick={async () => {
        await profileApi.loadDemo().catch(() => {});
        localStorage.setItem('userId', DEMO_USER_ID);
        window.location.reload();
      }} className="btn-primary">Load Demo Persona</button>
    </div>
  );

  const { profile, engineResult: engine, insights, actionPlan } = data;
  const { cashFlow, netWorth, debtRatio, emergencyFund, goalProjection, financialHealth } = engine;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Hồ sơ tài chính của {profile.personal.age} tuổi · {profile.personal.maritalStatus}
          {profile.personal.dependents > 0 && ` · ${profile.personal.dependents} người phụ thuộc`}
        </p>
      </div>

      {/* Row 1: Health Score + Cash Flow + Net Worth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Financial Health */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Financial Health</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-32">
              <RadialBarChart
                data={[{ value: financialHealth.totalScore, fill: getHealthBg(financialHealth.totalScore).replace('bg-', '').includes('green') ? '#16a34a' : financialHealth.totalScore >= 70 ? '#059669' : financialHealth.totalScore >= 55 ? '#3b82f6' : financialHealth.totalScore >= 40 ? '#eab308' : '#dc2626' }]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getHealthColor(financialHealth.totalScore)}`}>
                  {financialHealth.totalScore}
                </span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{financialHealth.rating}</p>
              <div className="mt-2 space-y-1">
                {financialHealth.breakdown.map((b) => (
                  <button
                    key={b.component}
                    onClick={() => setDrilldown(b)}
                    className="flex justify-between text-xs w-full hover:bg-gray-50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                    title="Click để xem chi tiết"
                  >
                    <span className="text-gray-500">{b.component}</span>
                    <span className="font-medium text-gray-700">{b.score}/{b.maxScore}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Cash Flow */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Monthly Cash Flow</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Thu nhập</span>
              <span className="font-semibold text-green-600">{formatVND(cashFlow.monthlyIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chi phí</span>
              <span className="font-semibold text-red-500">{formatVND(cashFlow.monthlyExpense)}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-medium text-gray-900">Dòng tiền tự do</span>
              <span className="font-bold text-primary-600">{formatVND(cashFlow.monthlyFreeCashFlow)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tỷ lệ tiết kiệm</span>
              <span className="text-sm font-medium text-primary-600">{formatPercent(cashFlow.savingRate)}</span>
            </div>
          </div>
        </div>

        {/* Net Worth */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Net Worth</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatVND(netWorth.netWorth)}</p>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tổng tài sản</span>
              <span className="font-medium text-green-600">{formatVND(netWorth.totalAssets)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tổng nợ</span>
              <span className="font-medium text-red-500">{formatVND(netWorth.totalLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Emergency Fund + Goal + AI Insight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Emergency Fund */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Emergency Fund</h3>
          <p className="text-3xl font-bold text-gray-900">
            {emergencyFund.emergencyFundMonths}
            <span className="text-lg text-gray-400 ml-1">tháng</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Quỹ hiện tại: {formatVND(emergencyFund.emergencyFundBalance)}
          </p>
          <p className="text-sm text-gray-500">
            Khuyến nghị: {formatVND(emergencyFund.recommendedFund)} (6 tháng)
          </p>
          {emergencyFund.shortfall > 0 && (
            <p className="text-sm text-yellow-600 mt-2">
              Cần bổ sung: {formatVND(emergencyFund.shortfall)}
            </p>
          )}
        </div>

        {/* Goal */}
        {goalProjection.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Mục tiêu</h3>
            {goalProjection.map((goal) => (
              <div key={goal.goalName}>
                <p className="font-semibold text-gray-900">{goal.goalName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Target: {formatVND(goal.targetAmount)} · {formatMonths(goal.monthsToTarget)}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Tiến độ</span>
                    <span className="font-medium">{goal.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
                    />
                  </div>
                  <p className={`text-sm mt-2 ${goal.isAchievable ? 'text-green-600' : 'text-yellow-600'}`}>
                    {goal.isAchievable ? '✓ Khả thi' : `Cần ${formatVND(goal.requiredMonthlySaving)}/tháng`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Insight */}
        <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100">
          <h3 className="text-sm font-medium text-primary-600 mb-4">🤖 AI Insight</h3>
          {insights.length > 0 ? (
            <p className="text-gray-700 leading-relaxed">{insights[0].message}</p>
          ) : (
            <p className="text-gray-500">Đang phân tích...</p>
          )}
          <button
            onClick={() => navigate('/coach')}
            className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Trò chuyện với AI Coach →
          </button>
        </div>
      </div>

      {/* Row 3: AI Insight Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div key={insight.id} className={`card border-2 ${getInsightColor(insight.type)}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{insight.title}</p>
                  <p className="font-semibold text-gray-900 mt-1">{insight.category}</p>
                  <p className="text-sm text-gray-600 mt-2">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Action Plan */}
      {actionPlan && actionPlan.items.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Personal Financial Action Plan</h2>
          <p className="text-sm text-gray-500 mb-4">{actionPlan.summary}</p>
          <div className="space-y-3">
            {actionPlan.items.map((item) => (
              <div key={item.priority} className="flex gap-4 items-start p-3 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {item.priority}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.target && <p className="text-sm text-primary-600 mt-1">{item.target}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Score Drilldown Modal */}
      {drilldown && (
        <HealthScoreDrilldown breakdown={drilldown} onClose={() => setDrilldown(null)} />
      )}
    </div>
  );
}
