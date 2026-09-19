import { useEffect, useState } from 'react';
import { goalsApi } from '../api';
import { formatVND, formatMonths } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from '../components/Charts';

const DEMO_USER_ID = 'demo-user-minhanh';

export default function Goals() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || DEMO_USER_ID;
    goalsApi.getProjection(userId).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Đang tải...</div>;
  if (!data || !data.scenarios) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Không có dữ liệu mục tiêu</div>;

  const { goal, scenarios } = data;

  const chartData = scenarios.map((s: any) => ({
    name: s.label,
    'Tiết kiệm/tháng': s.monthlySaving,
    'Dự kiến có': s.projection.expectedSavings,
    'Mục tiêu': goal.targetAmount,
  }));

  const monthsData = scenarios.map((s: any) => ({
    name: s.label,
    'Tháng cần thiết': s.projection.monthsToTarget,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Goal Planner</h1>
      <p className="text-gray-500 mb-8">
        Mục tiêu: <span className="font-medium text-gray-900">{goal.goalName}</span> — {formatVND(goal.targetAmount)}
      </p>

      {/* Goal summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Vốn hiện có</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatVND(goal.currentAllocated ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Mục tiêu</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatVND(goal.targetAmount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Khoảng cách tài trợ</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {formatVND(scenarios[1]?.projection.fundingGap ?? 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Tiết kiệm cần thiết</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">
            {formatVND(scenarios[1]?.projection.requiredMonthlySaving ?? 0)}/tháng
          </p>
        </div>
      </div>

      {/* 3 Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {scenarios.map((s: any) => {
          const colors = {
            Conservative: 'border-yellow-200 bg-yellow-50',
            Base: 'border-primary-200 bg-primary-50',
            Optimistic: 'border-green-200 bg-green-50',
          };
          return (
            <div key={s.name} className={`card border-2 ${colors[s.name as keyof typeof colors] || 'border-gray-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-1">{s.label}</h3>
              <p className="text-sm text-gray-500 mb-4">{s.name}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tiết kiệm/tháng</span>
                  <span className="font-medium">{formatVND(s.monthlySaving)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian</span>
                  <span className="font-medium">{formatMonths(s.projection.monthsToTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dự kiến có</span>
                  <span className="font-medium">{formatVND(s.projection.expectedSavings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Khoảng cách</span>
                  <span className={`font-medium ${s.projection.fundingGap > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {formatVND(s.projection.fundingGap)}
                  </span>
                </div>
                <div className="pt-2">
                  <span className={`badge ${s.projection.isAchievable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.projection.isAchievable ? '✓ Khả thi' : 'Cần điều chỉnh'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">So sánh tiết kiệm và dự phóng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatVND(v)} />
              <Tooltip formatter={(v: number) => formatVND(v)} />
              <Legend />
              <Bar dataKey="Tiết kiệm/tháng" fill="#3b82f6" />
              <Bar dataKey="Dự kiến có" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Thời gian đạt mục tiêu (tháng)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Tháng cần thiết" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
