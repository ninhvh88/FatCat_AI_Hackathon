import type { LLMProvider, LLMMessage, LLMResponse, LLMToolDefinition } from '../../../types';
import { config } from '../../../config/env';

// ============================================================
// Mock LLM Provider
// Used when no API key is available. Produces rule-based
// responses that still demonstrate the tool-calling flow.
// ============================================================

export class MockLLMProvider implements LLMProvider {
  name = 'mock';

  async chat(
    messages: LLMMessage[],
    options?: { tools?: LLMToolDefinition[]; temperature?: number; model?: string }
  ): Promise<LLMResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUserMessage?.content ?? '';

    // Simulate tool calling based on keywords
    const toolCalls: LLMResponse['toolCalls'] = [];
    const availableTools = options?.tools ?? [];

    const hasTool = (name: string) => availableTools.some((t) => t.function.name === name);

    // Always get financial profile first
    if (hasTool('getFinancialProfile')) {
      toolCalls.push({ id: 'call_1', name: 'getFinancialProfile', args: {} });
    }

    // Detect intent and select tools
    const lower = userText.toLowerCase();

    // Life event detection (higher priority than generic scenario)
    const isLifeEvent =
      lower.includes('có con') || lower.includes('co con') || lower.includes('sinh con') ||
      lower.includes('kết hôn') || lower.includes('ket hon') || lower.includes('cưới') ||
      lower.includes('đổi việc') || lower.includes('doi viec') || lower.includes('mất việc') ||
      lower.includes('khởi nghiệp') || lower.includes('khoi nghiep');

    if (isLifeEvent && hasTool('simulateLifeEvent')) {
      let eventType = 'HAVE_CHILD';
      let assumptions: Record<string, unknown> = {};

      if (lower.includes('con') || lower.includes('child')) {
        eventType = 'HAVE_CHILD';
        assumptions = { monthlyChildCost: 5000000, oneTimeCost: 20000000, incomeReductionMonths: 3, incomeReductionPercent: 30 };
      } else if (lower.includes('hôn') || lower.includes('hon') || lower.includes('cưới') || lower.includes('cuoi')) {
        eventType = 'GET_MARRIED';
        assumptions = { weddingCost: 200000000, housingIncrease: 2000000, combinedIncomePercent: 0 };
      } else if (lower.includes('đổi việc') || lower.includes('doi viec') || lower.includes('mất việc') || lower.includes('mat viec')) {
        eventType = lower.includes('mất') || lower.includes('mat') ? 'INCOME_LOSS' : 'JOB_CHANGE';
        assumptions = lower.includes('mất') || lower.includes('mat')
          ? { lossDurationMonths: 6, incomeLossPercent: 100 }
          : { incomeChangePercent: 20, relocationCost: 5000000 };
      } else if (lower.includes('nghiệp') || lower.includes('nghiep')) {
        eventType = 'START_BUSINESS';
        assumptions = { initialCapital: 100000000, monthlyRevenue: 15000000, monthlyExpense: 8000000, rampUpMonths: 6 };
      }

      toolCalls.push({
        id: 'call_le',
        name: 'simulateLifeEvent',
        args: { eventType, assumptions },
      });
    }

    if (
      (lower.includes('mua nhà') || lower.includes('mua nha') || lower.includes('buy house') || lower.includes('goal')) &&
      hasTool('calculateGoalProjection')
    ) {
      toolCalls.push({ id: 'call_2', name: 'calculateGoalProjection', args: {} });
    }

    // Affordability check
    if (
      (lower.includes('đủ tiền') || lower.includes('du tien') || lower.includes('afford') || lower.includes('khả thi') || lower.includes('kha thi')) &&
      (lower.includes('mua') || lower.includes('buy')) &&
      hasTool('calculateAffordability')
    ) {
      const isHouse = lower.includes('nhà') || lower.includes('nha') || lower.includes('house');
      toolCalls.push({
        id: 'call_aff',
        name: 'calculateAffordability',
        args: isHouse
          ? { price: 3000000000, downPayment: 600000000, interestRate: 8, loanTermMonths: 300 }
          : { price: 600000000, downPayment: 180000000, interestRate: 8, loanTermMonths: 60 },
      });
    }

    if (
      (lower.includes('sức khỏe') || lower.includes('suc khoe') || lower.includes('health') || lower.includes('tài chính') || lower.includes('tai chinh')) &&
      hasTool('calculateFinancialHealth')
    ) {
      toolCalls.push({ id: 'call_3', name: 'calculateFinancialHealth', args: {} });
    }

