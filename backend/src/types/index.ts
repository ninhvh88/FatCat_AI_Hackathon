// ============================================================
// Core Domain Types - AI Financial Coach
// ============================================================

// --- Personal ---
export interface Personal {
  age: number;
  maritalStatus: MaritalStatus;
  dependents: number;
  location?: string; // city/region for cost-of-living context
}

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

// --- Income ---
export interface Income {
  monthlyIncome: number;
  otherIncome: number;
  bonus?: number; // annual bonus
}

// --- Expenses ---
export interface Expenses {
  housing: number;
  food: number;
  transportation: number;
  family: number;
  entertainment: number;
  other: number;
  education?: number; // tuition, courses
  healthcare?: number; // insurance, medical
  recurring?: number; // subscriptions, utilities
}

// --- Assets ---
export interface Assets {
  cash: number;
  savings: number;
  stocks: number;
  realEstate: number;
  other: number;
}

// --- Liabilities ---
export interface Liabilities {
  loanBalance: number;
  interestRate: number; // annual %, e.g. 10 = 10%
  monthlyRepayment: number;
  // Optional breakdown for richer debt modeling
  mortgage?: number;
  consumerLoans?: number;
  creditCards?: number;
  otherDebt?: number;
}

// --- Risk Profile ---
export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type InvestmentExperience = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface RiskProfile {
  tolerance: RiskTolerance;
  horizon: number; // investment horizon in years
  experience: InvestmentExperience;
}

// --- Goals ---
export type GoalType =
  | 'BUY_HOUSE'
  | 'BUY_CAR'
  | 'GET_MARRIED'
  | 'HAVE_CHILD'
  | 'EMERGENCY_FUND'
  | 'INVESTMENT'
  | 'RETIREMENT'
  | 'EDUCATION'
  | 'TRAVEL'
  | 'CUSTOM';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'PLANNING';

export interface FinancialGoal {
  id?: string;
  goalType: GoalType;
  goalName: string;
  targetAmount: number;
  targetDate: string; // ISO date string
  currentAllocated?: number; // amount already saved toward this goal
  monthlyContribution?: number; // monthly amount being saved
  priority?: number; // 1 (highest) - 5 (lowest)
  status?: GoalStatus;
}

// --- Financial Profile (aggregate) ---
export interface FinancialProfile {
  id?: string;
  userId: string;
  personal: Personal;
  income: Income;
  expenses: Expenses;
  assets: Assets;
  liabilities: Liabilities;
  goals: FinancialGoal[];
  riskProfile?: RiskProfile;
  createdAt?: string;
  updatedAt?: string;
}

