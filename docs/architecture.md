# Architecture — AI Financial Coach

## Overview

AI Financial Coach is a full-stack web application that helps users understand their financial health, plan goals, simulate scenarios, and receive AI-powered financial coaching.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER (Browser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
┌────────────────────────▼────────────────────────────────────┐
│              FRONTEND (React + Vite + Tailwind)             │
│                                                              │
│  Landing → Onboarding → Dashboard → Goals → Scenarios → Coach│
│                                                              │
│  Components: Navbar, Charts (Recharts), Cards, Chat UI       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (/api/*)
┌────────────────────────▼────────────────────────────────────┐
│           BACKEND (Node.js + Express + TypeScript)          │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Routes     │  │  Middleware   │  │    Services        │  │
│  │              │  │  (CORS,       │  │                    │  │
│  │  /profile    │  │   Helmet,     │  │  Financial Engine  │  │
│  │  /dashboard  │  │   Logger,     │  │  (deterministic)   │  │
│  │  /goals      │  │   Correlation)│  │                    │  │
│  │  /scenarios  │  └──────────────┘  │  AI Orchestrator   │  │
│  │  /ai/chat    │                    │  (tool calling)     │  │
│  │  /insights   │                    │                    │  │
│  └──────┬───────┘                    │  RAG / Knowledge   │  │
│         │                            └─────────┬──────────┘  │
│         │                                      │             │
│  ┌──────▼───────┐                ┌─────────────▼──────────┐  │
│  │   Prisma ORM  │                │   LLM Provider Abstraction│
│  └──────┬───────┘                │  (Mock/OpenAI/Compatible) │
│         │                        └──────────────────────────┘  │
└─────────┼─────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│              PostgreSQL (via Docker)                        │
│  users, financial_profiles, financial_goals, scenarios,     │
│  financial_insights, chat_sessions, chat_messages,          │
│  knowledge_documents, ai_interaction_logs                   │
└─────────────────────────────────────────────────────────────┘
```

## AI Architecture (Tool Calling Flow)

```
User Question
     ↓
AI Orchestrator
     ↓
┌────────────────────────────────────┐
│  1. Sanitize Input (Guardrails)    │
│  2. Build System Prompt            │
│  3. Call LLM with Tool Definitions │
│  4. Execute Tool Calls             │
│  5. Generate Response from Results │
│  6. Enforce Guardrails on Output   │
│  7. RAG Knowledge Search (if edu)  │
│  8. Generate Action Plan (if asked)│
└────────────────────────────────────┘
     ↓
Response (with real calculated values)
```

### Financial Tools (LLM calls these, does NOT calculate itself)

| Tool | Description |
|------|-------------|
| `getFinancialProfile()` | Returns current profile |
| `calculateCashFlow()` | Monthly income/expense/free cash flow |
| `calculateFinancialHealth()` | 0-100 score with breakdown |
| `calculateGoalProjection()` | Goal feasibility analysis |
| `simulateScenario()` | What-if scenario simulation |
| `getFinancialInsights()` | Strengths, warnings, opportunities |
| `generateActionPlan()` | Prioritized action items |

## Financial Engine (Deterministic)

All financial calculations are performed by the backend Financial Engine — NOT the LLM.

| Calculator | Output |
|-----------|--------|
| CashFlowCalculator | monthlyFreeCashFlow, savingRate |
| NetWorthCalculator | totalAssets - totalLiabilities |
| DebtRatioCalculator | debtToIncome, debtToAsset |
| EmergencyFundCalculator | months covered, shortfall |
| GoalProjectionCalculator | fundingGap, requiredMonthlySaving, estimatedDate |
| FinancialHealthCalculator | 0-100 score (Cash Flow 25% + Emergency 20% + Debt 20% + Savings 15% + Goal 20%) |
| ScenarioSimulator | 7 predefined scenarios, combinable |

## LLM Provider Abstraction

```
LLMProvider (interface)
  ├── MockLLMProvider     — rule-based, no API key needed
  ├── OpenAIProvider      — OpenAI API
  └── CompatibleLLMProvider — any OpenAI-compatible endpoint
```

Configured via `LLM_PROVIDER` environment variable.

## Key Design Decisions

1. **Financial calculations are deterministic** — LLM never calculates money
2. **AI uses tool calling** — LLM selects tools, engine computes, LLM explains
3. **Mock mode** — works without LLM API key for demo
4. **Demo persona** — one-click load for presentations
5. **Guardrails** — hedging language, no guarantees, sanitized prompts
