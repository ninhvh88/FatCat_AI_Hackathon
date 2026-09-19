# AI Financial Coach — Architecture Analysis & Migration Plan

> **Phase 0 deliverable.** This document analyzes the existing codebase, identifies
> capabilities and limitations, defines the target architecture, and provides a
> phased migration plan. No code changes were made during this analysis.

---

## 1. Current Architecture

### 1.1 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Node.js + Express + TypeScript | Node 20, ES2022, CommonJS |
| ORM | Prisma | PostgreSQL provider |
| Frontend | React + TypeScript + Vite | React 18, Vite 6 |
| Styling | TailwindCSS 3.4 + Inter font | — |
| Charts | Recharts 2.15 | RadialBar, Bar charts |
| AI | Custom orchestrator + 3 LLM providers | Mock / OpenAI / Compatible |
| Database | PostgreSQL 16 | 8 Prisma models |
| Tests | Vitest | 7 unit + 1 integration (35 tests) |
| Deploy | Docker Compose + GreenNode AgentBase | Single combined image |

### 1.2 Backend Structure

```
backend/src/
├── index.ts                    # Express app, static file serving, SPA fallback
├── config/env.ts               # Env var loader
├── db/prisma.ts                # Prisma client singleton
├── types/index.ts              # All domain & API types (293 lines)
├── utils/demo-data.ts          # Demo persona + aggregation helpers + formatVND
├── middleware/                 # logger (correlationId), error-handler
├── routes/                     # 7 route files (profile, dashboard, health, goals, scenarios, ai, insights)
└── services/
    ├── financial-engine/       # 7 deterministic calculators + aggregator
    ├── ai/
    │   ├── orchestrator.ts     # 6-phase chat flow
    │   ├── guardrails.ts       # Input sanitization + output filtering
    │   ├── tools/              # 7 LLM-callable financial tools
    │   └── providers/          # Mock / OpenAI / Compatible LLM providers
    ├── rag/                    # Knowledge base (6 docs) + keyword search
    ├── insight.service.ts      # 5 rule-based insights
    └── action-plan.service.ts  # Prioritized action plan
```

### 1.3 Frontend Structure

```
frontend/src/
├── main.tsx + App.tsx          # Router + Navbar + health banner
├── api/index.ts                # Axios client, ~15 endpoint functions (7 unused)
├── types/index.ts              # Mirror of backend types (181 lines)
├── utils/format.ts             # VND/percent formatters + color helpers
├── components/
│   ├── Navbar.tsx              # Sticky nav, no mobile menu
│   └── Charts.tsx              # Recharts re-exports + ProgressView
└── pages/
    ├── Landing.tsx             # Marketing hero
    ├── Onboarding.tsx          # Demo vs manual choice
    ├── Profile.tsx             # Manual financial data form
    ├── Dashboard.tsx           # Health score + cash flow + insights + action plan
    ├── Goals.tsx               # Goal projections with 3 scenarios
    ├── Scenarios.tsx           # Predefined scenario multi-select + comparison
    └── Coach.tsx               # AI chat + tool call visibility + action plan sidebar
```

### 1.4 Database Schema (8 models)

```
User ──┬── FinancialProfile ──┬── FinancialGoal
       │                       └── ScenarioRecord
       ├── ChatSession ──────── ChatMessage
       └── FinancialInsight

KnowledgeDocument (standalone RAG)
AiInteractionLog (observability, unused)
```

### 1.5 Financial Engine (7 calculators)

| Calculator | Function | Output |
|-----------|----------|--------|
| Cash Flow | `calculateCashFlow(profile)` | income, expense, freeCashFlow, savingRate |
| Net Worth | `calculateNetWorth(profile)` | totalAssets, totalLiabilities, netWorth |
| Debt Ratio | `calculateDebtRatio(profile)` | debtToIncome, debtToAsset, repaymentToIncome |
| Emergency Fund | `calculateEmergencyFund(profile)` | balance, months, recommended, shortfall |
| Goal Projection | `calculateGoalProjection(profile, goal)` | requiredSaving, fundingGap, isAchievable, progress |
| Financial Health | `calculateFinancialHealth(profile)` | totalScore (0-100), 5-component breakdown, rating |
| Scenario Simulator | `simulateScenario(profile, config)` | modifiedProfile, engineResult, comparison deltas |

