import type {
  FinancialProfile,
  ChatMessage,
  ChatResponse,
  ToolCallRecord,
  LLMMessage,
  ActionPlan,
  ChatStreamEvent,
} from '../../types';
import { createLLMProvider } from './providers/llm-providers';
import { GreenNodeLLMProvider } from './providers/greennode-provider';
import { createFinancialTools, toolDefinitions } from './tools/financial-tools';
import { calculateFinancialEngine } from '../financial-engine';
import { generateInsights } from '../insight.service';
import { generateActionPlan } from '../action-plan.service';
import { buildSystemPrompt, sanitizeUserInput, enforceGuardrails } from './guardrails';
import { formatVND, totalMonthlyIncome, totalMonthlyExpenses } from '../../utils/demo-data';
import { searchKnowledge } from '../rag/knowledge-service';
import { classifyIntent, intentToAgent, getToolsForAgent, type FinancialIntent } from './intent-classifier';

// ============================================================
// AI Orchestrator
// Flow: User → Intent Detection → Tool Selection →
//       Financial Tools → LLM → Response
// ============================================================

export async function processChat(
  profile: FinancialProfile,
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const startTime = Date.now();
  const sanitizedMessage = sanitizeUserInput(message);

  // Create LLM provider
  const provider = createLLMProvider();

  // ============================================================
  // GreenNode Agent Provider — delegate entirely to the AI agent
  // The agent has: Financial Engine, tool calling, intent routing,
  // guardrails, RAG, action plan. We just pass through the request
  // and apply guardrails locally (defense in depth).
  // ============================================================
  if (provider.name === 'greennode') {
    const greennodeProvider = provider as GreenNodeLLMProvider;

    // Build messages for the provider (it extracts the user message)
    const engine = calculateFinancialEngine(profile);
    const profileSummary = buildProfileSummary(profile, engine);
    const systemPrompt = buildSystemPrompt(profileSummary);
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: sanitizedMessage },
    ];

    try {
      // Call the GreenNode agent
      await provider.chat(llmMessages);

      // Get the full agent response (with tool calls + action plan)
      const agentResponse = greennodeProvider.getLastAgentResponse();

      if (agentResponse) {
        const latencyMs = Date.now() - startTime;
        console.log(JSON.stringify({
          event: 'ai.chat.complete',
          latencyMs,
          toolCalls: agentResponse.toolCalls?.length ?? 0,
          provider: 'greennode',
          intent: 'DELEGATED',
          agent: 'greennode',
          toolsExecuted: (agentResponse.toolCalls ?? []).map((t) => t.toolName),
        }));

        return {
          message: enforceGuardrails(agentResponse.message),
          toolCalls: agentResponse.toolCalls ?? [],
          sessionId: agentResponse.sessionId ?? `session-${Date.now()}`,
          actionPlan: agentResponse.actionPlan,
        };
      }

      // Fallback if agent response is null (shouldn't happen)
      return {
        message: 'Xin lỗi, AI Agent không phản hồi. Vui lòng thử lại.',
        toolCalls: [],
        sessionId: `session-${Date.now()}`,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.log(JSON.stringify({
        event: 'ai.chat.failed',
        latencyMs,
        provider: 'greennode',
        error: (err as Error).message,
      }));

      const errorMsg = (err as Error).message;
      let userMessage: string;
      if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
        userMessage = 'AI Agent đang phản hồi chậm. Vui lòng thử lại sau.';
      } else if (errorMsg.includes('fetch') || errorMsg.includes('connect')) {
        userMessage = 'Không thể kết nối tới AI Agent. Vui lòng kiểm tra kết nối và thử lại.';
      } else {
        userMessage = 'AI Agent gặp lỗi. Vui lòng thử lại.';
      }

      return {
        message: userMessage,
        toolCalls: [],
        sessionId: `session-${Date.now()}`,
      };
    }
  }

  // ============================================================
  // Local providers (mock / openai / compatible)
  // Original orchestrator flow with local Financial Engine
  // ============================================================

  // Phase 0: Intent classification (Supervisor)
  const intentResult = classifyIntent(sanitizedMessage);
  const agentType = intentToAgent(intentResult.intent);
  const relevantTools = getToolsForAgent(agentType);

  console.log(JSON.stringify({
    event: 'ai.intent',
    intent: intentResult.intent,
    agent: agentType,
    confidence: intentResult.confidence,
    keywords: intentResult.keywords,
    toolsSelected: relevantTools,
  }));

  // Create financial tools context
  const toolContext = { profile };
  const tools = createFinancialTools(toolContext);

  // Build profile summary for system prompt
  const engine = calculateFinancialEngine(profile);
  const profileSummary = buildProfileSummary(profile, engine);

  // Build messages
  const systemPrompt = buildSystemPrompt(profileSummary);
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: sanitizedMessage },
  ];

  // Phase 1: Call LLM with tools (filtered by intent)
  const filteredToolDefs = toolDefinitions.filter((td) =>
    relevantTools.includes(td.function.name) ||
    td.function.name === 'getFinancialProfile' ||
    td.function.name === 'getFinancialInsights'
  );
  const llmResponse = await provider.chat(llmMessages, {
    tools: filteredToolDefs,
    temperature: 0.7,
  });

  // Phase 2: Execute tool calls
  const toolCallRecords: ToolCallRecord[] = [];

  if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
    for (const tc of llmResponse.toolCalls) {
      const tool = tools.get(tc.name);
      if (tool) {
        const toolStart = Date.now();
        try {
          const result = await tool.execute(tc.args, toolContext);
          toolCallRecords.push({
            toolName: tc.name,
            args: tc.args,
            result,
            latencyMs: Date.now() - toolStart,
          });
        } catch (err) {
          toolCallRecords.push({
            toolName: tc.name,
            args: tc.args,
            result: { error: (err as Error).message },
            latencyMs: Date.now() - toolStart,
          });
        }
      }
    }
  }

  // Phase 3: Generate response based on tool results
  let responseContent: string;

  if (provider.name === 'mock') {
    // For mock provider, generate response from tool results
    responseContent = generateResponseFromTools(sanitizedMessage, toolCallRecords, profile, engine);
  } else {
    // For real LLM, send tool results back and get final response
    if (toolCallRecords.length > 0) {
      const toolResultsMessage: LLMMessage = {
        role: 'user',
        content: `Kết quả từ financial tools:\n${JSON.stringify(toolCallRecords.map((t) => ({ tool: t.toolName, result: t.result })), null, 2)}\n\nHãy giải thích kết quả này cho người dùng bằng tiếng Việt, sử dụng số liệu thực từ tools.`,
      };
      const finalResponse = await provider.chat(
        [...llmMessages, toolResultsMessage],
        { temperature: 0.7 }
      );
      responseContent = finalResponse.content;
    } else {
      responseContent = llmResponse.content;
    }
  }

  // Phase 4: Enforce guardrails
  responseContent = enforceGuardrails(responseContent);

  // Phase 5: RAG - search for relevant knowledge if educational question
  const knowledgeResults = searchKnowledge(sanitizedMessage);
  if (knowledgeResults.length > 0 && isEducationalQuestion(sanitizedMessage)) {
    const knowledgeSnippet = knowledgeResults[0].snippet;
    responseContent += `\n\n📖 **Kiến thức tài chính:** ${knowledgeSnippet}`;
  }

  // Phase 6: Generate action plan if asked
  let actionPlan: ActionPlan | undefined;
  if (isActionPlanRequest(sanitizedMessage) || isActionPlanRequest(responseContent)) {
    actionPlan = generateActionPlan(profile, engine);
  }

  const latencyMs = Date.now() - startTime;
  console.log(JSON.stringify({
    event: 'ai.chat.complete',
    latencyMs,
    toolCalls: toolCallRecords.length,
    provider: provider.name,
    intent: intentResult.intent,
    agent: agentType,
    toolsExecuted: toolCallRecords.map((t) => t.toolName),
  }));

  return {
    message: responseContent,
    toolCalls: toolCallRecords,
    sessionId: `session-${Date.now()}`,
    actionPlan,
  };
}

