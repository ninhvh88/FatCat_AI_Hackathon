import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { correlationId, requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Routes
import profileRoutes from './routes/profile.routes';
import dashboardRoutes from './routes/dashboard.routes';
import financialHealthRoutes from './routes/financial-health.routes';
import goalsRoutes from './routes/goals.routes';
import scenariosRoutes from './routes/scenarios.routes';
import aiRoutes from './routes/ai.routes';
import aiCoachRoutes from './routes/ai-coach.routes';
import insightsRoutes from './routes/insights.routes';
import lifeEventsRoutes from './routes/life-events.routes';
import { getAllKnowledge } from './services/rag/knowledge-service';

// ============================================================
// AI Financial Coach — Backend Server
// ============================================================

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.app.corsOrigins.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(correlationId);
app.use(requestLogger);
if (config.app.env === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: config.app.env,
    llmProvider: config.llm.provider,
    aiAgentConfigured: !!config.greennode.agentUrl,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/financial-health', financialHealthRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-coach', aiCoachRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/life-events', lifeEventsRoutes);

// Knowledge endpoint
app.get('/api/knowledge', (_req, res) => {
  res.json(getAllKnowledge());
});

// Serve static frontend files (for combined Docker image deployment)
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: serve index.html for non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.app.port;
app.listen(PORT, () => {
  console.log(JSON.stringify({
    event: 'server.start',
    port: PORT,
    env: config.app.env,
    llmProvider: config.llm.provider,
  }));
});

export default app;
