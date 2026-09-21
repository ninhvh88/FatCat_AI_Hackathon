import { useState, useEffect, useRef } from 'react';
import { scenariosApi } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DEMO_USER_ID = 'demo-user-minhanh';

interface ScenarioGroup {
  category: string;
  icon: string;
  scenarios: { type: string; label: string; params: Record<string, number> }[];
}

interface ScorecardRow {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}

interface AIAnalysis {
  analysis: string;
  scorecard: { current: ScorecardRow[]; scenario: ScorecardRow[] };
  riskLevel: string;
}

function riskColor(level: string): string {
  switch (level) {
    case 'LOW': return 'text-green-600 bg-green-100';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
    case 'HIGH': return 'text-orange-600 bg-orange-100';
    case 'CRITICAL': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function riskLabel(level: string): string {
  switch (level) {
    case 'LOW': return 'Thấp';
    case 'MEDIUM': return 'Trung bình';
    case 'HIGH': return 'Cao';
    case 'CRITICAL': return 'Nghiêm trọng';
    default: return level;
  }
}

export default function Scenarios() {
  const userId = localStorage.getItem('userId') || DEMO_USER_ID;
  const [groups, setGroups] = useState<ScenarioGroup[]>([]);
  const [baseline, setBaseline] = useState<any>(null);
  const [selected, setSelected] = useState<{ type: string; label: string; params: Record<string, number> } | null>(null);
  const [streamState, setStreamState] = useState<'idle' | 'streaming' | 'completed' | 'error'>('idle');
  const [streamContent, setStreamContent] = useState('');
  const [metadata, setMetadata] = useState<{ scorecard: { current: ScorecardRow[]; scenario: ScorecardRow[] }; riskLevel: string; scenarioResult: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scenariosApi.getGrouped().then(setGroups).catch(() => {});
    scenariosApi.getBaseline(userId).then(setBaseline).catch(() => {});
    return () => { abortRef.current?.abort(); };
  }, [userId]);

  const stopAnalysis = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamState('idle');
  };

  const runAnalysis = async (scenario: { type: string; label: string; params: Record<string, number> }, customQ?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreamState('streaming');
    setError(null);
    setStreamContent('');
    setMetadata(null);
    setSelected(scenario);

    let receivedDone = false;
    try {
      for await (const event of scenariosApi.aiAnalyzeStream(
        { userId, type: scenario.type, label: scenario.label, params: scenario.params, customQuestion: customQ },
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

  const runCustom = async () => {
    if (!customText.trim()) return;
    // Parse custom scenario — use CUSTOM type with income/expense deltas
    const lower = customText.toLowerCase();
    const params: Record<string, number> = {};
    let label = customText.substring(0, 60);

    // Simple parsing for common patterns
    if (lower.includes('giảm') && lower.includes('thu nhập')) {
      const match = customText.match(/(\d+)\s*(triệu|tr|m)/i);
      if (match) { params.incomeDelta = -parseInt(match[1]) * 1000000; }
      else { params.incomeDelta = -5000000; }
      label = 'Giảm thu nhập (tùy chỉnh)';
    } else if (lower.includes('tăng') && lower.includes('chi')) {
      const match = customText.match(/(\d+)\s*(triệu|tr|m)/i);
      if (match) { params.expenseDelta = parseInt(match[1]) * 1000000; }
      else { params.expenseDelta = 5000000; }
      label = 'Tăng chi phí (tùy chỉnh)';
    } else if (lower.includes('vay') || lower.includes('nợ')) {
      const match = customText.match(/(\d+)\s*(tỷ|triệu|tr|b)/i);
      if (match) {
        const val = lower.includes('tỷ') || lower.includes('b') ? parseInt(match[1]) * 1000000000 : parseInt(match[1]) * 1000000;
        params.additionalDebt = val;
      }
      label = 'Phát sinh nợ (tùy chỉnh)';
    } else if (lower.includes('cổ phiếu') || lower.includes('chứng khoán')) {
      const match = customText.match(/(\d+)/);
      if (match) { params.stockChangePercent = lower.includes('giảm') ? -parseInt(match[1]) : parseInt(match[1]); }
      label = 'Thay đổi cổ phiếu (tùy chỉnh)';
    }

    await runAnalysis({ type: 'CUSTOM', label, params }, customText);
    setShowCustom(false);
    setCustomText('');
  };

  const chartData = metadata ? [
    {
      name: 'Hiện tại',
      'Dòng tiền': Math.round((baseline?.baseline?.cashFlow?.monthlyFreeCashFlow || 0) / 1000000),
      'Tài sản ròng': Math.round((baseline?.baseline?.netWorth?.netWorth || 0) / 1000000),
    },
    {
      name: metadata.scenarioResult.config.label.substring(0, 15),
      'Dòng tiền': Math.round((metadata.scenarioResult.engineResult.cashFlow?.monthlyFreeCashFlow || 0) / 1000000),
      'Tài sản ròng': Math.round((metadata.scenarioResult.engineResult.netWorth?.netWorth || 0) / 1000000),
    },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Kịch bản Tài chính</h1>
      <p className="text-gray-500 mb-6">Mô phỏng "what-if" với AI phân tích tác động đến hồ sơ của bạn</p>

      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {/* Baseline summary */}
      {baseline && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Tình hình hiện tại</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Dòng tiền tự do:</span> <span className="font-medium">{Math.round((baseline.baseline?.cashFlow?.monthlyFreeCashFlow || 0) / 1000000)}tr/tháng</span></div>
            <div><span className="text-gray-500">Tỷ lệ tiết kiệm:</span> <span className="font-medium">{baseline.baseline?.cashFlow?.savingRate?.toFixed(1)}%</span></div>
            <div><span className="text-gray-500">Tài sản ròng:</span> <span className="font-medium">{Math.round((baseline.baseline?.netWorth?.netWorth || 0) / 1000000000)} tỷ</span></div>
            <div><span className="text-gray-500">Sức khỏe:</span> <span className="font-medium">{baseline.baseline?.financialHealth?.totalScore}/100</span></div>
          </div>
        </div>
      )}

      {/* Scenario templates grouped by category */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Kịch bản phổ biến</h2>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{group.icon} {group.category}</h3>
              <div className="flex flex-wrap gap-2">
                {group.scenarios.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => runAnalysis(s)}
                    disabled={streamState === 'streaming'}
                    className={`text-sm px-3 py-2 rounded-lg border transition ${
                      selected?.label === s.label
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                    } ${streamState === 'streaming' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom scenario */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {!showCustom ? (
            <button onClick={() => setShowCustom(true)} className="btn-primary text-sm px-4 py-2">
              + Tạo kịch bản riêng
            </button>
          ) : (
            <div className="space-y-3">
              <label className="label">Mô tả kịch bản của bạn</label>
              <textarea
                className="input w-full"
                rows={2}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ví dụ: Nếu tôi giảm 5 triệu thu nhập mỗi tháng thì sao?"
              />
              <div className="flex gap-2">
                <button onClick={runCustom} disabled={streamState === 'streaming' || !customText.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {streamState === 'streaming' ? 'Đang phân tích...' : 'Phân tích'}
                </button>
                <button onClick={() => setShowCustom(false)} className="text-sm px-4 py-24 text-gray-500">Hủy</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streaming loading + Stop button */}
      {streamState === 'streaming' && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-sm text-gray-600">AI đang phân tích Financial Profile và mô phỏng kịch bản...</span>
            </div>
            <button onClick={stopAnalysis} className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
              ⏹ Dừng
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result */}
      {metadata && streamState !== 'streaming' && streamState !== 'idle' && (
        <div className="space-y-6">
          {/* Risk level badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Phân tích: {metadata.scenarioResult.config.label}</h2>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${riskColor(metadata.riskLevel)}`}>
              Rủi ro: {riskLabel(metadata.riskLevel)}
            </span>
          </div>

          {/* Scorecard */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">So sánh: Hiện tại vs Kịch bản</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-gray-500">Chỉ số</div>
              <div className="font-medium text-gray-500 text-right">Hiện tại</div>
              <div className="font-medium text-gray-500 text-right">Kịch bản</div>
              {metadata.scorecard.current.map((row, i) => {
                const sc = metadata.scorecard.scenario[i];
                return (
                  <div key={row.label} className="contents">
                    <div className="text-gray-700">{row.label}</div>
                    <div className="text-right text-gray-900">{row.value}</div>
                    <div className="text-right">
                      <span className="text-gray-900">{sc.value}</span>
                      {sc.delta && (
                        <span className={`ml-2 text-xs ${sc.deltaPositive ? 'text-green-600' : 'text-red-600'}`}>
                          ({sc.delta})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  <Bar dataKey="Dòng tiền" fill="#3b82f6" />
                  <Bar dataKey="Tài sản ròng" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Analysis text */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">🤖 Phân tích AI</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {streamContent}
            </div>
          </div>
        </div>
      )}

      {/* Streaming content (shown during streaming, after metadata) */}
      {metadata && streamState === 'streaming' && (
        <div className="space-y-6">
          {/* Risk level badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Phân tích: {metadata.scenarioResult.config.label}</h2>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${riskColor(metadata.riskLevel)}`}>
              Rủi ro: {riskLabel(metadata.riskLevel)}
            </span>
          </div>

          {/* Scorecard (shown immediately from metadata) */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">So sánh: Hiện tại vs Kịch bản</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-gray-500">Chỉ số</div>
              <div className="font-medium text-gray-500 text-right">Hiện tại</div>
              <div className="font-medium text-gray-500 text-right">Kịch bản</div>
              {metadata.scorecard.current.map((row, i) => {
                const sc = metadata.scorecard.scenario[i];
                return (
                  <div key={row.label} className="contents">
                    <div className="text-gray-700">{row.label}</div>
                    <div className="text-right text-gray-900">{row.value}</div>
                    <div className="text-right">
                      <span className="text-gray-900">{sc.value}</span>
                      {sc.delta && (
                        <span className={`ml-2 text-xs ${sc.deltaPositive ? 'text-green-600' : 'text-red-600'}`}>
                          ({sc.delta})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  <Bar dataKey="Dòng tiền" fill="#3b82f6" />
                  <Bar dataKey="Tài sản ròng" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Streaming AI text with cursor */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">🤖 Phân tích AI</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {streamContent}
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm ml-1"></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