All calculators are **pure, deterministic functions** — no LLM involvement. ✅

### 1.6 AI Flow (6-phase orchestrator)

```
User Message
    ↓
1. Sanitize input (prompt injection removal)
2. LLM call with tool definitions → tool calls
3. Execute tool calls (financial engine functions)
4. Generate response (mock: rule-based / real LLM: explain tool results)
5. Enforce guardrails (forbidden phrase replacement)
6. RAG augmentation (if educational question) + action plan (if requested)
```

### 1.7 AI Tools (7 LLM-callable)

| Tool | Purpose |
|------|---------|
| `getFinancialProfile` | Returns raw profile |
| `calculateCashFlow` | Returns cash flow metrics |
| `calculateFinancialHealth` | Returns health score + breakdown |
| `calculateGoalProjection` | Returns all goal projections |
| `simulateScenario` | Runs a scenario simulation |
| `getFinancialInsights` | Returns 5 rule-based insights |
| `generateActionPlan` | Returns prioritized action plan |

---

## 2. Current User Journey

```
Landing → Onboarding → (Load Demo | Manual Profile)
    ↓
Dashboard (health score, cash flow, net worth, emergency fund, goals, insights, action plan)
    ↓
Goals (view goal projections with 3 saving scenarios)
    ↓
Scenarios (select predefined scenarios → simulate → compare table + chart)
    ↓
Coach (chat with AI → see tool calls → get action plan)
```

**Demo persona:** Nguyễn Minh Anh, 28, income 30M, expenses 18M, savings 200M, loan 200M @ 10%, goal: buy house 3B in 5 years.

---

## 3. Existing Capabilities ✅

1. **Financial profile** — full CRUD + demo persona with all required fields
2. **Deterministic financial engine** — 7 calculators, all pure functions, well-tested
3. **Financial health score** — 5-component explainable score (0-100) with recommendations
4. **Dashboard** — health gauge, cash flow, net worth, emergency fund, goals, insights, action plan
5. **Goal projection** — compound interest modeling, required monthly saving, funding gap, feasibility
6. **Scenario simulator** — 8 scenario types (income change, new child, buy car/house, etc.) with before/after comparison
7. **AI chat with tool calling** — 7 tools, guardrails, RAG, action plan generation
8. **Proactive insights** — 5 rule-based insights (strength, warning, opportunity, cash flow, debt)
9. **Action plan** — prioritized recommendations based on weakest health components
10. **RAG** — 6 Vietnamese financial education documents with keyword search
11. **Guardrails** — prompt injection filtering, forbidden phrase replacement, hedging language
12. **Multi-provider LLM** — Mock (no API key), OpenAI, Compatible (GreenNode/vLLM)
13. **Docker deployment** — Docker Compose (3 containers) + GreenNode AgentBase (live)
14. **Tests** — 35 tests (7 unit calculator tests + 1 integration API test)

---

## 4. Existing Limitations

### 4.1 Architecture

| # | Limitation | Impact |
|---|-----------|--------|
| L1 | **No multi-agent architecture** — single orchestrator handles all intents | Hard to scale AI capabilities, no specialized agents |
| L2 | **No intent routing/supervisor** — mock provider uses keyword matching | Fragile routing, can't distinguish nuanced intents |
| L3 | **No structured observability** — `AiInteractionLog` model exists but is never written | Can't monitor AI behavior, tool usage, latency |
| L4 | **No auth/session** — only `localStorage.userId` | No real authentication, no multi-user |
| L5 | **Dead code** — 7 unused API client functions, unused `lucide-react`/`clsx` deps | Maintenance burden |

### 4.2 Financial Profile

| # | Limitation | Impact |
|---|-----------|--------|
| L6 | **No risk profile** — no risk tolerance, investment horizon | Can't personalize investment advice |
| L7 | **Limited expense categories** — no education, healthcare, recurring | Missing spec-required categories |
| L8 | **Flat liability model** — single loan, no mortgage/consumer/credit card separation | Can't model complex debt situations |
| L9 | **No location field** in Personal | Can't factor regional cost of living |

