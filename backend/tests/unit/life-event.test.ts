import { describe, it, expect } from 'vitest';
import {
  simulateLifeEvent,
  getDefaultAssumptions,
  getLifeEventLabels,
} from '../../src/services/financial-engine/life-event';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('Life Event Simulator', () => {
  const profile = createDemoProfile();

  it('should simulate having a child with increased expenses', () => {
    const result = simulateLifeEvent(profile, {
      type: 'HAVE_CHILD',
      label: 'Sinh con',
      assumptions: getDefaultAssumptions('HAVE_CHILD'),
    });

    expect(result.after.monthlyExpense).toBeGreaterThan(result.before.monthlyExpense);
    expect(result.after.monthlySaving).toBeLessThan(result.before.monthlySaving);
    expect(result.deltas.monthlySavingDelta).toBeLessThan(0);
    expect(result.assumptions.monthlyChildCost).toBe(5_000_000);
  });

  it('should simulate getting married with wedding cost', () => {
    const result = simulateLifeEvent(profile, {
      type: 'GET_MARRIED',
      label: 'Kết hôn',
      assumptions: getDefaultAssumptions('GET_MARRIED'),
    });

    expect(result.after.monthlyExpense).toBeGreaterThanOrEqual(result.before.monthlyExpense);
    expect(result.modifiedProfile.personal.maritalStatus).toBe('MARRIED');
  });

  it('should simulate job change with income increase', () => {
    const result = simulateLifeEvent(profile, {
      type: 'JOB_CHANGE',
      label: 'Đổi việc (+20%)',
      assumptions: { incomeChangePercent: 20, relocationCost: 5_000_000 },
    });

    expect(result.after.monthlyIncome).toBeGreaterThan(result.before.monthlyIncome);
    expect(result.deltas.monthlySavingDelta).toBeGreaterThan(0);
  });

  it('should simulate income loss', () => {
    const result = simulateLifeEvent(profile, {
      type: 'INCOME_LOSS',
      label: 'Mất thu nhập 6 tháng',
      assumptions: { lossDurationMonths: 6, incomeLossPercent: 100 },
    });

    expect(result.after.monthlyIncome).toBeLessThan(result.before.monthlyIncome);
    expect(result.after.monthlySaving).toBeLessThan(result.before.monthlySaving);
  });

  it('should simulate buying a house', () => {
    const result = simulateLifeEvent(profile, {
      type: 'BUY_HOUSE',
      label: 'Mua nhà 3B',
      assumptions: getDefaultAssumptions('BUY_HOUSE'),
    });

    expect(result.modifiedProfile.assets.realEstate).toBeGreaterThan(0);
    expect(result.modifiedProfile.liabilities.loanBalance).toBeGreaterThan(
      profile.liabilities.loanBalance
    );
  });

  it('should return before/after comparison with deltas', () => {
    const result = simulateLifeEvent(profile, {
      type: 'HAVE_CHILD',
      label: 'Sinh con',
      assumptions: getDefaultAssumptions('HAVE_CHILD'),
    });

    expect(result.before).toHaveProperty('monthlyIncome');
    expect(result.before).toHaveProperty('monthlyExpense');
    expect(result.before).toHaveProperty('monthlySaving');
    expect(result.before).toHaveProperty('healthScore');
    expect(result.after).toHaveProperty('monthlyIncome');
    expect(result.after).toHaveProperty('monthlyExpense');
    expect(result.after).toHaveProperty('monthlySaving');
    expect(result.after).toHaveProperty('healthScore');
    expect(result.deltas).toHaveProperty('monthlySavingDelta');
    expect(result.deltas).toHaveProperty('healthScoreDelta');
    expect(result.deltas).toHaveProperty('goalTimelineDeltaMonths');
  });

  it('should return life event labels', () => {
    const labels = getLifeEventLabels();
    expect(labels.length).toBeGreaterThanOrEqual(8);
    expect(labels[0]).toHaveProperty('type');
    expect(labels[0]).toHaveProperty('label');
    expect(labels[0]).toHaveProperty('icon');
  });

  it('should use custom assumptions', () => {
    const result = simulateLifeEvent(profile, {
      type: 'HAVE_CHILD',
      label: 'Sinh con (chi phí cao)',
      assumptions: {
        monthlyChildCost: 10_000_000,
        oneTimeCost: 30_000_000,
        incomeReductionMonths: 0,
        incomeReductionPercent: 0,
      },
    });

    // Higher child cost = bigger saving delta
    const defaultResult = simulateLifeEvent(profile, {
      type: 'HAVE_CHILD',
      label: 'Sinh con',
      assumptions: getDefaultAssumptions('HAVE_CHILD'),
    });

    expect(result.deltas.monthlySavingDelta).toBeLessThan(
      defaultResult.deltas.monthlySavingDelta
    );
  });
});
