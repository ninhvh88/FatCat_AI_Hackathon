import dotenv from 'dotenv';
dotenv.config();

function required(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  app: {
    env: optional('APP_ENV', 'development'),
    port: parseInt(optional('PORT', '8080'), 10),
    corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000'),
  },
  database: {
    url: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/financial_coach'),
  },
  llm: {
    provider: optional('LLM_PROVIDER', 'mock'), // mock | openai | compatible | greennode
    apiKey: optional('LLM_API_KEY', ''),
    model: optional('LLM_MODEL', 'gpt-4o-mini'),
    baseUrl: optional('LLM_BASE_URL', 'https://api.openai.com/v1'),
    temperature: parseFloat(optional('LLM_TEMPERATURE', '0.7')),
  },
  // GreenNode AgentBase — AI Agent endpoint for AI Coach
  greennode: {
    agentUrl: optional('GREENNODE_AI_AGENT_URL', ''),
    agentApiKey: optional('GREENNODE_AI_AGENT_API_KEY', ''),
    agentTimeoutMs: parseInt(optional('GREENNODE_AI_AGENT_TIMEOUT_MS', '30000'), 10),
  },
  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
  },
  vectorDb: {
    url: optional('VECTOR_DB_URL', ''),
  },
  log: {
    level: optional('LOG_LEVEL', 'info'),
  },
};

export type Config = typeof config;