### 4.3 Financial Engine

| # | Limitation | Impact |
|---|-----------|--------|
| L10 | **No affordability calculator** — can't assess "can I afford X?" | Missing key what-if capability |
| L11 | **No loan burden calculator** — DTI exists but no forward-looking burden projection | Can't model loan payoff scenarios |
| L12 | **No savings rate simulator** — can't model "what if I save X% more?" | Missing common what-if |
| L13 | **Fixed 5% assumed return** — no configurable return rate | Unrealistic for conservative/aggressive profiles |

### 4.4 Scenario Simulator

| # | Limitation | Impact |
|---|-----------|--------|
| L14 | **No interactive sliders** — scenarios use fixed predefined params | Poor what-if UX, not interactive |
| L15 | **No trade-off labels** — can't label scenarios as Safe/Balanced/Aggressive | Can't present trade-offs clearly |
| L16 | **No editable assumptions** — users can't see/modify simulation assumptions | Black-box simulation |
| L17 | **No life event as first-class UX** — `NEW_CHILD` exists but no dedicated life event simulator | Missing key demo feature |

### 4.5 Health Score

| # | Limitation | Impact |
|---|-----------|--------|
| L18 | **No drill-down** — can't click a dimension to see details, thresholds, actions | Score feels opaque despite being explainable in data |

### 4.6 Insights

| # | Limitation | Impact |
|---|-----------|--------|
| L19 | **No trend detection** — insights are static (no spending trend analysis) | Can't detect "restaurant spending increased 27%" |
| L20 | **No proactive notification** — insights only show on dashboard, no push | Not truly "proactive" |

### 4.7 Frontend

| # | Limitation | Impact |
|---|-----------|--------|
| L21 | **No state management** — each page fetches independently, no caching | Slow navigation, no optimistic updates |
| L22 | **No goal CRUD UI** — goals are read-only in UI | Can't create/edit goals |
| L23 | **No mobile menu** — nav links disappear on mobile | Broken mobile UX |
| L24 | **No 404 route** | Unhandled routes show blank |
| L25 | **No frontend tests** | UI regressions undetected |
| L26 | **No loading skeletons** — just "Đang tải..." text | Poor perceived performance |

### 4.8 RAG

| # | Limitation | Impact |
|---|-----------|--------|
| L27 | **Keyword-based search** — no semantic/vector search | Poor retrieval quality |
| L28 | **No bank product knowledge** — only general financial education | Can't answer product-specific questions |
| L29 | **No citations** — knowledge snippets appended without source attribution | Trust issues |

---

## 5. Recommended Target Architecture

### 5.1 Multi-Agent with Supervisor

```
User Message
    ↓
Supervisor (intent classification + agent selection)
    ↓
┌────────────┬──────────────┬────────────────┬───────────┐
│ Profile    │ Cashflow     │ Scenario       │ Coach     │
│ Agent      │ Agent        │ Agent          │ Agent     │
└────────────┴──────────────┴────────────────┴───────────┘
    ↓
Financial Engine (deterministic calculations)
    ↓
Structured Result → LLM Explanation → Guardrails → Response
```

The supervisor classifies intent and selects only the relevant agent(s).
Each agent has specialized tools and prompts. The financial engine remains
the single source of truth for all calculations.

### 5.2 Enhanced Financial Profile

```
FinancialProfile
├── Personal (add: location)
├── Income (add: bonus)
├── Expenses (add: education, healthcare, recurring)
├── Assets (rename: deposits→savings, securities→stocks)
├── Liabilities (split: mortgage, consumerLoans, creditCards, otherDebt)
├── Goals (add: priority, status, monthlyContribution)
└── RiskProfile (NEW: tolerance, horizon, experience)
```

### 5.3 Enhanced Financial Engine

