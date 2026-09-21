import type { FinancialProfile, ScenarioResult } from '../../types';
import { createLLMProvider } from './providers/llm-providers';
import { formatVND, totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';
import { calculateFinancialEngine } from '../financial-engine';
import { enforceGuardrails } from './guardrails';

// ============================================================
// Streaming Scenario Analysis
// Phase 1: Deterministic simulation → metadata event (scorecard + risk)
// Phase 2: LLM streaming → delta events (word-by-word)
// Phase 3: done event
// ============================================================

export type ScenarioStreamEvent =
  | { type: 'thinking'; message: string }
  | { type: 'metadata'; scorecard: { current: ScorecardRow[]; scenario: ScorecardRow[] }; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; scenarioResult: ScenarioResult }
  | { type: 'delta'; content: string }
  | { type: 'done'; analysis: string }
  | { type: 'error'; message: string };

export async function* analyzeScenarioStream(
  profile: FinancialProfile,
  scenarioResult: ScenarioResult,
  customQuestion?: string
): AsyncGenerator<ScenarioStreamEvent, void, void> {
  const baselineEngine = calculateFinancialEngine(profile);
  const scenarioEngine = scenarioResult.engineResult;

  // Phase 1: Deterministic calculations (instant)
  const scorecard = buildScorecard(baselineEngine, scenarioEngine);
  const riskLevel = assessRiskLevel(baselineEngine, scenarioEngine);

  // Send metadata immediately (scorecard + risk level + scenario result)
  yield { type: 'metadata', scorecard, riskLevel, scenarioResult };

  // Phase 2: Build prompt and stream LLM response
  const prompt = buildScenarioPrompt(profile, scenarioResult, baselineEngine, scenarioEngine, customQuestion);
  const provider = createLLMProvider();

  if (provider.name === 'mock') {
    // Mock: yield complete analysis as single delta
    const analysis = buildMockAnalysis(scenarioResult, baselineEngine, scenarioEngine);
    yield { type: 'delta', content: analysis };
    yield { type: 'done', analysis };
    return;
  }

  // Real LLM with streaming
  if (provider.chatStream) {
    let fullAnalysis = '';
    try {
      for await (const chunk of provider.chatStream(
        [
          { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
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
      console.error('[scenario-stream] LLM streaming error:', err);
      if (fullAnalysis) {
        yield { type: 'done', analysis: enforceGuardrails(fullAnalysis) };
      } else {
        yield { type: 'error', message: 'AI gặp lỗi khi phân tích. Vui lòng thử lại.' };
      }
    }
  } else {
    // Fallback: non-streaming
    try {
      const response = await provider.chat(
        [
          { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      );
      const analysis = enforceGuardrails(response.content);
      yield { type: 'delta', content: analysis };
      yield { type: 'done', analysis };
    } catch (err) {
      console.error('[scenario-stream] Non-streaming fallback error:', err);
      yield { type: 'error', message: 'AI gặp lỗi. Vui lòng thử lại.' };
    }
  }
}

// ============================================================
// AI Scenario Analysis
// Financial Engine does calculations → LLM interprets results
// Flow: Profile → Engine simulation → LLM analysis (impact/risk/mitigation/action)
// ============================================================

export interface ScenarioAIAnalysis {
  analysis: string;
  scorecard: {
    current: ScorecardRow[];
    scenario: ScorecardRow[];
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ScorecardRow {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}

export async function analyzeScenarioWithAI(
  profile: FinancialProfile,
  scenarioResult: ScenarioResult,
  customQuestion?: string
): Promise<ScenarioAIAnalysis> {
  const baselineEngine = calculateFinancialEngine(profile);
  const scenarioEngine = scenarioResult.engineResult;

  // Build scorecard from deterministic calculations
  const scorecard = buildScorecard(baselineEngine, scenarioEngine);

  // Determine risk level from calculations
  const riskLevel = assessRiskLevel(baselineEngine, scenarioEngine);

  // Build context prompt for LLM
  const prompt = buildScenarioPrompt(profile, scenarioResult, baselineEngine, scenarioEngine, customQuestion);

  // Call LLM for natural language analysis
  const provider = createLLMProvider();
  let analysis: string;

  if (provider.name === 'mock') {
    analysis = buildMockAnalysis(scenarioResult, baselineEngine, scenarioEngine);
  } else {
    try {
      const response = await provider.chat(
        [
          { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.7 }
      );
      analysis = enforceGuardrails(response.content);
    } catch (err) {
      analysis = buildMockAnalysis(scenarioResult, baselineEngine, scenarioEngine);
    }
  }

  return { analysis, scorecard, riskLevel };
}

const SCENARIO_SYSTEM_PROMPT = `Bạn là AI Financial Coach chuyên phân tích kịch bản tài chính.

NHIỆM VỤ: Phân tích tác động của một kịch bản (scenario) đến hồ sơ tài chính cá nhân của user.

QUY TẮC NGHIÊM NGẶT:
1. KHÔNG tự tính toán. Tất cả số liệu đã được Financial Engine tính sẵn — chỉ diễn giải.
2. KHÔNG bịa dữ liệu. Chỉ sử dụng số liệu được cung cấp.
3. Sử dụng ngôn ngữ thận trọng: "ước tính", "theo giả định", "có thể".
4. Trả lời bằng tiếng Việt.

FORMAT PHẢN HỒI (Markdown):

## Tóm tắt
[1-2 câu tóm tắt kịch bản và tác động chính]

## Điều gì đang xảy ra?
[Giải thích kịch bản và những thay đổi]

## Tác động đến tài chính của bạn
[Phân tích cụ thể dựa trên số liệu before/after — dòng tiền, tài sản ròng, nợ, quỹ dự phòng]

## Rủi ro chính
[2-3 rủi ro cụ thể dựa trên số liệu]

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

function buildScenarioPrompt(
  profile: FinancialProfile,
  scenarioResult: ScenarioResult,
  baseline: any,
  scenario: any,
  customQuestion?: string
): string {
  const income = totalMonthlyIncome(profile);
  const expenses = totalMonthlyExpenses(profile);
  const label = scenarioResult.config.label;

  return `HỒ SƠ TÀI CHÍNH HIỆN TẠI:
- Thu nhập: ${formatVND(income)}/tháng
- Chi phí: ${formatVND(expenses)}/tháng
- Dòng tiền tự do: ${formatVND(baseline.cashFlow.monthlyFreeCashFlow)}/tháng
- Tỷ lệ tiết kiệm: ${baseline.cashFlow.savingRate.toFixed(1)}%
- Tổng tài sản: ${formatVND(baseline.netWorth.totalAssets)}
- Tổng nợ: ${formatVND(baseline.netWorth.totalLiabilities)}
- Tài sản ròng: ${formatVND(baseline.netWorth.netWorth)}
- Tỷ lệ nợ/thu nhập: ${baseline.debtRatio.debtToIncome.toFixed(1)}%
- Quỹ dự phòng: ${baseline.emergencyFund.emergencyFundMonths} tháng
- Điểm sức khỏe tài chính: ${baseline.financialHealth.totalScore}/100
- Tiền mặt: ${formatVND(profile.assets.cash)}
- Tiết kiệm: ${formatVND(profile.assets.savings)}
- Cổ phiếu: ${formatVND(profile.assets.stocks)}
- Bất động sản: ${formatVND(profile.assets.realEstate)}
- Nợ vay: ${formatVND(profile.liabilities.loanBalance)} tại ${profile.liabilities.interestRate}%/năm
- Trả nợ/tháng: ${formatVND(profile.liabilities.monthlyRepayment)}
- Mục tiêu: ${profile.goals.map(g => `${g.goalName} (${formatVND(g.targetAmount)})`).join(', ')}

KỊCH BẢN: ${label}

KẾT QUẢ MÔ PHỎNG (từ Financial Engine):
- Thu nhập sau kịch bản: ${formatVND(scenario.cashFlow.monthlyIncome)}/tháng
- Chi phí sau kịch bản: ${formatVND(scenario.cashFlow.monthlyExpense)}/tháng
- Dòng tiền tự do sau kịch bản: ${formatVND(scenario.cashFlow.monthlyFreeCashFlow)}/tháng
- Tỷ lệ tiết kiệm sau: ${scenario.cashFlow.savingRate.toFixed(1)}%
- Tài sản ròng sau: ${formatVND(scenario.netWorth.netWorth)}
- Tỷ lệ nợ/thu nhập sau: ${scenario.debtRatio.debtToIncome.toFixed(1)}%
- Quỹ dự phòng sau: ${scenario.emergencyFund.emergencyFundMonths} tháng
- Điểm sức khỏe sau: ${scenario.financialHealth.totalScore}/100

THAY ĐỔI (delta):
- Dòng tiền: ${formatVND(scenarioResult.comparison.cashFlowDelta)}
- Tài sản ròng: ${formatVND(scenarioResult.comparison.netWorthDelta)}
- Tỷ lệ tiết kiệm: ${scenarioResult.comparison.savingRateDelta > 0 ? '+' : ''}${scenarioResult.comparison.savingRateDelta.toFixed(1)}%
- Điểm sức khỏe: ${scenarioResult.comparison.healthScoreDelta > 0 ? '+' : ''}${scenarioResult.comparison.healthScoreDelta}
- Thời gian mục tiêu: ${scenarioResult.comparison.goalDateDelta > 0 ? '+' : ''}${scenarioResult.comparison.goalDateDelta} tháng

${customQuestion ? `CÂU HỎI RIÊNG CỦA USER: ${customQuestion}` : ''}

Hãy phân tích kịch bản này theo format đã cho. Sử dụng số liệu thực từ Financial Engine.`;
}

function buildScorecard(baseline: any, scenario: any): { current: ScorecardRow[]; scenario: ScorecardRow[] } {
  const fmt = (n: number) => formatVND(n);
  const current: ScorecardRow[] = [
    { label: 'Thu nhập/tháng', value: fmt(baseline.cashFlow.monthlyIncome) },
    { label: 'Chi phí/tháng', value: fmt(baseline.cashFlow.monthlyExpense) },
    { label: 'Dòng tiền tự do', value: fmt(baseline.cashFlow.monthlyFreeCashFlow) },
    { label: 'Tỷ lệ tiết kiệm', value: `${baseline.cashFlow.savingRate.toFixed(1)}%` },
    { label: 'Tài sản ròng', value: fmt(baseline.netWorth.netWorth) },
    { label: 'Tỷ lệ nợ/thu nhập', value: `${baseline.debtRatio.debtToIncome.toFixed(1)}%` },
    { label: 'Quỹ dự phòng', value: `${baseline.emergencyFund.emergencyFundMonths} tháng` },
    { label: 'Điểm sức khỏe', value: `${baseline.financialHealth.totalScore}/100` },
  ];
  const scenarioRows: ScorecardRow[] = [
    { label: 'Thu nhập/tháng', value: fmt(scenario.cashFlow.monthlyIncome), delta: fmt(scenario.cashFlow.monthlyIncome - baseline.cashFlow.monthlyIncome), deltaPositive: scenario.cashFlow.monthlyIncome >= baseline.cashFlow.monthlyIncome },
    { label: 'Chi phí/tháng', value: fmt(scenario.cashFlow.monthlyExpense), delta: fmt(scenario.cashFlow.monthlyExpense - baseline.cashFlow.monthlyExpense), deltaPositive: scenario.cashFlow.monthlyExpense <= baseline.cashFlow.monthlyExpense },
    { label: 'Dòng tiền tự do', value: fmt(scenario.cashFlow.monthlyFreeCashFlow), delta: fmt(scenario.cashFlow.monthlyFreeCashFlow - baseline.cashFlow.monthlyFreeCashFlow), deltaPositive: scenario.cashFlow.monthlyFreeCashFlow >= baseline.cashFlow.monthlyFreeCashFlow },
    { label: 'Tỷ lệ tiết kiệm', value: `${scenario.cashFlow.savingRate.toFixed(1)}%`, delta: `${(scenario.cashFlow.savingRate - baseline.cashFlow.savingRate).toFixed(1)}%`, deltaPositive: scenario.cashFlow.savingRate >= baseline.cashFlow.savingRate },
    { label: 'Tài sản ròng', value: fmt(scenario.netWorth.netWorth), delta: fmt(scenario.netWorth.netWorth - baseline.netWorth.netWorth), deltaPositive: scenario.netWorth.netWorth >= baseline.netWorth.netWorth },
    { label: 'Tỷ lệ nợ/thu nhập', value: `${scenario.debtRatio.debtToIncome.toFixed(1)}%`, delta: `${(scenario.debtRatio.debtToIncome - baseline.debtRatio.debtToIncome).toFixed(1)}%`, deltaPositive: scenario.debtRatio.debtToIncome <= baseline.debtRatio.debtToIncome },
    { label: 'Quỹ dự phòng', value: `${scenario.emergencyFund.emergencyFundMonths} tháng`, delta: `${scenario.emergencyFund.emergencyFundMonths - baseline.emergencyFund.emergencyFundMonths} tháng`, deltaPositive: scenario.emergencyFund.emergencyFundMonths >= baseline.emergencyFund.emergencyFundMonths },
    { label: 'Điểm sức khỏe', value: `${scenario.financialHealth.totalScore}/100`, delta: `${scenario.financialHealth.totalScore - baseline.financialHealth.totalScore}`, deltaPositive: scenario.financialHealth.totalScore >= baseline.financialHealth.totalScore },
  ];
  return { current, scenario: scenarioRows };
}

function assessRiskLevel(baseline: any, scenario: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const healthDelta = scenario.financialHealth.totalScore - baseline.financialHealth.totalScore;
  const cashFlowDelta = scenario.cashFlow.monthlyFreeCashFlow - baseline.cashFlow.monthlyFreeCashFlow;
  const cashFlowPercentChange = baseline.cashFlow.monthlyFreeCashFlow > 0 ? (cashFlowDelta / baseline.cashFlow.monthlyFreeCashFlow) * 100 : 0;

  if (scenario.cashFlow.monthlyFreeCashFlow < 0 || healthDelta <= -20 || cashFlowPercentChange <= -50) return 'CRITICAL';
  if (healthDelta <= -10 || cashFlowPercentChange <= -25) return 'HIGH';
  if (healthDelta <= -5 || cashFlowPercentChange <= -10) return 'MEDIUM';
  return 'LOW';
}

function buildMockAnalysis(scenarioResult: ScenarioResult, baseline: any, scenario: any): string {
  const comp = scenarioResult.comparison;
  const cashFlowDelta = formatVND(comp.cashFlowDelta);
  const healthDelta = comp.healthScoreDelta;

  return `## Tóm tắt
Kịch bản "${scenarioResult.config.label}" làm thay đổi dòng tiền tự do ${cashFlowDelta}/tháng và điểm sức khỏe tài chính ${healthDelta > 0 ? '+' : ''}${healthDelta} điểm.

## Điều gì đang xảy ra?
Kịch bản ${scenarioResult.config.label} được mô phỏng dựa trên hồ sơ tài chính hiện tại của bạn.

## Tác động đến tài chính của bạn
- Dòng tiền tự do: ${formatVND(baseline.cashFlow.monthlyFreeCashFlow)} → ${formatVND(scenario.cashFlow.monthlyFreeCashFlow)} (${cashFlowDelta})
- Tài sản ròng: ${formatVND(baseline.netWorth.netWorth)} → ${formatVND(scenario.netWorth.netWorth)}
- Điểm sức khỏe: ${baseline.financialHealth.totalScore}/100 → ${scenario.financialHealth.totalScore}/100

## Rủi ro chính
${comp.cashFlowDelta < 0 ? '1. Dòng tiền giảm, ảnh hưởng khả năng tích lũy.\n2. Mục tiêu tài chính có thể chậm tiến độ.\n3. Cần điều chỉnh chi phí hoặc thu nhập.' : '1. Tác động tích cực đến dòng tiền.\n2. Có thể tăng tốc độ đạt mục tiêu.'}

## Phương án giảm thiểu
1. Điều chỉnh chi phí không cần thiết.
2. Tìm nguồn thu nhập bổ sung.
3. Điều chỉnh thời gian mục tiêu.

## Hành động đề xuất

### 7 ngày
Rà soát chi phí hàng tháng và xác định khoản có thể cắt giảm.

### 30 ngày
Điều chỉnh ngân sách và theo dõi dòng tiền thực tế.

### 90 ngày
Đánh giá lại toàn bộ kế hoạch tài chính và điều chỉnh mục tiêu.

## Dữ liệu còn thiếu
Không`;
}
