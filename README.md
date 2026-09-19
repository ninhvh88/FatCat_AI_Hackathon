# AI Financial Coach — Innovation Prototype

> AI có thể hiểu hồ sơ tài chính cá nhân, phân tích dòng tiền, đánh giá khả năng đạt mục tiêu và mô phỏng các kịch bản tài chính để hỗ trợ người dùng ra quyết định.

## 🚀 Live Demo (GreenNode AgentBase)

**URL**: https://endpoint-7b76d310-ed76-46cc-b271-fc5e81fb6f2b.agentbase-runtime.aiplatform.vngcloud.vn

| Endpoint | Description |
|----------|-------------|
| `/` | Frontend SPA (React app) |
| `/health` | Health check |
| `/api/profile/demo` | Demo persona (Nguyễn Minh Anh) |
| `/api/dashboard/demo` | Dashboard with financial metrics |
| `/api/life-events/types` | Available life event types |
| `/api/life-events/simulate` | Simulate life event (POST) |
| `/api/life-events/affordability` | Check affordability (POST) |
| `/api/ai/chat` | AI chat with tool calling (POST) |

**Runtime**: `fatcat-financial-coach` · Flavor: 2 vCPU / 4 GB RAM · Status: ACTIVE

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                │
│  Landing → Dashboard → Goals → Scenarios → Coach    │
└──────────────────────┬──────────────────────────────┘
                         │ REST API
┌──────────────────────▼──────────────────────────────┐
│           Backend (Node.js + Express + TS)          │
│                                                      │
│  Financial Engine (deterministic)                   │
│  AI Orchestrator (tool calling)                     │
│  LLM Provider (Mock/OpenAI/Compatible)              │
│  RAG Knowledge Service                              │
└──────────────────────┬──────────────────────────────┘
                         │
┌──────────────────────▼──────────────────────────────┐
│              PostgreSQL (via Docker)                │
└─────────────────────────────────────────────────────┘
```

**Key principle:** Financial calculations are performed by the backend Financial Engine — NOT the LLM. The AI only understands intent, selects tools, and explains results.

See [docs/architecture.md](docs/architecture.md) for full architecture diagram.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
cp .env.example .env
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Click **"Try Demo"** to load the demo persona

### Option 2: Local Development

```bash
# Start PostgreSQL
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_DB=financial_coach \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16-alpine

# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/financial_coach` | PostgreSQL URL |
| `LLM_PROVIDER` | No | `mock` | `mock` / `openai` / `compatible` |
| `LLM_API_KEY` | No | — | LLM API key (not needed for mock) |
| `LLM_MODEL` | No | `gpt-4o-mini` | Model name |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `LLM_TEMPERATURE` | No | `0.7` | LLM temperature |
| `JWT_SECRET` | Yes | `dev-secret` | JWT signing secret |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |
| `APP_ENV` | No | `development` | Environment |
| `LOG_LEVEL` | No | `info` | Log level |
| `VECTOR_DB_URL` | No | — | Vector DB URL (for RAG) |

> **Mock mode:** The app works without any LLM API key. Set `LLM_PROVIDER=mock` (default).

## Running Tests

```bash
cd backend
npm install

# Unit tests (Financial Engine calculators)
npm run test:unit

# Integration tests (API endpoints)
npm run test:integration

# All tests
npm test
```

## Docker Deployment

```bash
# Build and start all services
docker compose up -d --build

# Check health
curl http://localhost:8080/health

# View logs
docker compose logs -f

# Stop
docker compose down
```

## GreenNode Deployment

See [docs/deployment-guide.md](docs/deployment-guide.md) for detailed GreenNode deployment steps.

Quick summary:
1. Build Docker images: `docker compose build`
2. Push to GreenNode Container Registry
3. Create Custom Agent Runtime in GreenNode Console
4. Set environment variables (DATABASE_URL, LLM_PROVIDER, etc.)
5. Deploy and verify health check

### Using GreenNode LLM