    if (
      !isLifeEvent &&
      (lower.includes('con') || lower.includes('child') || lower.includes('scenario') || lower.includes('tăng') || lower.includes('increase') || lower.includes('giảm') || lower.includes('decrease') || lower.includes('if') || lower.includes('nếu') || lower.includes('neu')) &&
      hasTool('simulateScenario')
    ) {
      // Determine scenario type
      let scenarioType = 'INCOME_INCREASE';
      let params: Record<string, unknown> = { percent: 20 };
      let label = 'Thu nhập +20%';

      if (lower.includes('con') || lower.includes('child')) {
        scenarioType = 'NEW_CHILD';
        params = { monthlyCost: 5000000 };
        label = 'Sinh con';
      } else if (lower.includes('giảm') || lower.includes('decrease') || lower.includes('-20')) {
        scenarioType = 'INCOME_DECREASE';
        params = { percent: 20 };
        label = 'Thu nhập -20%';
      } else if (lower.includes('xe') || lower.includes('car') || lower.includes('ô tô')) {
        scenarioType = 'BUY_CAR';
        params = {};
        label = 'Mua ô tô';
      }

      toolCalls.push({
        id: 'call_4',
        name: 'simulateScenario',
        args: { scenarioType, label, params },
      });
    }

    if (
      (lower.includes('cash flow') || lower.includes('dòng tiền') || lower.includes('dong tien') || lower.includes('tiết kiệm') || lower.includes('tiet kiem')) &&
      hasTool('calculateCashFlow')
    ) {
      toolCalls.push({ id: 'call_5', name: 'calculateCashFlow', args: {} });
    }

    if (hasTool('getFinancialInsights')) {
      toolCalls.push({ id: 'call_6', name: 'getFinancialInsights', args: {} });
    }

    // Generate a placeholder content — the orchestrator will replace this
    // with a real response after tool results are available
    const content = `[MOCK AI] Tôi đã phân tích câu hỏi của bạn và gọi ${toolCalls.length} công cụ tài chính để lấy dữ liệu thực tế. Kết quả sẽ được tổng hợp từ Financial Engine.`;

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}

// ============================================================
// OpenAI Provider
// ============================================================
export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: any;

  constructor() {
    // Dynamic import to avoid requiring openai package in mock mode
    const { OpenAI } = require('openai');
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseUrl,
    });
  }

  async chat(
    messages: LLMMessage[],
    options?: { tools?: LLMToolDefinition[]; temperature?: number; model?: string }
  ): Promise<LLMResponse> {
    const model = options?.model ?? config.llm.model;
    const temperature = options?.temperature ?? config.llm.temperature;

    const requestParams: any = {
      model,
      messages,
      temperature,
    };

    if (options?.tools && options.tools.length > 0) {
      requestParams.tools = options.tools;
      requestParams.tool_choice = 'auto';
    }

    const response = await this.client.chat.completions.create(requestParams);
    const choice = response.choices[0];

    const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}'),
    }));

    return {
      content: choice.message.content ?? '',
      toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }
}

// ============================================================
// Compatible LLM Provider (OpenAI-compatible API)
// Works with any OpenAI-compatible endpoint (GreenNode, vLLM, etc.)
// ============================================================
export class CompatibleLLMProvider implements LLMProvider {
  name = 'compatible';
  private client: any;

  constructor() {
    const { OpenAI } = require('openai');
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseUrl,
    });
  }

  async chat(
    messages: LLMMessage[],
    options?: { tools?: LLMToolDefinition[]; temperature?: number; model?: string }
  ): Promise<LLMResponse> {
    // Same implementation as OpenAI but uses compatible base URL
    const provider = new OpenAIProvider();
    provider.name = 'compatible';
    return provider.chat(messages, options);
  }
}

// ============================================================
// Provider Factory
// ============================================================
export function createLLMProvider(): LLMProvider {
  const provider = config.llm.provider.toLowerCase();

  switch (provider) {
    case 'openai':
      if (!config.llm.apiKey) {
        console.warn('[LLM] No API key for OpenAI provider, falling back to mock');
        return new MockLLMProvider();
      }
      return new OpenAIProvider();

    case 'compatible':
      if (!config.llm.apiKey) {
        console.warn('[LLM] No API key for compatible provider, falling back to mock');
        return new MockLLMProvider();
      }
      return new CompatibleLLMProvider();

    case 'mock':
    default:
      return new MockLLMProvider();
  }
}