New calculators to add:
- `calculateAffordability(profile, purchase)` — can user afford a purchase?
- `calculateLoanBurden(profile, newLoan)` — forward-looking DTI after new loan
- `simulateSavingsRateChange(profile, newRate)` — what if save X% more?
- `simulateLifeEvent(profile, event)` — structured life event simulation with editable assumptions

### 5.4 Interactive Scenario Simulator

- Slider-based parameter control (house price, down payment, rate, term)
- Real-time recalculation as sliders move
- Scenario comparison with trade-off labels (Safe / Balanced / Aggressive)
- Editable assumptions panel

### 5.5 Explainable Health Score

- Click any dimension → modal with: current value, reference range, why at this level, affecting factors, improvement actions
- Clear disclaimer: "internal financial-health indicator, not absolute truth"

### 5.6 Proactive Insight Engine

- Spending trend detection (if historical data available)
- Goal pace analysis (ahead/behind target)
- Debt trajectory warning
- Emergency fund adequacy over time

---

## 6. Migration Plan (Phased)

### Phase 1 — Financial Profile Enhancement
**Goal:** Richer profile data model

- Add `RiskProfile` type + `location` to Personal
- Add expense categories: `education`, `healthcare`, `recurring`
- Split liabilities into: `mortgage`, `consumerLoans`, `creditCards`, `otherDebt`
- Add `priority`, `status`, `monthlyContribution` to goals
- Update Prisma schema + migration
- Update demo persona with new fields
- **Reuse:** Existing `FinancialProfile` type, `demo-data.ts`, all calculators (they use subset of fields)
- **Risk:** Breaking change to existing API consumers — mitigate with backward-compatible defaults

### Phase 2 — Financial Engine Enhancement
**Goal:** New calculators + configurable return rate

- Add `calculateAffordability`, `calculateLoanBurden`, `simulateSavingsRateChange`
- Make `ASSUMED_ANNUAL_RETURN` configurable per profile/goal
- Add unit tests for all new calculators
- **Reuse:** Existing calculator pattern (pure functions, same output structure)
- **Risk:** None — additive changes only

### Phase 3 — Dashboard → Financial Cockpit
**Goal:** Enhanced dashboard with explainable health score

- Add health score drill-down modal (click dimension → details)
- Add debt-to-income ratio card
- Add active goals summary
- Improve loading states (skeletons)
- **Reuse:** Existing Dashboard component, Charts, all engine data
- **Risk:** UI regression — mitigate by preserving existing layout structure

### Phase 4 — Scenario Engine Upgrade
**Goal:** Interactive sliders + life events + trade-off labels

- Add slider-based parameter control to Scenarios page
- Add real-time recalculation
- Add life event simulator (dedicated section/modal)
- Add trade-off labels (Safe/Balanced/Aggressive) to comparison
- Add editable assumptions panel
- **Reuse:** Existing `simulateScenario` engine function, `ScenarioResult` type
- **Risk:** Significant UI change — mitigate by keeping existing predefined scenarios as presets

### Phase 5 — Multi-Agent AI Coach
**Goal:** Supervisor + specialized agents

- Add intent classifier (keyword-based for mock, LLM-based for real providers)
- Create agent definitions: Profile, Cashflow, Scenario, Goal, Coach
- Each agent has specialized tools and system prompts
- Supervisor selects agent(s) based on classified intent
- **Reuse:** Existing orchestrator (refactor into supervisor), existing tools, existing guardrails
- **Risk:** AI behavior change — mitigate by keeping mock provider working without API key

### Phase 6 — Proactive Insights + Action Plan
**Goal:** Richer insights + better action plans

- Add goal pace analysis (ahead/behind target)
- Add debt trajectory projection
- Add emergency fund trend (if historical data)
- Enhance action plan with time-bound targets
- Add "why this action" explanation to each action plan item
- **Reuse:** Existing `insight.service.ts`, `action-plan.service.ts`
- **Risk:** None — additive changes

### Phase 7 — RAG + Knowledge Enhancement
**Goal:** Better retrieval + bank product knowledge

- Add more knowledge documents (bank products, fees, policies)
- Add source citations to RAG responses
- Improve search (TF-IDF scoring or simple semantic matching)
- **Reuse:** Existing `knowledge-base.ts`, `knowledge-service.ts`
- **Risk:** None — additive changes

