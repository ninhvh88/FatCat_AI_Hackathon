// Shared types matching backend

export interface Personal {
  age: number;
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  dependents: number;
  location?: string;
}

export interface Income {
  monthlyIncome: number;
  otherIncome: number;
  bonus?: number;
}

export interface Expenses {
  housing: number;
  food: number;
  transportation: number;
  family: number;
  entertainment: number;
  other: number;
  education?: number;
  healthcare?: number;
  recurring?: number;
}

export interface Assets {
  cash: number;
  savings: number;
  stocks: number;
  realEstate: number;
  other: number;
}

export interface Liabilities {
  loanBalance: number;
  interestRate: number;
  monthlyRepayment: number;
  mortgage?: number;
  consumerLoans?: number;
  creditCards?: number;
  otherDebt?: number;
}

export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export interface RiskProfile {
  tolerance: RiskTolerance;
  horizon: number;
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface FinancialGoal {
  id?: string;
  goalType: string;
  goalName: string;
  targetAmount: number;
  targetDate: string;
  currentAllocated?: number;
  monthlyContribution?: number;
  priority?: number;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'PLANNING';
}

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
}

export interface CashFlowResult {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyFreeCashFlow: number;
  savingRate: number;
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface DebtRatioResult {
  debtToIncome: number;
  debtToAsset: number;
  monthlyRepaymentToIncome: number;
}

export interface EmergencyFundResult {
  emergencyFundBalance: number;
  emergencyFundMonths: number;
  recommendedFund: number;
  shortfall: number;
}

export interface GoalProjectionResult {
  goalName: string;
  targetAmount: number;
  currentSavings: number;
  monthlySavingCapacity: number;
  monthsToTarget: number;
  expectedSavings: number;
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
  totalScore: number;
  rating: string;
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

export interface AIInsight {
  id: string;
  type: 'STRENGTH' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  category: string;
  message: string;
  metric?: number;
}

export interface ActionPlanItem {
  priority: number;
  title: string;
  description: string;
  target?: string;
  category: string;
}

export interface ActionPlan {
  items: ActionPlanItem[];
  summary: string;
}

export interface DashboardData {
  profile: FinancialProfile;
  engineResult: FinancialEngineResult;
  insights: AIInsight[];
  actionPlan: ActionPlan;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  timestamp?: string;
}

export interface ChatResponse {
  message: string;
  toolCalls: any[];
  sessionId: string;
  insights?: string[];
  actionPlan?: ActionPlan;
}

export type ChatStreamEvent =
  | { type: 'thinking'; message: string }
  | { type: 'tools'; toolCalls: any[] }
  | { type: 'delta'; content: string }
  | { type: 'done'; message: string; toolCalls: any[]; sessionId: string; actionPlan?: ActionPlan }
  | { type: 'error'; message: string };

export interface ScenarioConfig {
  type: string;
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
    goalDateDelta: number;
    savingRateDelta: number;
    healthScoreDelta: number;
  };
}

// --- Life Event Types ---
export type LifeEventType =
  | 'HAVE_CHILD' | 'GET_MARRIED' | 'BUY_HOUSE' | 'BUY_CAR'
  | 'JOB_CHANGE' | 'INCOME_LOSS' | 'START_BUSINESS' | 'MOVE';

export interface LifeEventTypeInfo {
  type: LifeEventType;
  label: string;
  icon: string;
  defaultAssumptions: Record<string, number>;
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
    goalTimelineDeltaMonths: number;
  };
  assumptions: Record<string, number>;
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
  debtToIncomeAfter: number;
  emergencyFundMonthsAfter: number;
  healthScoreAfter: number;
  recommendation: string;
}

// --- Loan Burden ---
export interface LoanBurdenResult {
  currentDTI: number;
  projectedDTI: number;
  monthlyPayment: number;
  totalMonthlyDebtPayment: number;
  burdenLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}
