import { useState, useEffect, useRef } from 'react';
import { lifeEventsApi } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DEMO_USER_ID = 'demo-user-minhanh';

interface LifeEventTypeInfo {
  type: string;
  label: string;
  icon: string;
  defaultAssumptions: Record<string, number>;
}

interface MarketEvent {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  assumptions: Record<string, number>;
  scenarioType: string;
  dataSource: string;
}

interface EventAIAnalysis {
  analysis: string;
  impactLevel: string;
  metrics: {
    before: { income: string; expense: string; saving: string; health: string; goalMonths: string };
    after: { income: string; expense: string; saving: string; health: string; goalMonths: string };
    deltas: { saving: string; health: string; goalMonths: string };
  };
}

function impactColor(level: string): string {
  switch (level) {
    case 'LOW': return 'text-green-600 bg-green-100';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
    case 'HIGH': return 'text-orange-600 bg-orange-100';
    case 'CRITICAL': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function impactLabel(level: string): string {
  return { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' }[level] || level;
}

const ASSUMPTION_LABELS: Record<string, string> = {
  monthlyChildCost: 'Chi phí nuôi con/tháng', oneTimeCost: 'Chi phí một lần',
  incomeReductionMonths: 'Số tháng giảm thu nhập', incomeReductionPercent: '% giảm thu nhập',
  weddingCost: 'Chi phí đám cưới', housingIncrease: 'Tăng chi phí nhà cửa',
  combinedIncomePercent: '% thu nhập vợ/chồng', housePrice: 'Giá nhà',
  downPaymentPercent: '% trả trước', interestRate: 'Lãi suất (%)', loanTermYears: 'Thời hạn vay (năm)',
  carPrice: 'Giá ô tô', loanTermMonths: 'Thời hạn vay (tháng)',
  incomeChangePercent: '% thay đổi thu nhập', relocationCost: 'Chi phí chuyển chỗ',
  lossDurationMonths: 'Số tháng mất việc', incomeLossPercent: '% mất thu nhập',
  initialCapital: 'Vốn khởi nghiệp', monthlyRevenue: 'Doanh thu/tháng',
  monthlyExpense: 'Chi phí/tháng', rampUpMonths: 'Thời gian ramp-up',
  movingCost: 'Chi phí dọn nhà', housingChange: 'Thay đổi chi phí nhà',
  percent: 'Phần trăm (%)', amount: 'Số tiền (VND)', stockChangePercent: '% thay đổi cổ phiếu',
};

export default function LifeEvents() {
  const userId = localStorage.getItem('userId') || DEMO_USER_ID;
  const [eventTypes, setEventTypes] = useState<LifeEventTypeInfo[]>([]);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [selected, setSelected] = useState<LifeEventTypeInfo | null>(null);
  const [assumptions, setAssumptions] = useState<Record<string, number>>({});
  const [streamState, setStreamState] = useState<'idle' | 'streaming' | 'completed' | 'error'>('idle');
  const [streamContent, setStreamContent] = useState('');
  const [metadata, setMetadata] = useState<{ metrics: any; impactLevel: string; eventImpact: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'life' | 'market'>('life');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    lifeEventsApi.getTypes().then(setEventTypes).catch(() => {});
    lifeEventsApi.getMarketEvents().then(setMarketEvents).catch(() => {});
    return () => { abortRef.current?.abort(); };
  }, []);

  const stopAnalysis = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamState('idle');
  };

  const runAnalysis = async (type: string, label: string, assumps?: Record<string, number>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreamState('streaming');
    setError(null);
    setStreamContent('');
    setMetadata(null);

    let receivedDone = false;
    try {
      for await (const event of lifeEventsApi.aiAnalyzeStream(
        { userId, type, label, assumptions: assumps },
        controller.signal
      )) {
        if (controller.signal.aborted) break;
        switch (event.type) {
          case 'metadata': setMetadata(event); break;
          case 'delta': setStreamContent((prev) => prev + event.content); break;
          case 'done': setStreamContent(event.analysis); setStreamState('completed'); receivedDone = true; break;
          case 'error': setError(event.message); setStreamState('error'); break;
        }
      }
      if (!controller.signal.aborted && !receivedDone) setStreamState('completed');
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setStreamState('idle');
      } else {
        setError('❌ Không thể phân tích. Vui lòng thử lại.');
        setStreamState('error');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const selectEvent = (event: LifeEventTypeInfo) => {
    setSelected(event);
    setAssumptions({ ...event.defaultAssumptions });
    setMetadata(null);
    setStreamContent('');
    setStreamState('idle');
    setError(null);
  };

  const runMarketEvent = async (event: MarketEvent) => {
    // Market events use scenario types from the scenario engine
    // We map them to life event types or use CUSTOM
    const lifeType = mapMarketToLifeEvent(event.scenarioType);
    await runAnalysis(lifeType, event.title, event.assumptions);
  };

  const mapMarketToLifeEvent = (scenarioType: string): string => {
    const map: Record<string, string> = {
      LOAN_INTEREST_INCREASE: 'JOB_CHANGE', // Will use assumptions
      INCOME_INCREASE: 'JOB_CHANGE',
      INCOME_DECREASE: 'INCOME_LOSS',
      EXPENSE_INCREASE: 'HAVE_CHILD', // Will use assumptions
      CUSTOM: 'INCOME_LOSS',
    };
    return map[scenarioType] || 'INCOME_LOSS';
  };

  const chartData = metadata ? [
    {
      name: 'Trước',
      'Thu nhập': Math.round((metadata.eventImpact.before?.monthlyIncome || 0) / 1000000),
      'Chi phí': Math.round((metadata.eventImpact.before?.monthlyExpense || 0) / 1000000),
      'Tiết kiệm': Math.round((metadata.eventImpact.before?.monthlySaving || 0) / 1000000),
    },
    {
      name: 'Sau',
      'Thu nhập': Math.round((metadata.eventImpact.after?.monthlyIncome || 0) / 1000000),
      'Chi phí': Math.round((metadata.eventImpact.after?.monthlyExpense || 0) / 1000000),
      'Tiết kiệm': Math.round((metadata.eventImpact.after?.monthlySaving || 0) / 1000000),
    },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sự kiện Tài chính</h1>
      <p className="text-gray-500 mb-6">Phân tích tác động sự kiện đến hồ sơ tài chính của bạn</p>

      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('life')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'life' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Sự kiện cuộc sống
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'market' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Sự kiện thị trường
        </button>
      </div>

      {/* Life Events Tab */}
      {activeTab === 'life' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Chọn sự kiện cuộc sống</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {eventTypes.map((event) => (
                <button
                  key={event.type}
                  onClick={() => selectEvent(event)}
                  className={`p-4 rounded-lg border text-center transition ${
                    selected?.type === event.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{event.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{event.label}</div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">{selected.icon} {selected.label} — Giả định</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(assumptions).map(([key, value]) => (
                  <div key={key}>
                    <label className="label">{ASSUMPTION_LABELS[key] || key}</label>
                    <input
                      type="number"
                      className="input"
                      value={value}
                      onChange={(e) => setAssumptions((prev) => ({ ...prev, [key]: +e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => runAnalysis(selected.type, selected.label, assumptions)}
                disabled={streamState === 'streaming'}
                className="btn-primary disabled:opacity-50"
              >
                {streamState === 'streaming' ? 'Đang phân tích...' : '🤖 Phân tích AI'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Market Events Tab */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-2">Sự kiện thị trường đáng chú ý</h2>
            <p className="text-xs text-gray-500 mb-4">⚠️ Các kịch bản dưới đây là giả định, không phải dữ liệu thị trường realtime.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {marketEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => runMarketEvent(event)}
                  disabled={streamState === 'streaming'}
                  className={`p-4 rounded-lg border text-left transition disabled:opacity-50 ${
                    false ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{event.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{event.description}</div>
                      <div className="text-xs text-gray-400 mt-1">📂 {event.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Streaming loading + Stop */}
      {streamState === 'streaming' && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-sm text-gray-600">AI đang phân tích tác động đến hồ sơ tài chính của bạn...</span>
            </div>
            <button onClick={stopAnalysis} className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
              ⏹ Dừng
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result (completed or streaming) */}
      {metadata && streamState !== 'idle' && (
        <div className="space-y-6 mt-6">
          {/* Impact level */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Phân tích tác động</h2>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${impactColor(metadata.impactLevel)}`}>
              {impactLabel(metadata.impactLevel)}
            </span>
          </div>

          {/* Before/After metrics */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">So sánh: Trước vs Sau</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-gray-500">Chỉ số</div>
              <div className="font-medium text-gray-500 text-right">Trước</div>
              <div className="font-medium text-gray-500 text-right">Sau</div>
              {[
                { label: 'Thu nhập/tháng', before: metadata.metrics.before.income, after: metadata.metrics.after.income },
                { label: 'Chi phí/tháng', before: metadata.metrics.before.expense, after: metadata.metrics.after.expense },
                { label: 'Tiết kiệm/tháng', before: metadata.metrics.before.saving, after: metadata.metrics.after.saving },
                { label: 'Điểm sức khỏe', before: metadata.metrics.before.health, after: metadata.metrics.after.health },
                { label: 'Thời gian mục tiêu', before: metadata.metrics.before.goalMonths, after: metadata.metrics.after.goalMonths },
              ].map((row) => (
                <div key={row.label} className="contents">
                  <div className="text-gray-700">{row.label}</div>
                  <div className="text-right text-gray-900">{row.before}</div>
                  <div className="text-right text-gray-900">{row.after}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">So sánh trực quan (triệu VND)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Thu nhập" fill="#3b82f6" />
                  <Bar dataKey="Chi phí" fill="#ef4444" />
                  <Bar dataKey="Tiết kiệm" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Analysis text with streaming cursor */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">🤖 Phân tích AI</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {streamContent}
              {streamState === 'streaming' && (
                <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm ml-1"></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