### Phase 8 — UI Polish
**Goal:** Production-quality UX

- Add mobile responsive menu
- Add 404 route
- Add loading skeletons
- Add error boundaries
- Add empty states
- Improve chart styling
- Add goal CRUD UI
- Remove dead code (unused API functions, unused deps)
- **Reuse:** Existing components, Tailwind classes
- **Risk:** None — cosmetic improvements

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing API contract | Medium | High | Backward-compatible defaults, version endpoints |
| Mock provider behavior change | Low | Medium | Keep mock working without API key |
| Prisma migration on existing data | Low | Medium | Additive columns with defaults |
| Frontend state management refactor | Medium | Medium | Use React Context (lightweight, no new deps) |
| Test coverage gaps in new code | Medium | Low | Add tests alongside each phase |
| GreenNode deployment image size | Low | Low | Combined image already works, monitor size |

---

## 8. Technical Debt

| # | Debt | Priority | Phase |
|---|------|----------|-------|
| TD1 | 7 unused API client functions | Low | Phase 8 |
| TD2 | `lucide-react` and `clsx` installed but unused | Low | Phase 8 |
| TD3 | `any` types in frontend (Goals, Scenarios, toolCalls) | Medium | Phase 3-4 |
| TD4 | `DEMO_USER_ID` hardcoded in 8 files | Medium | Phase 8 |
| TD5 | `AiInteractionLog` model exists but never populated | Medium | Phase 5 |
| TD6 | No frontend tests | Medium | Phase 8 |
| TD7 | No 404 route | Low | Phase 8 |
| TD8 | No mobile menu | Medium | Phase 8 |
| TD9 | `healthApi`, `insightsApi`, `knowledgeApi` never imported | Low | Phase 8 |
| TD10 | RAG search is keyword-only (no semantic) | Low | Phase 7 |

---

## 9. Reuse / Refactor / Create Matrix

### Files to REUSE (no changes needed)

| File | Why |
|------|-----|
| `backend/src/services/financial-engine/cash-flow.ts` | Pure function, well-tested |
| `backend/src/services/financial-engine/net-worth.ts` | Pure function, well-tested |
| `backend/src/services/financial-engine/debt-ratio.ts` | Pure function, well-tested |
| `backend/src/services/financial-engine/emergency-fund.ts` | Pure function, well-tested |
| `backend/src/services/financial-engine/goal-projection.ts` | Pure function, well-tested (may add configurable return) |
| `backend/src/services/financial-engine/financial-health.ts` | Pure function, well-tested |
| `backend/src/services/financial-engine/scenario-simulator.ts` | Reuse `applyScenario` + `simulateScenario` |
| `backend/src/services/ai/guardrails.ts` | Works well, minimal changes |
| `backend/src/services/ai/providers/llm-providers.ts` | Provider abstraction works |
| `backend/src/services/rag/knowledge-base.ts` | Add more docs, keep structure |
| `backend/src/middleware/*` | Logger + error handler work fine |
| `backend/src/utils/demo-data.ts` | Extend demo persona, keep helpers |
| `frontend/src/utils/format.ts` | Formatters work well |
| `frontend/src/components/Charts.tsx` | Recharts wrapper works |

### Files to REFACTOR (modify existing)

| File | Changes | Phase |
|------|---------|-------|
| `backend/src/types/index.ts` | Add RiskProfile, expand Expenses/Liabilities/Goal | 1 |
| `backend/prisma/schema.prisma` | Add new fields, additive migration | 1 |
| `backend/src/utils/demo-data.ts` | Update demo persona with new fields | 1 |
| `backend/src/services/financial-engine/index.ts` | Add new calculators to aggregator | 2 |
| `backend/src/services/ai/orchestrator.ts` | Refactor into supervisor + agents | 5 |
| `backend/src/services/ai/tools/financial-tools.ts` | Add new tools, reorganize by agent | 5 |
| `backend/src/services/insight.service.ts` | Add trend/pace insights | 6 |
| `backend/src/services/action-plan.service.ts` | Add "why" explanations | 6 |
| `backend/src/routes/scenarios.routes.ts` | Add life event endpoint | 4 |
| `frontend/src/types/index.ts` | Mirror backend type changes | 1 |
| `frontend/src/api/index.ts` | Add new endpoints, remove dead code | 4, 8 |
| `frontend/src/pages/Dashboard.tsx` | Add drill-down, DTI, skeletons | 3 |
| `frontend/src/pages/Scenarios.tsx` | Add sliders, life events, trade-offs | 4 |
| `frontend/src/pages/Coach.tsx` | Show agent selection, improved UX | 5 |
| `frontend/src/components/Navbar.tsx` | Add mobile menu | 8 |
| `frontend/src/App.tsx` | Add 404 route, context provider | 8 |

