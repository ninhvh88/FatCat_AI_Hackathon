import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMToolDefinition,
  ChatResponse,
} from '../../../types';
import { config } from '../../../config/env';

// ============================================================
// GreenNode LLM Provider
// Sends HTTP requests to the AI Financial Coach Agent running
// on GreenNode/VNGCloud AgentBase.
//
// Unlike MockLLMProvider (rule-based) or OpenAIProvider (raw LLM),
// this provider delegates to a FULL AI AGENT that already has:
//   - Financial Engine (deterministic calculations)
//   - Tool calling (financial tools)
//   - Intent classification + agent routing
//   - Guardrails
//   - RAG knowledge base
//   - Action plan generation
//
// The agent returns a complete ChatResponse with executed tool calls.
// This provider stores the full response for the orchestrator to use.
// ============================================================

export class GreenNodeLLMProvider implements LLMProvider {
  name = 'greennode';
  private agentUrl: string;
  private agentApiKey: string;
  private timeoutMs: number;

  // Store the last agent response (includes tool calls + action plan)
  private lastAgentResponse: ChatResponse | null = null;

  constructor() {
    this.agentUrl = config.greennode.agentUrl;
    this.agentApiKey = config.greennode.agentApiKey;
    this.timeoutMs = config.greennode.agentTimeoutMs;
  }

  async chat(
    messages: LLMMessage[],
    options?: { tools?: LLMToolDefinition[]; temperature?: number; model?: string }
  ): Promise<LLMResponse> {
    // Extract the last user message from LLM messages
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUserMessage?.content ?? '';

    // Build request to GreenNode agent
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.agentApiKey) {
      headers['Authorization'] = `Bearer ${this.agentApiKey}`;
    }

    // The userId is extracted from the system prompt or passed via options
    // For now, use the demo user ID (the agent has the demo profile built-in)
    // The orchestrator will pass the correct userId via the messages context
    const userId = this.extractUserId(messages) || 'demo-user-minhanh';

    const requestBody = JSON.stringify({
      userId,
      message: userText,
      sessionId: this.lastAgentResponse?.sessionId,
    });

    console.log(JSON.stringify({
      event: 'greennode.request',
      userId,
      messageLength: userText.length,
      agentUrl: `${this.agentUrl}/api/ai/chat`,
      hasSessionId: !!this.lastAgentResponse?.sessionId,
    }));

    // Send HTTP request to GreenNode agent
    const response = await fetch(`${this.agentUrl}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(JSON.stringify({
        event: 'greennode.error',
        status: response.status,
        error: errorText.substring(0, 200),
      }));
      throw new Error(`GreenNode agent returned HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const agentData = await response.json() as ChatResponse;

    // Validate response
    if (!agentData || typeof agentData.message !== 'string') {
      throw new Error('GreenNode agent returned invalid response (missing message field)');
    }

    // Store the full agent response for the orchestrator
    this.lastAgentResponse = agentData;

    console.log(JSON.stringify({
      event: 'greennode.success',
      messageLength: agentData.message.length,
      toolCalls: agentData.toolCalls?.length ?? 0,
      sessionId: agentData.sessionId,
      hasActionPlan: !!agentData.actionPlan,
    }));

    // Return as LLMResponse — content is the complete agent response
    // toolCalls are undefined because tools were already executed on the agent side
    return {
      content: agentData.message,
      toolCalls: undefined,
      usage: {
        promptTokens: 0,
        completionTokens: Math.ceil(agentData.message.length / 4),
        totalTokens: Math.ceil(agentData.message.length / 4),
      },
    };
  }

  // Get the full agent response (with tool calls + action plan)
  // Called by the orchestrator after chat()
  getLastAgentResponse(): ChatResponse | null {
    return this.lastAgentResponse;
  }

  // Extract userId from system prompt or messages
  // The orchestrator includes the userId in the system prompt context
  private extractUserId(messages: LLMMessage[]): string | null {
    // The system prompt contains profile context but not userId directly
    // The orchestrator passes userId via the tool context, not messages
    // For now, return null and use the default demo-user-minhanh
    return null;
  }
}
