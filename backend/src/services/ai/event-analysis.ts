import type { FinancialProfile, LifeEventImpact } from '../../types';
import { createLLMProvider } from './providers/llm-providers';
import { formatVND, totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';
import { calculateFinancialEngine } from '../financial-engine';
import { enforceGuardrails } from './guardrails';

// ============================================================
// Streaming Event Analysis
// Phase 1: Deterministic simulation → metadata event (metrics + impact)
// Phase 2: LLM streaming → delta events (word-by-word)
// Phase 3: done event
// ============================================================

export type EventStreamEvent =
  | { type: 'thinking'; message: string }
  | { type: 'metadata'; metrics: EventAIAnalysis['metrics']; impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; eventImpact: LifeEventImpact }
  | { type: 'delta'; content: string }
  | { type: 'done'; analysis: string }
  | { type: 'error'; message: string };

export async function* analyzeEventStream(
  profile: FinancialProfile,
  eventImpact: LifeEventImpact,
  eventType: string,
  eventLabel: string,
  customQuestion?: string
): AsyncGenerator<EventStreamEvent, void, void> {
  const baselineEngine = calculateFinancialEngine(profile);

  // Phase 1: Deterministic calculations (instant)
  const metrics = buildEventMetrics(eventImpact);
  const impactLevel = assessEventImpactLevel(eventImpact);

  // Send metadata immediately
  yield { type: 'metadata', metrics, impactLevel, eventImpact };

  // Phase 2: Build prompt and stream LLM response
  const prompt = buildEventPrompt(profile, eventImpact, eventType, eventLabel, baselineEngine, customQuestion);
  const provider = createLLMProvider();

  if (provider.name === 'mock') {
    const analysis = buildMockEventAnalysis(eventImpact, eventLabel);
    yield { type: 'delta', content: analysis };
    yield { type: 'done', analysis };
    return;
  }

  if (provider.chatStream) {
    let fullAnalysis = '';
    try {
      for await (const chunk of provider.chatStream(
        [
          { role: 'system', content: EVENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      )) {
        if (chunk.content) {
          fullAnalysis += chunk.content;
          yield { type: 'delta', content: chunk.content };
        }
      }
      fullAnalysis = enforceGuardrails(fullAnalysis);
      yield { type: 'done', analysis: fullAnalysis };
    } catch (err) {
      if (fullAnalysis) {
        yield { type: 'done', analysis: enforceGuardrails(fullAnalysis) };
      } else {
        yield { type: 'error', message: 'AI gặp lỗi khi phân tích. Vui lòng thử lại.' };
      }
    }
  } else {
    try {
      const response = await provider.chat(
        [
          { role: 'system', content: EVENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      );
      const analysis = enforceGuardrails(response.content);
      yield { type: 'delta', content: analysis };
      yield { type: 'done', analysis };
    } catch {
      yield { type: 'error', message: 'AI gặp lỗi. Vui lòng thử lại.' };
    }
  }
}

// ============================================================
// AI Event Analysis
// Event → Financial Engine simulation → LLM personalized impact
// ============================================================

export interface EventAIAnalysis {
  analysis: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metrics: {
    before: { income: string; expense: string; saving: string; health: string; goalMonths: string };
    after: { income: string; expense: string; saving: string; health: string; goalMonths: string };
    deltas: { saving: string; health: string; goalMonths: string };
  };
}

// Market event templates (not real-time data — clearly labeled)
export interface MarketEventTemplate {
  id: string;
  title: string;
  category: string;
  icon: string;
  description: string;
  assumptions: Record<string, number>;
  scenarioType: string;
  dataSource: string;
}

export function getMarketEventTemplates(): MarketEventTemplate[] {
  return [
    {
      id: 'interest-rate-up',
      title: 'Lãi suất cho vay tăng 2%',
      category: 'Lãi suất',
      icon: '📈',
      description: 'Ngân hàng tăng lãi suất cho vay 2%/năm',
      assumptions: { percent: 2 },
      scenarioType: 'LOAN_INTEREST_INCREASE',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'interest-rate-down',
      title: 'Lãi suất giảm 1%',
      category: 'Lãi suất',
      icon: '📉',
      description: 'Ngân hàng giảm lãi suất 1%/năm',
      assumptions: { percent: -1 },
      scenarioType: 'LOAN_INTEREST_INCREASE',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'stock-crash-20',
      title: 'Thị trường chứng khoán giảm 20%',
      category: 'Đầu tư',
      icon: '📊',
      description: 'VN-Index giảm 20%, ảnh hưởng danh mục cổ phiếu',
      assumptions: { stockChangePercent: -20 },
      scenarioType: 'CUSTOM',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'stock-crash-30',
      title: 'Thị trường chứng khoán giảm 30%',
      category: 'Đầu tư',
      icon: '📉',
      description: 'VN-Index giảm 30%, khủng hoảng thị trường',
      assumptions: { stockChangePercent: -30 },
      scenarioType: 'CUSTOM',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'inflation-up',
      title: 'Lạm phát tăng 3%',
      category: 'Kinh tế vĩ mô',
      icon: '🔥',
      description: 'Lạm phát tăng 3%, chi phí sinh hoạt tăng',
      assumptions: { amount: 3000000 },
      scenarioType: 'EXPENSE_INCREASE',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'income-loss',
      title: 'Mất việc / Giảm thu nhập',
      category: 'Thu nhập',
      icon: '⚠️',
      description: 'Mất nguồn thu nhập chính trong 6 tháng',
      assumptions: { lossDurationMonths: 6, incomeLossPercent: 100 },
      scenarioType: 'CUSTOM',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'income-increase-20',
      title: 'Thu nhập tăng 20%',
      category: 'Thu nhập',
      icon: '💰',
      description: 'Tăng lương hoặc có thêm nguồn thu nhập 20%',
      assumptions: { percent: 20 },
      scenarioType: 'INCOME_INCREASE',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
    {
      id: 'expense-spike',
      title: 'Chi phí y tế bất thường',
      category: 'Chi phí',
      icon: '🏥',
      description: 'Phát sinh chi phí y tế 50 triệu',
      assumptions: { amount: 50000000 },
      scenarioType: 'EXPENSE_INCREASE',
      dataSource: 'Giả định kịch bản — không phải dữ liệu realtime',
    },
  ];
}

export async function analyzeEventWithAI(
  profile: FinancialProfile,
  eventImpact: LifeEventImpact,
  eventType: string,
  eventLabel: string,
  customQuestion?: string
): Promise<EventAIAnalysis> {
  const baselineEngine = calculateFinancialEngine(profile);

  // Build metrics from deterministic calculations
  const metrics = buildEventMetrics(eventImpact);

  // Determine impact level
  const impactLevel = assessEventImpactLevel(eventImpact);

  // Build context prompt for LLM
  const prompt = buildEventPrompt(profile, eventImpact, eventType, eventLabel, baselineEngine, customQuestion);

  // Call LLM
  const provider = createLLMProvider();
  let analysis: string;

  if (provider.name === 'mock') {
    analysis = buildMockEventAnalysis(eventImpact, eventLabel);
  } else {
    try {
      const response = await provider.chat(
        [
          { role: 'system', content: EVENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      );
      analysis = enforceGuardrails(response.content);
    } catch (err) {
      analysis = buildMockEventAnalysis(eventImpact, eventLabel);
    }
  }

  return { analysis, impactLevel, metrics };
}

const EVENT_SYSTEM_PROMPT = `Bạn là AI Financial Coach chuyên phân tích tác động sự kiện tài chính đến cá nhân.

NHIỆM VỤ: Phân tích một sự kiện tài chính/thị trường và tác động cụ thể đến hồ sơ của user.

QUY TẮC NGHIÊM NGẶT:
1. KHÔNG tự tính toán. Số liệu đã được Financial Engine tính sẵn.
2. KHÔNG bịa dữ liệu thị trường. Nếu không có dữ liệu realtime, ghi rõ.
3. Sử dụng ngôn ngữ thận trọng.
4. Trả lời bằng tiếng Việt.

FORMAT PHẢN HỒI (Markdown):

## Sự kiện
[Mô tả ngắn gọn sự kiện]

## Tại sao quan trọng?
[Phân tích cơ chế tác động đến tài chính cá nhân]

## Tác động đến tài chính của bạn
[Phân tích cụ thể dựa trên số liệu before/after của user — thu nhập, chi phí, tiết kiệm, sức khỏe tài chính]

## Mức độ ảnh hưởng
[Low/Medium/High/Critical + giải thích dựa trên số liệu]

## Những chỉ số cần theo dõi
[Các chỉ số cụ thể user nên theo dõi]

## Phương án giảm thiểu
1. [phương án 1]
2. [phương án 2]
3. [phương án 3]

## Hành động đề xuất

### 7 ngày
[hành động ngắn hạn]

### 30 ngày
[hành động trung hạn]

### 90 ngày
[hành động dài hạn]

## Dữ liệu còn thiếu
[nếu có — hoặc "Không" nếu đủ dữ liệu]`;

function buildEventPrompt(
  profile: FinancialProfile,
  eventImpact: LifeEventImpact,
  eventType: string,
  eventLabel: string,
  baseline: any,
  customQuestion?: string
): string {
  const b = eventImpact.before;
  const a = eventImpact.after;
  const d = eventImpact.deltas;

  return `HỒ SƠ TÀI CHÍNH HIỆN TẠI:
- Thu nhập: ${formatVND(totalMonthlyIncome(profile))}/tháng
- Chi phí: ${formatVND(totalMonthlyExpenses(profile))}/tháng
- Dòng tiền tự do: ${formatVND(baseline.cashFlow.monthlyFreeCashFlow)}/tháng
- Tài sản ròng: ${formatVND(baseline.netWorth.netWorth)}
- Nợ: ${formatVND(profile.liabilities.loanBalance)} tại ${profile.liabilities.interestRate}%/năm
- Cổ phiếu: ${formatVND(profile.assets.stocks)}
- Tiền mặt + tiết kiệm: ${formatVND(profile.assets.cash + profile.assets.savings)}
- Điểm sức khỏe: ${baseline.financialHealth.totalScore}/100
- Mục tiêu: ${profile.goals.map(g => `${g.goalName} (${formatVND(g.targetAmount)})`).join(', ')}

SỰ KIỆN: ${eventLabel} (loại: ${eventType})

KẾT QUẢ MÔ PHỎNG (từ Financial Engine):
TRƯỚC:
- Thu nhập: ${formatVND(b.monthlyIncome)}/tháng
- Chi phí: ${formatVND(b.monthlyExpense)}/tháng
- Tiết kiệm: ${formatVND(b.monthlySaving)}/tháng
- Điểm sức khỏe: ${b.healthScore}/100
- Thời gian mục tiêu: ${b.goalTimelineMonths} tháng

SAU:
- Thu nhập: ${formatVND(a.monthlyIncome)}/tháng
- Chi phí: ${formatVND(a.monthlyExpense)}/tháng
- Tiết kiệm: ${formatVND(a.monthlySaving)}/tháng
- Điểm sức khỏe: ${a.healthScore}/100
- Thời gian mục tiêu: ${a.goalTimelineMonths} tháng

THAY ĐỔI:
- Tiết kiệm: ${d.monthlySavingDelta >= 0 ? '+' : ''}${formatVND(d.monthlySavingDelta)}/tháng
- Sức khỏe: ${d.healthScoreDelta >= 0 ? '+' : ''}${d.healthScoreDelta} điểm
- Thời gian mục tiêu: ${d.goalTimelineDeltaMonths >= 0 ? '+' : ''}${d.goalTimelineDeltaMonths} tháng

${customQuestion ? `CÂU HỎI RIÊNG: ${customQuestion}` : ''}

Hãy phân tích sự kiện này theo format đã cho. Tập trung vào tác động CÁ NHÂN đến user, không phải tin tức chung.`;
}

function buildEventMetrics(eventImpact: LifeEventImpact): EventAIAnalysis['metrics'] {
  const b = eventImpact.before;
  const a = eventImpact.after;
  const d = eventImpact.deltas;
  return {
    before: {
      income: formatVND(b.monthlyIncome),
      expense: formatVND(b.monthlyExpense),
      saving: formatVND(b.monthlySaving),
      health: `${b.healthScore}/100`,
      goalMonths: `${b.goalTimelineMonths} tháng`,
    },
    after: {
      income: formatVND(a.monthlyIncome),
      expense: formatVND(a.monthlyExpense),
      saving: formatVND(a.monthlySaving),
      health: `${a.healthScore}/100`,
      goalMonths: `${a.goalTimelineMonths} tháng`,
    },
    deltas: {
      saving: `${d.monthlySavingDelta >= 0 ? '+' : ''}${formatVND(d.monthlySavingDelta)}`,
      health: `${d.healthScoreDelta >= 0 ? '+' : ''}${d.healthScoreDelta}`,
      goalMonths: `${d.goalTimelineDeltaMonths >= 0 ? '+' : ''}${d.goalTimelineDeltaMonths}`,
    },
  };
}

function assessEventImpactLevel(eventImpact: LifeEventImpact): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const d = eventImpact.deltas;
  if (eventImpact.after.monthlySaving < 0 || d.healthScoreDelta <= -20) return 'CRITICAL';
  if (d.healthScoreDelta <= -10 || d.monthlySavingDelta < -5000000) return 'HIGH';
  if (d.healthScoreDelta <= -5 || d.monthlySavingDelta < -1000000) return 'MEDIUM';
  return 'LOW';
}

function buildMockEventAnalysis(eventImpact: LifeEventImpact, label: string): string {
  const b = eventImpact.before;
  const a = eventImpact.after;
  const d = eventImpact.deltas;

  return `## Sự kiện
${label}

## Tại sao quan trọng?
Sự kiện này ảnh hưởng trực tiếp đến dòng tiền và khả năng đạt mục tiêu tài chính của bạn.

## Tác động đến tài chính của bạn
- Thu nhập: ${formatVND(b.monthlyIncome)} → ${formatVND(a.monthlyIncome)}
- Chi phí: ${formatVND(b.monthlyExpense)} → ${formatVND(a.monthlyExpense)}
- Tiết kiệm: ${formatVND(b.monthlySaving)} → ${formatVND(a.monthlySaving)}
- Điểm sức khỏe: ${b.healthScore}/100 → ${a.healthScore}/100

## Mức độ ảnh hưởng
${d.healthScoreDelta <= -10 ? 'High' : d.healthScoreDelta <= -5 ? 'Medium' : 'Low'} — Điểm sức khỏe thay đổi ${d.healthScoreDelta} điểm.

## Những chỉ số cần theo dõi
- Dòng tiền hàng tháng
- Tỷ lệ tiết kiệm
- Thời gian đạt mục tiêu

## Phương án giảm thiểu
1. Điều chỉnh chi phí.
2. Tìm thu nhập bổ sung.
3. Điều chỉnh mục tiêu.

## Hành động đề xuất

### 7 ngày
Rà soát chi phí.

### 30 ngày
Điều chỉnh ngân sách.

### 90 ngày
Đánh giá lại kế hoạch.

## Dữ liệu còn thiếu
Không`;
}
