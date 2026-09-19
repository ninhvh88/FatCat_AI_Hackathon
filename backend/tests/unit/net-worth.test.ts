import { describe, it, expect } from 'vitest';
import { calculateNetWorth } from '../../src/services/financial-engine/net-worth';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('NetWorthCalculator', () => {
  it('should calculate correct net worth for demo profile', () => {
    const profile = createDemoProfile();
    const result = calculateNetWorth(profile);

    // cash 50M + savings 200M = 250M assets
    expect(result.totalAssets).toBe(250_000_000);
    expect(result.totalLiabilities).toBe(200_000_000);
    expect(result.netWorth).toBe(50_000_000);
  });

  it('should handle no liabilities', () => {
    const profile = createDemoProfile();
    profile.liabilities.loanBalance = 0;
    const result = calculateNetWorth(profile);

    expect(result.netWorth).toBe(250_000_000);
  });

  it('should handle all asset types', () => {
    const profile = createDemoProfile();
    profile.assets.stocks = 100_000_000;
    profile.assets.realEstate = 500_000_000;
    profile.assets.other = 50_000_000;
    const result = calculateNetWorth(profile);

    expect(result.totalAssets).toBe(900_000_000);
  });
});
