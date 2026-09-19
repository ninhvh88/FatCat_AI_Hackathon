# Deployment Guide — AI Financial Coach

## Local Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Run with Docker Compose (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health check: http://localhost:8080/health

### Run without Docker (Development)

```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=financial_coach \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16-alpine

# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## GreenNode AgentBase Deployment (Production)

The app is deployed as a **Custom Agent Runtime** on GreenNode AgentBase. A single
combined Docker image serves both the frontend (static files) and backend API on
port 8080 — no external database required (demo mode uses in-memory data).

### Live Deployment

| Property | Value |
|----------|-------|
| **Endpoint URL** | https://endpoint-21fe7e42-0151-46bf-86a7-00e70ebe890a.agentbase-runtime.aiplatform.vngcloud.vn |
| **Runtime ID** | `runtime-c9c626ab-1709-45b6-9fcd-bda3e66a0c39` |
| **Runtime Name** | `fatcat-financial-coach` |
| **Flavor** | `runtime-s2-general-2x4` (2 vCPU, 4 GB RAM) |
| **Image** | `vcr.vngcloud.vn/111480-abp114545/ai-financial-coach:latest` |
| **Status** | ACTIVE |
| **Console** | https://aiplatform.console.vngcloud.vn/agent-runtime?tab=runtime |

### Architecture (Single-Container Deployment)

```
┌─────────────────────────────────────────────┐
│  GreenNode AgentBase Runtime (port 8080)    │
│  ┌───────────────────────────────────────┐  │
│  │  Node.js (Express)                    │  │
│  │  ├── /api/*  → Backend API routes     │  │
│  │  └── /*      → Static frontend (SPA)  │  │
│  └───────────────────────────────────────┘  │
│  Demo mode: in-memory profile (no DB)       │
└─────────────────────────────────────────────┘
```

### How It Was Deployed

#### Step 1: Build Combined Docker Image

The root `Dockerfile` builds both frontend and backend into a single image:

```bash
docker build -t ai-financial-coach:latest .
```

The backend serves static frontend files from a `public/` directory (added in
`backend/src/index.ts`), so one container handles both API and SPA.

#### Step 2: Get IAM Token

```powershell
$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$clientId`:$clientSecret"))
$resp = Invoke-WebRequest -Uri "https://iam.api.vngcloud.vn/accounts-api/v2/auth/token" `
    -Method POST -Headers @{Authorization = "Basic $basicAuth"} `
    -Body "grant_type=client_credentials" `
    -ContentType "application/x-www-form-urlencoded"
$token = ($resp.Content | ConvertFrom-Json).access_token
```

#### Step 3: Login & Push to Container Registry

```bash
# Registry: vcr.vngcloud.vn
# Repo: 111480-abp114545
docker login vcr.vngcloud.vn -u <cr-username> -p <cr-secret>
docker tag ai-financial-coach:latest vcr.vngcloud.vn/111480-abp114545/ai-financial-coach:latest
docker push vcr.vngcloud.vn/111480-abp114545/ai-financial-coach:latest
```

#### Step 4: Create Custom Agent Runtime

POST to `https://agentbase.api.vngcloud.vn/runtime/agent-runtimes`:

```json
{
  "name": "fatcat-financial-coach",
  "imageUrl": "vcr.vngcloud.vn/111480-abp114545/ai-financial-coach:latest",
  "flavorId": "runtime-s2-general-2x4",
  "command": [],
  "args": [],
  "environmentVariables": {
    "NODE_ENV": "production",
    "PORT": "8080",
    "LLM_PROVIDER": "mock",
    "CORS_ORIGINS": "*"
  },
  "autoscaling": {
    "minReplicas": 1,
    "maxReplicas": 1,
    "cpuUtilization": 50,
    "memoryUtilization": 50
  },
  "poc": false,
  "imageAuth": {
    "enabled": true,
    "username": "<cr-username>",
    "password": "<cr-secret>"
  }
}
```

The runtime becomes ACTIVE in ~40 seconds. A DEFAULT endpoint is auto-created.

#### Step 5: Verify

```bash
# Health check
curl https://<endpoint-url>/health
# → {"status":"ok","env":"production","llmProvider":"mock"}

# Frontend (SPA)
curl https://<endpoint-url>/
# → HTML with React app

# AI Chat with tool calling
curl -X POST https://<endpoint-url>/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user-minhanh","message":"Tôi có đủ tiền mua nhà không?"}'
# → 2 tool calls (getFinancialProfile, getFinancialInsights) + AI response
```

### Using GreenNode LLM (Optional)

To use GreenNode's OpenAI-compatible LLM instead of mock:

```json
"environmentVariables": {
  "LLM_PROVIDER": "compatible",
  "LLM_API_KEY": "<greennode-llm-key>",
  "LLM_BASE_URL": "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1",
  "LLM_MODEL": "<model-name>"
}
```

### Runtime Management

| Action | API |
|--------|-----|
| Get status | `GET /runtime/agent-runtimes/{id}` |
| List endpoints | `GET /runtime/agent-runtimes/{id}/endpoints` |
| Update (new version) | `PUT /runtime/agent-runtimes/{id}` |
| Delete | `DELETE /runtime/agent-runtimes/{id}` |
| View logs | `GET /runtime/agent-runtimes/{id}/logs` |

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Runtime stuck in CREATING | Check image pull — verify CR credentials in `imageAuth` |
| 404 on API routes | Ensure backend build includes all routes |
| Frontend blank page | Check that `public/` directory is copied in Dockerfile |
| LLM not responding | Set `LLM_PROVIDER=mock` for fallback |
| OOMKilled | Upgrade flavor to `runtime-s2-general-4x8` (4 CPU, 8 GB) |