// ============================================================
// Streaming Chat — yields events as the response is generated
// Phase 0-2: non-streaming (intent + tool selection + execution)
// Phase 3: streaming LLM response (word-by-word)
// Phase 4-6: guardrails + RAG + action plan (applied to final text)
// ============================================================
export async function* processChatStream(
  profile: FinancialProfile,
  message: string,
  history: ChatMessage[] = []
): AsyncGenerator<ChatStreamEvent, void, void> {
  const startTime = Date.now();
  const sanitizedMessage = sanitizeUserInput(message);
  const provider = createLLMProvider();

  // --- GreenNode provider: delegate to non-streaming, yield as events ---
  if (provider.name === 'greennode') {
    try {
      yield { type: 'thinking', message: 'AI đang phân tích tình hình tài chính...' };
      const result = await processChat(profile, message, history);
      // Yield tool calls first
      if (result.toolCalls.length > 0) {
        yield { type: 'tools', toolCalls: result.toolCalls };
      }
      // Yield content as a single delta (no streaming from GreenNode agent)
      yield { type: 'delta', content: result.message };
      // Yield done
      yield {
        type: 'done',
        message: result.message,
        toolCalls: result.toolCalls,
        sessionId: result.sessionId,
        actionPlan: result.actionPlan,
      };
    } catch (err) {
      yield { type: 'error', message: 'AI Agent gặp lỗi. Vui lòng thử lại.' };
    }
    return;
  }

  // --- Local providers (mock / openai / compatible) ---

  // Phase 0: Intent classification
  yield { type: 'thinking', message: 'AI đang phân tích câu hỏi...' };

  const intentResult = classifyIntent(sanitizedMessage);
  const agentType = intentToAgent(intentResult.intent);
  const relevantTools = getToolsForAgent(agentType);

  const toolContext = { profile };
  const tools = createFinancialTools(toolContext);
  const engine = calculateFinancialEngine(profile);
  const profileSummary = buildProfileSummary(profile, engine);
  const systemPrompt = buildSystemPrompt(profileSummary);
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: sanitizedMessage },
  ];

  // Phase 1: LLM tool selection (non-streaming)
  const filteredToolDefs = toolDefinitions.filter((td) =>
    relevantTools.includes(td.function.name) ||
    td.function.name === 'getFinancialProfile' ||
    td.function.name === 'getFinancialInsights'
  );

  let llmResponse;
  try {
    llmResponse = await provider.chat(llmMessages, {
      tools: filteredToolDefs,
      temperature: 0.7,
    });
  } catch (err) {
    yield { type: 'error', message: 'Không thể kết nối tới AI. Vui lòng thử lại.' };
    return;
  }

  // Phase 2: Execute tool calls
  const toolCallRecords: ToolCallRecord[] = [];
  if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
    for (const tc of llmResponse.toolCalls) {
      const tool = tools.get(tc.name);
      if (tool) {
        const toolStart = Date.now();
        try {
          const result = await tool.execute(tc.args, toolContext);
          toolCallRecords.push({
            toolName: tc.name,
            args: tc.args,
            result,
            latencyMs: Date.now() - toolStart,
          });
        } catch (err) {
          toolCallRecords.push({
            toolName: tc.name,
            args: tc.args,
            result: { error: (err as Error).message },
            latencyMs: Date.now() - toolStart,
          });
        }
      }
    }
  }

  // Yield tool calls to frontend
  if (toolCallRecords.length > 0) {
    yield { type: 'tools', toolCalls: toolCallRecords };
  }

  // Phase 3: Generate response (streaming for real LLM, single chunk for mock)
  let responseContent: string;

  if (provider.name === 'mock') {
    // Mock: generate complete response, yield as single delta
    responseContent = generateResponseFromTools(sanitizedMessage, toolCallRecords, profile, engine);
    yield { type: 'delta', content: responseContent };
  } else if (provider.chatStream && toolCallRecords.length > 0) {
    // Real LLM with streaming: send tool results back and stream response
    const toolResultsMessage: LLMMessage = {
      role: 'user',
      content: `Kết quả từ financial tools:\n${JSON.stringify(toolCallRecords.map((t) => ({ tool: t.toolName, result: t.result })), null, 2)}\n\nHãy giải thích kết quả này cho người dùng bằng tiếng Việt, sử dụng số liệu thực từ tools.`,
    };

    responseContent = '';
    try {
      for await (const chunk of provider.chatStream(
        [...llmMessages, toolResultsMessage],
        { temperature: 0.7 }
      )) {
        if (chunk.content) {
          responseContent += chunk.content;
          yield { type: 'delta', content: chunk.content };
        }
      }
    } catch (err) {
      // If streaming fails mid-way, yield what we have and add error note
      if (responseContent) {
        // Partial response — continue with what we have
      } else {
        yield { type: 'error', message: 'AI gặp lỗi khi tạo phản hồi. Vui lòng thử lại.' };
        return;
      }
    }
  } else if (toolCallRecords.length > 0) {
    // Real LLM without streaming support — fallback to non-streaming
    const toolResultsMessage: LLMMessage = {
      role: 'user',
      content: `Kết quả từ financial tools:\n${JSON.stringify(toolCallRecords.map((t) => ({ tool: t.toolName, result: t.result })), null, 2)}\n\nHãy giải thích kết quả này cho người dùng bằng tiếng Việt, sử dụng số liệu thực từ tools.`,
    };
    const finalResponse = await provider.chat(
      [...llmMessages, toolResultsMessage],
      { temperature: 0.7 }
    );
    responseContent = finalResponse.content;
    yield { type: 'delta', content: responseContent };
  } else {
    // No tools called — use LLM's direct response
    responseContent = llmResponse.content;
    yield { type: 'delta', content: responseContent };
  }

  // Phase 4: Guardrails
  responseContent = enforceGuardrails(responseContent);

  // Phase 5: RAG
  const knowledgeResults = searchKnowledge(sanitizedMessage);
  if (knowledgeResults.length > 0 && isEducationalQuestion(sanitizedMessage)) {
    responseContent += `\n\n📖 **Kiến thức tài chính:** ${knowledgeResults[0].snippet}`;
  }

  // Phase 6: Action plan
  let actionPlan: ActionPlan | undefined;
  if (isActionPlanRequest(sanitizedMessage) || isActionPlanRequest(responseContent)) {
    actionPlan = generateActionPlan(profile, engine);
  }

  const latencyMs = Date.now() - startTime;
  console.log(JSON.stringify({
    event: 'ai.chat.stream.complete',
    latencyMs,
    toolCalls: toolCallRecords.length,
    provider: provider.name,
    contentLength: responseContent.length,
  }));

  // Yield final done event
  yield {
    type: 'done',
    message: responseContent,
    toolCalls: toolCallRecords,
    sessionId: `session-${Date.now()}`,
    actionPlan,
  };
}

