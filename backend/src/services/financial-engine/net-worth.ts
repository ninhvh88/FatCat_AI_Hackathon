import type { FinancialProfile, NetWorthResult } from '../../types';
import { totalAssets, totalLiabilities } from '../../utils/demo-data';

// ============================================================
// Net Worth Calculator
// totalAssets - totalLiabilities
// ============================================================

export function calculateNetWorth(profile: FinancialProfile): NetWorthResult {
  const ta = totalAssets(profile);
  const tl = totalLiabilities(profile);

  return {
    totalAssets: ta,
    totalLiabilities: tl,
    netWorth: ta - tl,
  };
}
