import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/env';
import { getProfile } from './dashboard.routes';
import { createDemoProfile, DEMO_USER_ID } from '../utils/demo-data';
import type { FinancialProfile, ChatResponse } from '../types';

// ============================================================
// AI Coach Proxy Route
// Proxies AI chat requests to the GreenNode AgentBase endpoint.
//
// Flow:
//   Frontend → /api/ai-coach/chat → GreenNode /api/ai/chat → Response
//
// The GreenNode agent has the full Financial Engine and AI orchestrator.
// This proxy:
//   1. Gets the user's financial profile from local DB/demo
//   2. Syncs the profile to the GreenNode agent (if custom profile)
//   3. Forwards the chat request
//   4. Returns the response with proper error handling
// ============================================================

const router = Router();

const chatSchema = z.object({
  userId: z.string(),
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

// Sync a financial profile to the GreenNode agent so it can use it
async function syncProfileToAgent(
  agentUrl: string,
  profile: FinancialProfile,
  apiKey: string
): Promise<void> {
  // The GreenNode agent has the demo profile built-in.
  // For custom profiles, sync via POST /api/profile
  if (profile.userId === DEMO_USER_ID) return; // demo already exists

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    await fetch(`${agentUrl}/api/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    // Non-fatal: profile sync is best-effort
    console.log(JSON.stringify({
      event: 'ai-coach.profile-sync.failed',
      userId: profile.userId,
      error: (err as Error).message,
    }));
  }
}

// POST /api/ai-coach/chat — proxy chat to GreenNode agent
router.post('/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();

  // 1. Validate request
  let parsed;
  try {
    parsed = chatSchema.parse(req.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    return res.status(400).json({ error: 'Invalid request' });
  }

  // 2. Check if GreenNode agent URL is configured
  const agentUrl = config.greennode.agentUrl;
  if (!agentUrl) {
    return res.status(503).json({
      error: 'AI Agent not configured',
      message: 'GREENNODE_AI_AGENT_URL is not set. Please configure the environment variable.',
    });
  }

  // 3. Get the user's financial profile (for context + sync)
  let profile: FinancialProfile | null = null;
  try {
    profile = await getProfile(parsed.userId);
  } catch {
    // DB not available, try demo
    if (parsed.userId === DEMO_USER_ID) {
      profile = createDemoProfile();
    }
  }

  if (!profile) {
    return res.status(404).json({
      error: 'Profile not found',
      message: 'Please create a financial profile first.',
    });
  }

  // 4. Sync profile to GreenNode agent (best-effort, non-blocking for demo)
  const apiKey = config.greennode.agentApiKey;
  await syncProfileToAgent(agentUrl, profile, apiKey);

  // 5. Forward chat request to GreenNode agent
  try {
    const agentHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) agentHeaders['Authorization'] = `Bearer ${apiKey}`;

    const agentRequestBody = JSON.stringify({
      userId: parsed.userId,
      message: parsed.message,
      sessionId: parsed.sessionId,
    });

    console.log(JSON.stringify({
      event: 'ai-coach.proxy.request',
      userId: parsed.userId,
      messageLength: parsed.message.length,
      hasSessionId: !!parsed.sessionId,
      agentUrl: `${agentUrl}/api/ai/chat`,
    }));

    const agentResponse = await fetch(`${agentUrl}/api/ai/chat`, {
      method: 'POST',
      headers: agentHeaders,
      body: agentRequestBody,
      signal: AbortSignal.timeout(config.greennode.agentTimeoutMs),
    });

    // 6. Handle agent response
    if (!agentResponse.ok) {
      const errorText = await agentResponse.text().catch(() => 'Unknown error');
      console.log(JSON.stringify({
        event: 'ai-coach.proxy.error',
        status: agentResponse.status,
        error: errorText.substring(0, 200),
      }));
      return res.status(agentResponse.status).json({
        error: 'AI Agent returned an error',
        status: agentResponse.status,
        message: errorText.substring(0, 500),
      });
    }

    const agentData = await agentResponse.json() as ChatResponse;

    // 7. Validate agent response structure
    if (!agentData || typeof agentData.message !== 'string') {
      console.log(JSON.stringify({
        event: 'ai-coach.proxy.invalid-response',
        keys: agentData ? Object.keys(agentData) : [],
      }));
      return res.status(502).json({
        error: 'Invalid response from AI Agent',
        message: 'The agent returned an unexpected response format.',
      });
    }

    const latencyMs = Date.now() - startTime;
    console.log(JSON.stringify({
      event: 'ai-coach.proxy.success',
      latencyMs,
      toolCalls: agentData.toolCalls?.length ?? 0,
      messageLength: agentData.message.length,
      sessionId: agentData.sessionId,
    }));

    // 8. Return the agent response to the frontend
    return res.json({
      message: agentData.message,
      toolCalls: agentData.toolCalls ?? [],
      sessionId: agentData.sessionId ?? `session-${Date.now()}`,
      actionPlan: agentData.actionPlan,
    });

  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = (err as Error).message;

    console.log(JSON.stringify({
      event: 'ai-coach.proxy.failed',
      latencyMs,
      error: errorMsg,
    }));

    // Distinguish timeout vs network error
    if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
      return res.status(504).json({
        error: 'AI Agent timeout',
        message: 'The AI Agent did not respond in time. Please try again.',
      });
    }

    // Network error (agent unreachable)
    return res.status(503).json({
      error: 'AI Agent unavailable',
      message: 'Cannot connect to the AI Agent. Please check your connection and try again.',
    });
  }
});

// GET /api/ai-coach/status — check if the GreenNode agent is available
router.get('/status', async (_req: Request, res: Response) => {
  const agentUrl = config.greennode.agentUrl;

  if (!agentUrl) {
    return res.json({
      configured: false,
      available: false,
      message: 'GREENNODE_AI_AGENT_URL not configured',
    });
  }

  try {
    const headers: Record<string, string> = {};
    if (config.greennode.agentApiKey) headers['Authorization'] = `Bearer ${config.greennode.agentApiKey}`;

    const response = await fetch(`${agentUrl}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json() as { status?: string; llmProvider?: string };
      return res.json({
        configured: true,
        available: true,
        agentUrl,
        agentStatus: data.status,
        agentProvider: data.llmProvider,
      });
    }

    return res.json({
      configured: true,
      available: false,
      agentUrl,
      message: `Agent returned HTTP ${response.status}`,
    });
  } catch (err) {
    return res.json({
      configured: true,
      available: false,
      agentUrl,
      message: (err as Error).message,
    });
  }
});

// GET /api/ai-coach/sessions/:userId — get chat sessions from the GreenNode agent
router.get('/sessions/:userId', async (req: Request, res: Response) => {
  const agentUrl = config.greennode.agentUrl;

  if (!agentUrl) {
    return res.status(503).json({ error: 'AI Agent not configured' });
  }

  try {
    const headers: Record<string, string> = {};
    if (config.greennode.agentApiKey) headers['Authorization'] = `Bearer ${config.greennode.agentApiKey}`;

    const response = await fetch(`${agentUrl}/api/ai/sessions/${req.params.userId}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to get sessions from agent' });
    }

    const data = await response.json() as any;
    return res.json(data);
  } catch (err) {
    return res.status(503).json({
      error: 'AI Agent unavailable',
      message: (err as Error).message,
    });
  }
});

export default router;