function buildProfileSummary(profile: FinancialProfile, engine: any): string {
  const income = totalMonthlyIncome(profile);
  const expenses = totalMonthlyExpenses(profile);
  return `- Thu nhập: ${formatVND(income)}/tháng
- Chi phí: ${formatVND(expenses)}/tháng
- Dòng tiền tự do: ${formatVND(engine.cashFlow.monthlyFreeCashFlow)}/tháng
- Tỷ lệ tiết kiệm: ${engine.cashFlow.savingRate.toFixed(1)}%
- Tổng tài sản: ${formatVND(engine.netWorth.totalAssets)}
- Tổng nợ: ${formatVND(engine.netWorth.totalLiabilities)}
- Tài sản ròng: ${formatVND(engine.netWorth.netWorth)}
- Tỷ lệ nợ/thu nhập: ${engine.debtRatio.debtToIncome.toFixed(1)}%
- Quỹ dự phòng: ${engine.emergencyFund.emergencyFundMonths} tháng
- Điểm sức khỏe tài chính: ${engine.financialHealth.totalScore}/100
- Mục tiêu: ${profile.goals.map((g) => `${g.goalName} (${formatVND(g.targetAmount)})`).join(', ')}
- Tuổi: ${profile.personal.age}, ${profile.personal.maritalStatus}, ${profile.personal.dependents} người phụ thuộc`;
}

