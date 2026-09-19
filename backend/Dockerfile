# ============================================================
# Backend Dockerfile — AI Financial Coach
# ============================================================
FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Generate Prisma client
COPY prisma ./prisma
COPY .env.example .env.example
RUN npx prisma generate

# Build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/index.js"]