// --- Financial Engine Output ---
export interface CashFlowResult {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyFreeCashFlow: number;
  savingRate: number; // percentage 0-100
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface DebtRatioResult {
  debtToIncome: number; // percentage
  debtToAsset: number; // percentage
  monthlyRepaymentToIncome: number; // percentage
}

export interface EmergencyFundResult {
  emergencyFundBalance: number;
  emergencyFundMonths: number;
  recommendedFund: number; // 6 months of expenses
  shortfall: number;
}

export interface GoalProjectionResult {
  goalName: string;
  targetAmount: number;
  currentSavings: number;
  monthlySavingCapacity: number;
  monthsToTarget: number;
  expectedSavings: number; // what you'll have by target date
  fundingGap: number;
  requiredMonthlySaving: number;
  estimatedTargetDate: string;
  isAchievable: boolean;
  progressPercentage: number;
}

export interface FinancialHealthBreakdown {
  component: string;
  score: number;
  maxScore: number;
  recommendation: string;
}

export interface FinancialHealthResult {
  totalScore: number; // 0-100
  rating: 'POOR' | 'FAIR' | 'GOOD' | 'HEALTHY' | 'EXCELLENT';
  breakdown: FinancialHealthBreakdown[];
}

export interface FinancialEngineResult {
  cashFlow: CashFlowResult;
  netWorth: NetWorthResult;
  debtRatio: DebtRatioResult;
  emergencyFund: EmergencyFundResult;
  goalProjection: GoalProjectionResult[];
  financialHealth: FinancialHealthResult;
}

// --- Scenario Types ---
export type ScenarioType =
  | 'INCOME_INCREASE'
  | 'INCOME_DECREASE'
  | 'EXPENSE_INCREASE'
  | 'EXPENSE_DECREASE'
  | 'NEW_CHILD'
  | 'BUY_CAR'
  | 'BUY_HOUSE'
  | 'NEW_DEBT'
  | 'CHANGE_SAVINGS_RATE'
  | 'LOAN_INTEREST_INCREASE'
  | 'JOB_CHANGE'
  | 'GET_MARRIED'
  | 'CUSTOM';

export interface ScenarioConfig {
  type: ScenarioType;
  label: string;
  params: Record<string, number>;
}

export interface ScenarioResult {
  config: ScenarioConfig;
  modifiedProfile: FinancialProfile;
  engineResult: FinancialEngineResult;
  comparison: {
    cashFlowDelta: number;
    netWorthDelta: number;
    goalDateDelta: number; // months
    savingRateDelta: number;
    healthScoreDelta: number;
  };
}

// --- Life Event Simulation ---
export type LifeEventType =
  | 'HAVE_CHILD'
  | 'GET_MARRIED'
  | 'BUY_HOUSE'
  | 'BUY_CAR'
  | 'JOB_CHANGE'
  | 'INCOME_LOSS'
  | 'START_BUSINESS'
  | 'MOVE';

export interface LifeEventAssumptions {
  [key: string]: number;
}

export interface LifeEventConfig {
  type: LifeEventType;
  label: string;
  assumptions: LifeEventAssumptions;
}

export interface LifeEventImpact {
  before: {
    monthlyIncome: number;
    monthlyExpense: number;
    monthlySaving: number;
    healthScore: number;
    goalTimelineMonths: number;
  };
  after: {
    monthlyIncome: number;
    monthlyExpense: number;
    monthlySaving: number;
    healthScore: number;
    goalTimelineMonths: number;
  };
  deltas: {
    monthlySavingDelta: number;
    healthScoreDelta: number;
    goalTimelineDeltaMonths: number; // positive = longer
  };
  assumptions: LifeEventAssumptions;
  modifiedProfile: FinancialProfile;
}

// --- Affordability ---
export interface AffordabilityResult {
  affordable: boolean;
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  monthlyPayment: number;
  remainingCashFlow: number;
  debtToIncomeAfter: number; // percentage
  emergencyFundMonthsAfter: number;
  healthScoreAfter: number;
  recommendation: string;
}

// --- Loan Burden ---
export interface LoanBurdenResult {
  currentDTI: number; // percentage
  projectedDTI: number; // percentage after new loan
  monthlyPayment: number;
  totalMonthlyDebtPayment: number;
  burdenLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

// --- AI Types ---
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  timestamp?: string;
}

export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  latencyMs: number;
}

export interface ChatRequest {
  userId: string;
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  toolCalls: ToolCallRecord[];
  sessionId: string;
  insights?: string[];
  actionPlan?: ActionPlan;
}

// --- Action Plan ---
export interface ActionPlanItem {
  priority: number;
  title: string;
  description: string;
  target?: string;
  category: 'EMERGENCY_FUND' | 'SPENDING' | 'DEBT' | 'GOAL' | 'INCOME' | 'INVESTMENT';
}

export interface ActionPlan {
  items: ActionPlanItem[];
  summary: string;
}

// --- AI Insight ---
export interface AIInsight {
  id: string;
  type: 'STRENGTH' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  category: string;
  message: string;
  metric?: number;
}

// --- Dashboard ---
export interface DashboardData {
  profile: FinancialProfile;
  engineResult: FinancialEngineResult;
  insights: AIInsight[];
  actionPlan: ActionPlan;
}

// --- LLM Provider ---
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMProvider {
  name: string;
  chat(
    messages: LLMMessage[],
    options?: {
      tools?: LLMToolDefinition[];
      temperature?: number;
      model?: string;
    }
  ): Promise<LLMResponse>;
}

// --- Knowledge / RAG ---
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  version: string;
  effectiveDate: string;
  category: string;
  tags?: string[];
}

export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  score: number;
  snippet: string;
}