function generateResponseFromTools(
  userMessage: string,
  toolCalls: ToolCallRecord[],
  profile: FinancialProfile,
  engine: any
): string {
  const lower = userMessage.toLowerCase();
  const parts: string[] = [];

  // Get profile and cash flow data
  const cashFlow = engine.cashFlow;
  const health = engine.financialHealth;
  const goals = engine.goalProjection;

  // Scenario result
  const scenarioResult = toolCalls.find((t) => t.toolName === 'simulateScenario')?.result as any;
  const lifeEventResult = toolCalls.find((t) => t.toolName === 'simulateLifeEvent')?.result as any;
  const affordabilityResult = toolCalls.find((t) => t.toolName === 'calculateAffordability')?.result as any;

  if (lifeEventResult) {
    const b = lifeEventResult.before;
    const a = lifeEventResult.after;
    const d = lifeEventResult.deltas;
    parts.push(
      `**Mô phỏng sự kiện: ${lifeEventResult.assumptions?.label || 'Sự kiện cuộc sống'}**\n\n` +
      `**Trước:**\n` +
      `- Thu nhập: ${formatVND(b.monthlyIncome)}/tháng\n` +
      `- Chi phí: ${formatVND(b.monthlyExpense)}/tháng\n` +
      `- Tiết kiệm: ${formatVND(b.monthlySaving)}/tháng\n` +
      `- Điểm sức khỏe: ${b.healthScore}/100\n\n` +
      `**Sau:**\n` +
      `- Thu nhập: ${formatVND(a.monthlyIncome)}/tháng\n` +
      `- Chi phí: ${formatVND(a.monthlyExpense)}/tháng\n` +
      `- Tiết kiệm: ${formatVND(a.monthlySaving)}/tháng\n` +
      `- Điểm sức khỏe: ${a.healthScore}/100\n\n` +
      `**Tác động:**\n` +
      `- Thay đổi tiết kiệm: ${d.monthlySavingDelta >= 0 ? '+' : ''}${formatVND(d.monthlySavingDelta)}/tháng\n` +
      `- Thay đổi sức khỏe: ${d.healthScoreDelta >= 0 ? '+' : ''}${d.healthScoreDelta} điểm\n` +
      `- Thay đổi thời gian mục tiêu: ${d.goalTimelineDeltaMonths >= 0 ? '+' : ''}${d.goalTimelineDeltaMonths} tháng\n`
    );
    if (d.monthlySavingDelta < 0) {
      parts.push(`\n⚠️ Sự kiện này làm giảm khả năng tiết kiệm. Bạn nên cân nhắc điều chỉnh chi phí hoặc thời gian mục tiêu.`);
    } else if (d.monthlySavingDelta > 0) {
      parts.push(`\n✅ Sự kiện này cải thiện tình hình tài chính. Bạn có thể đạt mục tiêu nhanh hơn.`);
    }
  } else if (affordabilityResult) {
    parts.push(
      `**Đánh giá khả năng chi trả**\n\n` +
      `- Giá: ${formatVND(affordabilityResult.purchasePrice)}\n` +
      `- Trả trước: ${formatVND(affordabilityResult.downPayment)}\n` +
      `- Khoản vay: ${formatVND(affordabilityResult.loanAmount)}\n` +
      `- Trả hàng tháng: ${formatVND(affordabilityResult.monthlyPayment)}\n` +
      `- Dòng tiền còn lại: ${formatVND(affordabilityResult.remainingCashFlow)}\n` +
      `- Tỷ lệ nợ/thu nhập sau mua: ${affordabilityResult.debtToIncomeAfter}%\n` +
      `- Quỹ dự phòng sau mua: ${affordabilityResult.emergencyFundMonthsAfter} tháng\n\n` +
      `${affordabilityResult.affordable ? '✅ Khả thi' : '⚠️ Cần thận trọng'} — ${affordabilityResult.recommendation}`
    );
  } else if (scenarioResult) {
    const comp = scenarioResult.comparison;
    const scenarioEngine = scenarioResult.engineResult;
    parts.push(
      `**Kịch bản: ${scenarioResult.config.label}**\n\n`
    );
    parts.push(
      `So với hiện tại:\n` +
      `- Dòng tiền tự do: ${formatVND(cashFlow.monthlyFreeCashFlow)} → ${formatVND(scenarioEngine.cashFlow.monthlyFreeCashFlow)} (thay đổi ${formatVND(comp.cashFlowDelta)})\n` +
      `- Tỷ lệ tiết kiệm: ${cashFlow.savingRate.toFixed(1)}% → ${scenarioEngine.cashFlow.savingRate.toFixed(1)}%\n` +
      `- Điểm sức khỏe: ${health.totalScore} → ${scenarioEngine.financialHealth.totalScore} (thay đổi ${comp.healthScoreDelta > 0 ? '+' : ''}${comp.healthScoreDelta})\n`
    );

    if (goals.length > 0 && scenarioEngine.goalProjection.length > 0) {
      const baseGoal = goals[0];
      const scenarioGoal = scenarioEngine.goalProjection[0];
      parts.push(
        `- Mục tiêu "${baseGoal.goalName}": ${baseGoal.monthsToTarget} tháng → ${scenarioGoal.monthsToTarget} tháng\n`
      );
    }

    if (comp.cashFlowDelta < 0) {
      const percentChange = Math.round((comp.cashFlowDelta / cashFlow.monthlyFreeCashFlow) * 100);
      parts.push(
        `\nVới giả định này, khả năng tích lũy ${percentChange < 0 ? 'giảm' : 'tăng'} khoảng ${Math.abs(percentChange)}%. `
      );
      if (percentChange < 0) {
        parts.push('Bạn có thể cân nhắc tăng thu nhập, giảm chi phí hoặc điều chỉnh thời điểm mục tiêu.');
      } else {
        parts.push('Bạn có thể đạt mục tiêu nhanh hơn hoặc tăng tích lũy.');
      }
    }
  } else if (lower.includes('mua nhà') || lower.includes('mua nha') || lower.includes('goal') || lower.includes('mục tiêu') || lower.includes('khả thi')) {
    if (goals.length > 0) {
      const goal = goals[0];
      parts.push(
        `Về mục tiêu "${goal.goalName}" (${formatVND(goal.targetAmount)}):\n\n` +
        `- Vốn hiện có: ${formatVND(goal.currentSavings)}\n` +
        `- Tiết kiệm hàng tháng: ${formatVND(goal.monthlySavingCapacity)}\n` +
        `- Dự kiến có sau ${goal.monthsToTarget} tháng: ${formatVND(goal.expectedSavings)}\n` +
        `- Khoảng cách tài trợ: ${formatVND(goal.fundingGap)}\n` +
        `- Tiết kiệm cần thiết: ${formatVND(goal.requiredMonthlySaving)}/tháng\n\n`
      );
      if (goal.isAchievable) {
        parts.push(`Theo ước tính, mục tiêu khả thi với tốc độ tiết kiệm hiện tại. Tuy nhiên, bạn nên cân nhắc các rủi ro như lãi suất thay đổi, chi phí phát sinh.`);
      } else {
        parts.push(`Theo ước tính, với tốc độ tiết kiệm hiện tại, bạn cần khoảng ${goal.monthsToTarget} tháng để đạt mục tiêu. Khoảng cách tài trợ là ${formatVND(goal.fundingGap)}. Bạn nên cân nhắc tăng thu nhập, giảm chi phí, hoặc điều chỉnh thời gian mục tiêu.`);
      }
    }
  } else if (lower.includes('sức khỏe') || lower.includes('suc khoe') || lower.includes('health') || lower.includes('tài chính') || lower.includes('tai chinh') || lower.includes('thu nhập') || lower.includes('thu nhap') || lower.includes('ổn') || lower.includes('on')) {
    parts.push(
      `Điểm sức khỏe tài chính của bạn: **${health.totalScore}/100** (${health.rating})\n\n` +
      `**Breakdown:**\n` +
      health.breakdown.map((b: any) => `- ${b.component}: ${b.score}/${b.maxScore}`).join('\n') +
      `\n\n` +
      `**Tổng quan:**\n` +
      `- Thu nhập: ${formatVND(cashFlow.monthlyIncome)}/tháng\n` +
      `- Chi phí: ${formatVND(cashFlow.monthlyExpense)}/tháng\n` +
      `- Dòng tiền tự do: ${formatVND(cashFlow.monthlyFreeCashFlow)}/tháng\n` +
      `- Tỷ lệ tiết kiệm: ${cashFlow.savingRate.toFixed(1)}%\n` +
      `- Tài sản ròng: ${formatVND(engine.netWorth.netWorth)}\n` +
      `- Tỷ lệ nợ/thu nhập: ${engine.debtRatio.debtToIncome.toFixed(1)}%\n` +
      `- Quỹ dự phòng: ${engine.emergencyFund.emergencyFundMonths} tháng\n\n`
    );
    parts.push(health.breakdown[0].recommendation);
  } else if (lower.includes('nợ') || lower.includes('no') || lower.includes('debt') || lower.includes('trả nợ') || lower.includes('tra no')) {
    parts.push(
      `Về khoản nợ của bạn:\n\n` +
      `- Số dư nợ: ${formatVND(profile.liabilities.loanBalance)}\n` +
      `- Lãi suất: ${profile.liabilities.interestRate}%/năm\n` +
      `- Trả hàng tháng: ${formatVND(profile.liabilities.monthlyRepayment)}\n` +
      `- Tỷ lệ nợ/thu nhập: ${engine.debtRatio.debtToIncome.toFixed(1)}%\n` +
      `- Tỷ lệ trả nợ/thu nhập: ${engine.debtRatio.monthlyRepaymentToIncome.toFixed(1)}%\n\n`
    );
    if (engine.debtRatio.debtToIncome > 36) {
      parts.push('Tỷ lệ nợ đang ở mức cao. Bạn nên ưu tiên trả nợ nhanh hơn để giảm gánh nặng lãi suất. Có thể cân nhắc gom nợ hoặc đàm phán lại lãi suất.');
    } else {
      parts.push('Tỷ lệ nợ đang ở mức an toàn. Bạn có thể cân nhắc duy trì tốc độ trả nợ hiện tại và ưu tiên tích lũy cho mục tiêu khác.');
    }
  } else {
    // Default response with profile overview
    parts.push(
      `Dựa trên hồ sơ tài chính của bạn:\n\n` +
      `- Thu nhập: ${formatVND(cashFlow.monthlyIncome)}/tháng\n` +
      `- Chi phí: ${formatVND(cashFlow.monthlyExpense)}/tháng\n` +
      `- Dòng tiền tự do: ${formatVND(cashFlow.monthlyFreeCashFlow)}/tháng\n` +
      `- Tỷ lệ tiết kiệm: ${cashFlow.savingRate.toFixed(1)}%\n` +
      `- Tài sản ròng: ${formatVND(engine.netWorth.netWorth)}\n` +
      `- Điểm sức khỏe tài chính: ${health.totalScore}/100\n\n`
    );

    if (goals.length > 0) {
      const goal = goals[0];
      parts.push(
        `Mục tiêu "${goal.goalName}": ${goal.isAchievable ? 'Khả thi' : 'Cần điều chỉnh'} — ${formatVND(goal.fundingGap)} khoảng cách tài trợ.`
      );
    }
  }

  return parts.join('');
}

function isEducationalQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('là gì') ||
    lower.includes('how to') ||
    lower.includes('what is') ||
    lower.includes('kiến thức') ||
    lower.includes('hướng dẫn') ||
    lower.includes('cách') ||
    lower.includes('education')
  );
}

function isActionPlanRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('action plan') ||
    lower.includes('kế hoạch') ||
    lower.includes('ke hoach') ||
    lower.includes('ưu tiên') ||
    lower.includes('uu tien') ||
    lower.includes('nên làm gì') ||
    lower.includes('nen lam gi') ||
    lower.includes('plan')
  );
}
