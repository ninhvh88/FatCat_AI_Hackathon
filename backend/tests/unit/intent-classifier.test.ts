import { describe, it, expect } from 'vitest';
import { classifyIntent, intentToAgent, getToolsForAgent } from '../../src/services/ai/intent-classifier';

describe('Intent Classifier', () => {
  it('should classify goal queries', () => {
    const result = classifyIntent('Tôi muốn mua nhà 3 tỷ trong 5 năm');
    expect(result.intent).toBe('GOAL_QUERY');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify life event queries', () => {
    const result = classifyIntent('Nếu năm sau tôi có con thì sao?');
    // "nếu" matches SCENARIO_QUERY and "có con" matches LIFE_EVENT_QUERY
    // Both are valid — the mock provider handles life event detection separately
    expect(['LIFE_EVENT_QUERY', 'SCENARIO_QUERY']).toContain(result.intent);
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('should classify health queries', () => {
    const result = classifyIntent('Sức khỏe tài chính của tôi như thế nào?');
    expect(result.intent).toBe('HEALTH_QUERY');
  });

  it('should classify debt queries', () => {
    const result = classifyIntent('Tôi nên trả nợ hay tiết kiệm?');
    expect(result.intent).toBe('DEBT_QUERY');
  });

  it('should classify action plan queries', () => {
    const result = classifyIntent('Tạo kế hoạch hành động cho tôi');
    expect(result.intent).toBe('ACTION_PLAN_QUERY');
  });

  it('should classify educational queries', () => {
    const result = classifyIntent('Tài chính cá nhân là gì?');
    expect(result.intent).toBe('EDUCATIONAL_QUERY');
  });

  it('should classify scenario queries', () => {
    const result = classifyIntent('Nếu thu nhập tăng 20% thì sao?');
    expect(['SCENARIO_QUERY', 'LIFE_EVENT_QUERY']).toContain(result.intent);
  });

  it('should fall back to general query', () => {
    const result = classifyIntent('Hello');
    expect(result.intent).toBe('GENERAL_QUERY');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should map intents to agents correctly', () => {
    expect(intentToAgent('PROFILE_QUERY')).toBe('profile');
    expect(intentToAgent('CASHFLOW_QUERY')).toBe('cashflow');
    expect(intentToAgent('HEALTH_QUERY')).toBe('cashflow');
    expect(intentToAgent('DEBT_QUERY')).toBe('cashflow');
    expect(intentToAgent('GOAL_QUERY')).toBe('scenario');
    expect(intentToAgent('SCENARIO_QUERY')).toBe('scenario');
    expect(intentToAgent('LIFE_EVENT_QUERY')).toBe('scenario');
    expect(intentToAgent('ACTION_PLAN_QUERY')).toBe('coach');
    expect(intentToAgent('GENERAL_QUERY')).toBe('coach');
  });

  it('should return relevant tools for each agent', () => {
    expect(getToolsForAgent('profile')).toContain('getFinancialProfile');
    expect(getToolsForAgent('cashflow')).toContain('calculateCashFlow');
    expect(getToolsForAgent('scenario')).toContain('simulateScenario');
    expect(getToolsForAgent('coach')).toContain('generateActionPlan');
  });
});
