# ============================================================
# AI Financial Coach — Combined Docker Image
# Serves both frontend (static) and backend (API) on port 8080
# For GreenNode AgentBase deployment (single container)
# ============================================================

# --- Stage 1: Build Frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:20-slim AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --production=false
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# --- Stage 3: Production ---
FROM node:20-slim AS production
WORKDIR /app

# Install production dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma client
COPY --from=backend-build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/backend/node_modules/@prisma ./node_modules/@prisma

# Copy backend build output
COPY --from=backend-build /app/backend/dist ./dist

# Copy Prisma schema (for migrations)
COPY --from=backend-build /app/backend/prisma ./prisma

# Copy frontend build output to public directory
COPY --from=frontend-build /app/frontend/dist ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=8080
ENV APP_ENV=production
ENV LLM_PROVIDER=mock
ENV CORS_ORIGINS=*

EXPOSE 8080

CMD ["node", "dist/index.js"]
