# Demo Script — AI Financial Coach (3 Minutes)

## Pre-Demo Setup

1. Start the application: `docker compose up -d`
2. Open browser: `http://localhost:3000`
3. Click **"Try Demo"** on the landing page

This loads the demo persona: **Nguyễn Minh Anh, 28 tuổi**.

---

## Demo Flow (3 minutes)

### STEP 1 — Dashboard (30 seconds)

**Say:** *"Đây là Financial Profile của một khách hàng 28 tuổi."*

**Show:**
- Financial Health Score (gauge chart with breakdown)
- Monthly Cash Flow (Income 30M, Expense 18M, Free 12M)
- Net Worth (Assets 250M - Liabilities 200M = 50M)
- Emergency Fund (13.9 months)
- Goal: "Mua nhà" — 3B target, progress bar
- AI Insight cards (strengths, warnings, opportunities)
- Action Plan (prioritized)

### STEP 2 — Ask AI (30 seconds)

**Navigate to** `/coach`

**Ask:** *"Tôi muốn mua nhà 3 tỷ trong 5 năm. Tôi có khả thi không?"*

**Show:**
- AI calls financial tools (tool call indicators visible)
- AI responds with actual calculated values from Financial Engine
- Response includes: current savings, monthly saving capacity, funding gap, required monthly saving
- AI uses hedging language ("ước tính", "theo giả định")

### STEP 3 — Scenario: New Child (30 seconds)

**Ask:** *"Nếu năm sau tôi có con thì sao?"*

**Or navigate to** `/scenarios` **and select "Sinh con"**

**Show:**
- Scenario comparison: Current vs. New Child
- Free Cash Flow: 12M → 7M (−5M)
- Saving Rate change
- Health score change
- AI explains: *"Với giả định chi phí gia đình tăng thêm 5 triệu/tháng, khả năng tích lũy giảm khoảng 42%."*

### STEP 4 — Scenario: Income +20% (30 seconds)

**Ask:** *"Nếu thu nhập tăng 20% thì sao?"*

**Or select "Thu nhập +20%" in Scenarios page**

**Show:**
- Second scenario comparison
- Free Cash Flow: 12M → 18M (+6M)
- Health score improvement
- Goal date moves earlier

### STEP 5 — Action Plan (30 seconds)

**Ask:** *"Tạo kế hoạch hành động tài chính cho tôi"*

**Show:**
- AI generates personalized Action Plan
- Prioritized items based on Financial Engine output
- Each item has specific targets with real numbers

### STEP 6 — Closing (30 seconds)

**Say:**

*"AI không chỉ trả lời câu hỏi tài chính. AI hiểu tình hình hiện tại, mô phỏng tương lai và giúp khách hàng chủ động ra quyết định."*

**Highlight:**
- All numbers come from Financial Engine (deterministic)
- AI uses tool calling — doesn't calculate itself
- Works in Mock mode (no LLM API key needed)
- Guardrails: hedging language, no guarantees

---

## Key Points to Emphasize

1. **One-click demo** — no manual data entry
2. **Real calculations** — Financial Engine, not LLM hallucination
3. **Tool calling** — AI selects and calls financial tools
4. **Scenario simulation** — compare what-if situations
5. **Action plan** — personalized, prioritized, data-driven
6. **Guardrails** — safe, hedging language, no false promises
7. **Mock mode** — works without LLM API key
