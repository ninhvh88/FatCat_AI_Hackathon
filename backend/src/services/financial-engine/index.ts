import type { FinancialProfile, FinancialEngineResult } from '../../types';
import { calculateCashFlow } from './cash-flow';
import { calculateNetWorth } from './net-worth';
import { calculateDebtRatio } from './debt-ratio';
import { calculateEmergencyFund } from './emergency-fund';
import { calculateAllGoalProjections } from './goal-projection';
import { calculateFinancialHealth } from './financial-health';

// ============================================================
// Financial Engine — Aggregator
// Runs all calculators and returns a complete engine result.
// All calculations are deterministic — no LLM involved.
// ============================================================

export function calculateFinancialEngine(profile: FinancialProfile): FinancialEngineResult {
  return {
    cashFlow: calculateCashFlow(profile),
    netWorth: calculateNetWorth(profile),
    debtRatio: calculateDebtRatio(profile),
    emergencyFund: calculateEmergencyFund(profile),
    goalProjection: calculateAllGoalProjections(profile),
    financialHealth: calculateFinancialHealth(profile),
  };
}

// Re-export individual calculators
export { calculateCashFlow } from './cash-flow';
export { calculateNetWorth } from './net-worth';
export { calculateDebtRatio } from './debt-ratio';
export { calculateEmergencyFund } from './emergency-fund';
export { calculateGoalProjection, calculateAllGoalProjections } from './goal-projection';
export { calculateFinancialHealth } from './financial-health';
export { simulateScenario, applyScenario, getPredefinedScenarios } from './scenario-simulator';
export { calculateAffordability } from './affordability';
export { calculateLoanBurden } from './loan-burden';
export {
  simulateLifeEvent,
  getDefaultAssumptions,
  getLifeEventLabels,
} from './life-event';
