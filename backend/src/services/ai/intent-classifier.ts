import type { FinancialProfile } from '../../types';

// ============================================================
// Intent Classifier
// Classifies user messages into financial intents to route
// to the appropriate agent(s). Deterministic (keyword-based)
// for the mock provider; can be LLM-based for real providers.
// ============================================================

export type FinancialIntent =
  | 'PROFILE_QUERY'        // "thông tin cá nhân", "hồ sơ"
  | 'CASHFLOW_QUERY'       // "dòng tiền", "thu nhập", "chi phí"
  | 'HEALTH_QUERY'         // "sức khỏe tài chính", "điểm"
  | 'GOAL_QUERY'           // "mục tiêu", "mua nhà", "mua xe"
  | 'SCENARIO_QUERY'       // "nếu", "giả sử", "what if"
  | 'LIFE_EVENT_QUERY'     // "có con", "kết hôn", "đổi việc"
  | 'DEBT_QUERY'           // "nợ", "vay", "trả nợ"
  | 'SAVINGS_QUERY'        // "tiết kiệm", "dự phòng"
  | 'ACTION_PLAN_QUERY'    // "kế hoạch", "nên làm gì"
  | 'EDUCATIONAL_QUERY'    // "là gì", "cách", "hướng dẫn"
  | 'GENERAL_QUERY';       // fallback

export interface IntentResult {
  intent: FinancialIntent;
  confidence: number; // 0-1
  keywords: string[];
}

const INTENT_KEYWORDS: Record<FinancialIntent, string[]> = {
  PROFILE_QUERY: ['hồ sơ', 'ho so', 'thông tin cá nhân', 'thong tin ca nhan', 'profile'],
  CASHFLOW_QUERY: ['dòng tiền', 'dong tien', 'thu nhập', 'thu nhap', 'chi phí', 'chi phi', 'cash flow', 'income', 'expense'],
  HEALTH_QUERY: ['sức khỏe', 'suc khoe', 'điểm tài chính', 'diem tai chinh', 'health', 'tài chính của tôi', 'tai chinh cua toi'],
  GOAL_QUERY: ['mục tiêu', 'muc tieu', 'mua nhà', 'mua nha', 'mua xe', 'goal', 'target', 'khả thi', 'kha thi'],
  SCENARIO_QUERY: ['nếu', 'neu', 'giả sử', 'gia su', 'what if', 'kịch bản', 'kich ban', 'mô phỏng', 'mo phong', 'tăng', 'giam', 'giảm'],
  LIFE_EVENT_QUERY: ['có con', 'co con', 'sinh con', 'kết hôn', 'ket hon', 'đổi việc', 'doi viec', 'mất việc', 'mat viec', 'khởi nghiệp', 'khoi nghiep', 'dọn nhà', 'don nha'],
  DEBT_QUERY: ['khoản nợ', 'khoan no', 'vay', 'debt', 'trả nợ', 'tra no', 'lãi suất', 'lai suat'],
  SAVINGS_QUERY: ['tiết kiệm', 'tiet kiem', 'dự phòng', 'du phong', 'saving', 'emergency', 'quỹ dự phòng', 'quy du phong'],
  ACTION_PLAN_QUERY: ['kế hoạch', 'ke hoach', 'nên làm', 'nen lam', 'action plan', 'ưu tiên', 'uu tien', 'plan'],
  EDUCATIONAL_QUERY: ['là gì', 'la gi', 'cách', 'cach', 'hướng dẫn', 'huong dan', 'how to', 'what is', 'kiến thức', 'kien thuc'],
  GENERAL_QUERY: [],
};

export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase();
  const scores: Array<{ intent: FinancialIntent; score: number; keywords: string[] }> = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.length === 0) continue;

    const matched: string[] = [];
    let score = 0;

    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matched.push(kw);
        score += 1;
      }
    }

    if (score > 0) {
      scores.push({ intent: intent as FinancialIntent, score, keywords: matched });
    }
  }

  if (scores.length === 0) {
    return { intent: 'GENERAL_QUERY', confidence: 0.3, keywords: [] };
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Normalize confidence
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const confidence = Math.min(1, scores[0].score / total + 0.3);

  return {
    intent: scores[0].intent,
    confidence,
    keywords: scores[0].keywords,
  };
}

// Map intent to agent type
export type AgentType = 'profile' | 'cashflow' | 'scenario' | 'coach';

export function intentToAgent(intent: FinancialIntent): AgentType {
  switch (intent) {
    case 'PROFILE_QUERY':
      return 'profile';
    case 'CASHFLOW_QUERY':
    case 'HEALTH_QUERY':
    case 'DEBT_QUERY':
    case 'SAVINGS_QUERY':
      return 'cashflow';
    case 'GOAL_QUERY':
    case 'SCENARIO_QUERY':
    case 'LIFE_EVENT_QUERY':
      return 'scenario';
    case 'ACTION_PLAN_QUERY':
    case 'EDUCATIONAL_QUERY':
    case 'GENERAL_QUERY':
    default:
      return 'coach';
  }
}

// Get the tools relevant for an agent
export function getToolsForAgent(agent: AgentType): string[] {
  switch (agent) {
    case 'profile':
      return ['getFinancialProfile'];
    case 'cashflow':
      return ['calculateCashFlow', 'calculateFinancialHealth', 'getFinancialInsights'];
    case 'scenario':
      return ['simulateScenario', 'calculateGoalProjection', 'calculateAffordability', 'simulateLifeEvent'];
    case 'coach':
    default:
      return ['getFinancialProfile', 'calculateFinancialHealth', 'getFinancialInsights', 'generateActionPlan'];
  }
}