```env
LLM_PROVIDER=compatible
LLM_API_KEY=<greennode-llm-key>
LLM_BASE_URL=<greennode-llm-endpoint>
LLM_MODEL=<available-model>
```

## Demo Credentials

No authentication required for the prototype. Use **"Try Demo"** or **"Load Demo"** button to instantly load the demo persona.

### Demo Persona

| Field | Value |
|-------|-------|
| Name | Nguyễn Minh Anh |
| Age | 28 |
| Monthly Income | 30,000,000 VND |
| Monthly Expenses | 18,000,000 VND |
| Savings | 200,000,000 VND |
| Cash | 50,000,000 VND |
| Loan | 200,000,000 VND (10%/year) |
| Goal | Buy house 3,000,000,000 VND in 5 years |

## Demo Scenario (3 Minutes)

See [docs/demo-script.md](docs/demo-script.md) for the full 3-minute demo script.

1. **Dashboard** — Show financial profile, health score, insights
2. **Ask AI** — "Tôi muốn mua nhà 3 tỷ trong 5 năm. Tôi có khả thi không?"
3. **Scenario** — "Nếu năm sau tôi có con thì sao?" → Show comparison
4. **Scenario** — "Nếu thu nhập tăng 20% thì sao?" → Show second scenario
5. **Action Plan** — AI generates personalized plan
6. **Closing** — AI understands, simulates, and advises

## Project Structure

```
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── services/
│   │   │   ├── financial-engine/  # Deterministic calculators
│   │   │   ├── ai/               # AI orchestrator + tools + providers
│   │   │   └── rag/              # Knowledge base
│   │   ├── routes/               # REST API routes
│   │   └── types/                # Shared types
│   ├── prisma/                   # Database schema
│   └── tests/                    # Unit + integration tests
├── frontend/                # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/                # Landing, Dashboard, Goals, Scenarios, Coach
│       ├── components/           # Navbar, Charts
│       └── api/                  # API client
├── docs/                    # Architecture, ERD, OpenAPI, demo script
├── docker-compose.yml       # Full stack deployment
├── .env.example             # Environment template
└── PROJECT_SPEC.md          # Specification (source of truth)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/profile/demo` | Get demo profile |
| POST | `/api/profile/demo` | Load demo persona |
| POST | `/api/profile` | Create profile |
| GET | `/api/profile/:userId` | Get profile |
| GET | `/api/dashboard/:userId` | Get dashboard data |
| GET | `/api/financial-health/:userId` | Get health score |
| POST | `/api/goals` | Create goal |
| GET | `/api/goals/:userId` | Get goals with projections |
| GET | `/api/goals/:userId/projection` | 3-scenario projection |
| GET | `/api/scenarios/predefined` | 7 predefined scenarios |
| POST | `/api/scenarios/simulate` | Simulate scenarios |
| POST | `/api/ai/chat` | Chat with AI |
| GET | `/api/insights/:userId` | Get AI insights |
| GET | `/api/insights/:userId/action-plan` | Get action plan |
| GET | `/api/knowledge` | Get knowledge base |

See [docs/openapi.yaml](docs/openapi.yaml) for full OpenAPI specification.

## Known Limitations

1. **No authentication** — Prototype doesn't implement user auth (by design)
2. **Mock LLM** — Default mode uses rule-based responses (no real LLM). Set `LLM_PROVIDER=openai` or `compatible` for real AI.
3. **RAG is keyword-based** — Simple keyword search, not vector embeddings. Can be upgraded to pgvector.
4. **No real banking integration** — No Open Banking, no real transactions (by design for MVP)
5. **Single currency** — VND only
6. **No real-time updates** — Data is fetched on page load
7. **Investment info is educational only** — AI guardrails prevent investment advice
8. **No Multi-Agent complexity** — Simple orchestrator, not complex agent mesh (by design: "reliability over agent hype")

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| AI | OpenAI-compatible API with Mock fallback |
| Container | Docker, Docker Compose |
| Testing | Vitest, Supertest |

## License

Prototype for innovation demo. Not for production use.
