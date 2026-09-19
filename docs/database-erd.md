# Database ERD — AI Financial Coach

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
│    users     │     │  financial_profiles       │     │  financial_goals  │
├──────────────┤     ├──────────────────────────┤     ├──────────────────┤
│ PK id        │◄───┐│ PK id                    │◄───┐│ PK id            │
│    email     │    └│ FK user_id               │    └│ FK profile_id    │
│    name      │      │    age                   │      │    goal_type     │
│    created_at│      │    marital_status        │      │    goal_name     │
│    updated_at│      │    dependents            │      │    target_amount │
└──────┬───────┘      │    monthly_income        │      │    target_date   │
       │              │    other_income          │      │    current_alloc │
       │              │    housing/food/transport│      │    created_at    │
       │              │    family/entertainment   │      │    updated_at    │
       │              │    other_expense         │      └──────────────────┘
       │              │    cash/savings/stocks   │
       │              │    real_estate/other_asset│     ┌──────────────────┐
       │              │    loan_balance          │◄────┐│  scenarios        │
       │              │    interest_rate         │     ├┤                  │
       │              │    monthly_repayment     │     ││ PK id            │
       │              │    created_at            │     ││ FK profile_id    │
       │              │    updated_at            │     ││    scenario_type │
       │              └──────────────────────────┘     ││    label         │
       │                                               ││    params (JSON) │
       │                                               ││    result (JSON) │
       │                                               ││    created_at    │
       │                                               └┤                  │
       │                                               └──────────────────┘
       │
       │              ┌──────────────────────────┐     ┌──────────────────┐
       │              │  chat_sessions            │     │  chat_messages    │
       │              ├──────────────────────────┤     ├──────────────────┤
       └─────────────►│ PK id                    │◄───┐│ PK id            │
                      │ FK user_id               │    └│ FK session_id    │
                      │    created_at            │      │    role          │
                      │    updated_at            │      │    content       │
                      └──────────────────────────┘      │    tool_calls    │
                                                        │    created_at    │
                                                        └──────────────────┘

┌──────────────────────┐     ┌──────────────────────────┐
│ financial_insights   │     │  knowledge_documents      │
├──────────────────────┤     ├──────────────────────────┤
│ PK id                │     │ PK id                    │
│ FK user_id           │     │    title                 │
│    type              │     │    content               │
│    title             │     │    source                │
│    category          │     │    version               │
│    message           │     │    effective_date        │
│    metric            │     │    category              │
│    created_at        │     │    tags                  │
└──────────────────────┘     └──────────────────────────┘

┌──────────────────────────┐
│  ai_interaction_logs     │
├──────────────────────────┤
│ PK id                    │
│    user_id               │
│    request_id            │
│    session_id            │
│    intent                │
│    tool_calls (JSON)     │
│    model                 │
│    latency_ms            │
│    prompt_tokens         │
│    completion_tokens     │
│    total_tokens          │
│    created_at            │
└──────────────────────────┘
```

## Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `financial_profiles` | Aggregate financial profile (personal, income, expenses, assets, liabilities) |
| `financial_goals` | Financial goals (buy house, car, etc.) |
| `scenarios` | Saved scenario simulations |
| `financial_insights` | Generated AI insights |
| `chat_sessions` | Chat conversation sessions |
| `chat_messages` | Individual chat messages with tool calls |
| `knowledge_documents` | RAG knowledge base for financial education |
| `ai_interaction_logs` | Observability logs for AI requests |
