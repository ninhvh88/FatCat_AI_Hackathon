# Infrastructure

This directory contains deployment infrastructure configuration.

## Docker

- `docker-compose.yml` (root) — Full stack orchestration
- `backend/Dockerfile` — Backend container
- `frontend/Dockerfile` — Frontend container (nginx)

## GreenNode

For GreenNode deployment, see [docs/deployment-guide.md](../docs/deployment-guide.md).

The `greennode-agentbase-skills/` directory contains CLI skills for GreenNode platform interaction (deploy, monitor, teardown).