### Files to CREATE (new)

| File | Purpose | Phase |
|------|---------|-------|
| `backend/src/services/financial-engine/affordability.ts` | Affordability calculator | 2 |
| `backend/src/services/financial-engine/loan-burden.ts` | Loan burden projection | 2 |
| `backend/src/services/financial-engine/life-event.ts` | Life event simulator with assumptions | 4 |
| `backend/src/services/ai/agents/supervisor.ts` | Intent classification + agent routing | 5 |
| `backend/src/services/ai/agents/profile-agent.ts` | Profile-specific agent | 5 |
| `backend/src/services/ai/agents/cashflow-agent.ts` | Cash flow agent | 5 |
| `backend/src/services/ai/agents/scenario-agent.ts` | Scenario agent | 5 |
| `backend/src/services/ai/agents/coach-agent.ts` | Coach agent | 5 |
| `backend/src/services/ai/intent-classifier.ts` | Intent classification logic | 5 |
| `backend/src/routes/life-events.routes.ts` | Life event API | 4 |
| `backend/tests/unit/affordability.test.ts` | Tests | 2 |
| `backend/tests/unit/loan-burden.test.ts` | Tests | 2 |
| `backend/tests/unit/life-event.test.ts` | Tests | 4 |
| `backend/tests/unit/intent-classifier.test.ts` | Tests | 5 |
| `frontend/src/components/ScenarioSlider.tsx` | Interactive slider control | 4 |
| `frontend/src/components/HealthScoreDrilldown.tsx` | Health score detail modal | 3 |
| `frontend/src/components/LifeEventModal.tsx` | Life event simulator UI | 4 |
| `frontend/src/components/LoadingSkeleton.tsx` | Skeleton loading states | 8 |
| `frontend/src/pages/LifeEvents.tsx` | Life event simulator page | 4 |
| `frontend/src/context/ProfileContext.tsx` | Shared profile state | 8 |

---

## 10. Success Criteria

The upgrade is complete when:

1. ✅ Financial profile includes risk profile + expanded expense/liability categories
2. ✅ Financial engine has affordability, loan burden, and life event calculators
3. ✅ Dashboard shows financial cockpit with explainable, drill-down health score
4. ✅ Scenario simulator has interactive sliders + trade-off labels + editable assumptions
5. ✅ Life event simulator is a first-class feature with before/after comparison
6. ✅ AI uses multi-agent architecture with supervisor-based intent routing
7. ✅ Proactive insights include goal pace + debt trajectory analysis
8. ✅ Action plan items explain "why" each action is recommended
9. ✅ RAG includes bank product knowledge with citations
10. ✅ UI is mobile-responsive with loading skeletons + error states
11. ✅ All new calculators have unit tests
12. ✅ Existing 35 tests still pass
13. ✅ Demo journey works end-to-end: Dashboard → Insight → "Nếu có con?" → Simulation → Action Plan

---

## 11. Non-Goals

To keep the upgrade focused, the following are explicitly **out of scope**:

- Real authentication / OAuth (keep localStorage userId)
- Real-time data feeds / banking integration
- Historical transaction data (no spending trend from real data)
- Investment portfolio management
- Tax calculation
- Insurance recommendations
- Multi-currency support
- Internationalization (keep Vietnamese)
- Push notifications / email
- Admin panel
- Rate limiting / API gateway
