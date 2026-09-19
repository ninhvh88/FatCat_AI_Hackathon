import type {
  FinancialProfile,
  FinancialEngineResult,
  ScenarioConfig,
  AIInsight,
  ActionPlan,
  LLMToolDefinition,
} from '../../../types';
import { calculateFinancialEngine, simulateScenario, getPredefinedScenarios, calculateAffordability, simulateLifeEvent, getDefaultAssumptions } from '../../financial-engine';
import { generateInsights } from '../../insight.service';
import { generateActionPlan } from '../../action-plan.service';
import type { LifeEventType } from '../../../types';

// ============================================================
// Financial Tools — callable by the AI Orchestrator
// These tools wrap the Financial Engine so the LLM can
// request calculations without doing math itself.
// ============================================================

export interface FinancialToolContext {
  profile: FinancialProfile;
}

export interface FinancialTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: FinancialToolContext) => Promise<unknown>;
}

// --- Tool Definitions (for LLM function calling) ---
export const toolDefinitions: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getFinancialProfile',
      description: 'Lấy hồ sơ tài chính hiện tại của người dùng, bao gồm thu nhập, chi phí, tài sản, nợ và mục tiêu.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateCashFlow',
      description: 'Tính dòng tiền hàng tháng: thu nhập, chi phí, dòng tiền tự do, tỷ lệ tiết kiệm.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateFinancialHealth',
      description: 'Tính điểm sức khỏe tài chính (0-100) với breakdown theo từng component.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateGoalProjection',
      description: 'Tính dự phóng mục tiêu tài chính: thời gian đạt mục tiêu, khoảng cách tài trợ, tiết kiệm cần thiết.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulateScenario',
      description: 'Mô phỏng kịch bản tài chính (tăng/giảm thu nhập, sinh con, mua nhà/xe, lãi suất thay đổi). Trả về so sánh với hiện tại.',
      parameters: {
        type: 'object',
        properties: {
          scenarioType: {
            type: 'string',
            enum: ['INCOME_INCREASE', 'INCOME_DECREASE', 'EXPENSE_INCREASE', 'NEW_CHILD', 'BUY_CAR', 'BUY_HOUSE', 'LOAN_INTEREST_INCREASE', 'CUSTOM'],
          },
          label: { type: 'string' },
          params: { type: 'object' },
        },
        required: ['scenarioType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFinancialInsights',
      description: 'Tạo các insight tài chính cá nhân hóa: điểm mạnh, cảnh báo, cơ hội.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateActionPlan',
      description: 'Tạo kế hoạch hành động tài chính cá nhân hóa với các ưu tiên.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateAffordability',
      description: 'Kiểm tra khả năng chi trả cho một khoản mua lớn (nhà, xe). Trả về khả thi/không, dòng tiền còn lại, tỷ lệ nợ.',
      parameters: {
        type: 'object',
        properties: {
          price: { type: 'number', description: 'Giá mua (VND)' },
          downPayment: { type: 'number', description: 'Tiền trả trước (VND)' },
          interestRate: { type: 'number', description: 'Lãi suất năm (%)' },
          loanTermMonths: { type: 'number', description: 'Kỳ hạn vay (tháng)' },
        },
        required: ['price', 'downPayment', 'interestRate', 'loanTermMonths'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulateLifeEvent',
      description: 'Mô phỏng sự kiện cuộc sống (sinh con, kết hôn, đổi việc, mất thu nhập). Trả về so sánh trước/sau.',
      parameters: {
        type: 'object',
        properties: {
          eventType: {
            type: 'string',
            enum: ['HAVE_CHILD', 'GET_MARRIED', 'BUY_HOUSE', 'BUY_CAR', 'JOB_CHANGE', 'INCOME_LOSS', 'START_BUSINESS', 'MOVE'],
          },
          assumptions: { type: 'object', description: 'Các giả định có thể chỉnh sửa' },
        },
        required: ['eventType'],
      },
    },
  },
];

// --- Tool Executors ---
export function createFinancialTools(ctx: FinancialToolContext): Map<string, FinancialTool> {
  const tools = new Map<string, FinancialTool>();

  tools.set('getFinancialProfile', {
    name: 'getFinancialProfile',
    description: 'Get current financial profile',
    parameters: {},
    execute: async () => {
      return ctx.profile;
    },
  });

  tools.set('calculateCashFlow', {
    name: 'calculateCashFlow',
    description: 'Calculate monthly cash flow',
    parameters: {},
    execute: async () => {
      const engine = calculateFinancialEngine(ctx.profile);
      return engine.cashFlow;
    },
  });

  tools.set('calculateFinancialHealth', {
    name: 'calculateFinancialHealth',
    description: 'Calculate financial health score',
    parameters: {},
    execute: async () => {
      const engine = calculateFinancialEngine(ctx.profile);
      return engine.financialHealth;
    },
  });

  tools.set('calculateGoalProjection', {
    name: 'calculateGoalProjection',
    description: 'Calculate goal projection',
    parameters: {},
    execute: async () => {
      const engine = calculateFinancialEngine(ctx.profile);
      return engine.goalProjection;
    },
  });

  tools.set('simulateScenario', {
    name: 'simulateScenario',
    description: 'Simulate a financial scenario',
    parameters: {},
    execute: async (args) => {
      const scenario: ScenarioConfig = {
        type: args.scenarioType as ScenarioConfig['type'],
        label: (args.label as string) || 'Custom Scenario',
        params: (args.params as Record<string, number>) ?? {},
      };
      return simulateScenario(ctx.profile, scenario);
    },
  });

  tools.set('getFinancialInsights', {
    name: 'getFinancialInsights',
    description: 'Generate financial insights',
    parameters: {},
    execute: async () => {
      const engine = calculateFinancialEngine(ctx.profile);
      return generateInsights(ctx.profile, engine);
    },
  });

  tools.set('generateActionPlan', {
    name: 'generateActionPlan',
    description: 'Generate action plan',
    parameters: {},
    execute: async () => {
      const engine = calculateFinancialEngine(ctx.profile);
      return generateActionPlan(ctx.profile, engine);
    },
  });

  tools.set('calculateAffordability', {
    name: 'calculateAffordability',
    description: 'Check affordability of a purchase',
    parameters: {},
    execute: async (args) => {
      return calculateAffordability(ctx.profile, {
        price: args.price as number,
        downPayment: args.downPayment as number,
        interestRate: args.interestRate as number,
        loanTermMonths: args.loanTermMonths as number,
      });
    },
  });

  tools.set('simulateLifeEvent', {
    name: 'simulateLifeEvent',
    description: 'Simulate a life event',
    parameters: {},
    execute: async (args) => {
      const type = args.eventType as LifeEventType;
      const assumptions = (args.assumptions as Record<string, number>) ?? getDefaultAssumptions(type);
      return simulateLifeEvent(ctx.profile, { type, label: type, assumptions });
    },
  });

  return tools;
}
