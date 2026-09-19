import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProfile } from './dashboard.routes';
import { processChat } from '../services/ai/orchestrator';
import { prisma } from '../db/prisma';
import type { ChatMessage } from '../types';

// POST /api/ai/chat
// GET /api/ai/sessions/:userId
const router = Router();

const chatSchema = z.object({
  userId: z.string(),
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const parsed = chatSchema.parse(req.body);
    const profile = await getProfile(parsed.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Please create a profile first.' });
    }

    // Get chat history from DB if session exists
    let history: ChatMessage[] = [];
    if (parsed.sessionId) {
      try {
        const messages = await prisma.chatMessage.findMany({
          where: { sessionId: parsed.sessionId },
          orderBy: { createdAt: 'asc' },
        });
        history = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // DB not available, continue without history
      }
    }

    // Process chat through AI orchestrator
    const response = await processChat(profile, parsed.message, history);

    // Save to DB if possible
    try {
      let sessionId = parsed.sessionId;
      if (!sessionId) {
        const session = await prisma.chatSession.create({
          data: { userId: parsed.userId },
        });
        sessionId = session.id;
      }

      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: parsed.message,
        },
      });
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: response.message,
          toolCalls: response.toolCalls as any,
        },
      });

      response.sessionId = sessionId;
    } catch {
      // DB not available, continue without saving
    }

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Chat failed', message: (err as Error).message });
  }
});

// GET /api/ai/sessions/:userId
router.get('/sessions/:userId', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.params.userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sessions', message: (err as Error).message });
  }
});

export default router;
