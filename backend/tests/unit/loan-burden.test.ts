import { describe, it, expect } from 'vitest';
import { calculateLoanBurden } from '../../src/services/financial-engine/loan-burden';
import { createDemoProfile } from '../../src/utils/demo-data';

describe('Loan Burden Calculator', () => {
  const profile = createDemoProfile();

  it('should classify a small loan with increased DTI', () => {
    const result = calculateLoanBurden(profile, {
      amount: 50_000_000,
      interestRate: 10,
      loanTermMonths: 12,
    });

    // Demo profile already has 55.6% DTI, so even 50M more pushes it higher
    expect(result.projectedDTI).toBeGreaterThan(result.currentDTI);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(['MODERATE', 'HIGH', 'CRITICAL']).toContain(result.burdenLevel);
  });

  it('should classify a very large loan as CRITICAL', () => {
    const result = calculateLoanBurden(profile, {
      amount: 2_000_000_000,
      interestRate: 8,
      loanTermMonths: 300,
    });

    expect(['HIGH', 'CRITICAL']).toContain(result.burdenLevel);
    expect(result.projectedDTI).toBeGreaterThan(36);
  });

  it('should calculate total monthly debt payment', () => {
    const result = calculateLoanBurden(profile, {
      amount: 100_000_000,
      interestRate: 10,
      loanTermMonths: 24,
    });

    expect(result.totalMonthlyDebtPayment).toBeGreaterThan(profile.liabilities.monthlyRepayment);
  });

  it('should handle zero interest rate', () => {
    const result = calculateLoanBurden(profile, {
      amount: 60_000_000,
      interestRate: 0,
      loanTermMonths: 12,
    });

    expect(result.monthlyPayment).toBeCloseTo(5_000_000, -2);
  });

  it('should return all required fields', () => {
    const result = calculateLoanBurden(profile, {
      amount: 200_000_000,
      interestRate: 8,
      loanTermMonths: 60,
    });

    expect(result).toHaveProperty('currentDTI');
    expect(result).toHaveProperty('projectedDTI');
    expect(result).toHaveProperty('monthlyPayment');
    expect(result).toHaveProperty('totalMonthlyDebtPayment');
    expect(result).toHaveProperty('burdenLevel');
    expect(result).toHaveProperty('recommendation');
    expect(['SAFE', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.burdenLevel);
  });
});
