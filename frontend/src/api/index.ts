import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Profile
export const profileApi = {
  getDemo: () => API.get('/profile/demo').then((r) => r.data),
  loadDemo: () => API.post('/profile/demo').then((r) => r.data),
  get: (userId: string) => API.get(`/profile/${userId}`).then((r) => r.data),
  create: (data: any) => API.post('/profile', data).then((r) => r.data),
  update: (userId: string, data: any) => API.put(`/profile/${userId}`, data).then((r) => r.data),
  delete: (userId: string) => API.delete(`/profile/${userId}`).then((r) => r.data),
  list: () => API.get('/profile/list/all').then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  get: (userId: string) => API.get(`/dashboard/${userId}`).then((r) => r.data),
};

// Financial Health
export const healthApi = {
  get: (userId: string) => API.get(`/financial-health/${userId}`).then((r) => r.data),
};

// Goals
export const goalsApi = {
  get: (userId: string) => API.get(`/goals/${userId}`).then((r) => r.data),
  getProjection: (userId: string) => API.get(`/goals/${userId}/projection`).then((r) => r.data),
  create: (data: any) => API.post('/goals', data).then((r) => r.data),
};

// Scenarios
export const scenariosApi = {
  getPredefined: () => API.get('/scenarios/predefined').then((r) => r.data),
  getGrouped: () => API.get('/scenarios/grouped').then((r) => r.data),
  getBaseline: (userId: string) => API.get(`/scenarios/${userId}/baseline`).then((r) => r.data),
  simulate: (data: any) => API.post('/scenarios/simulate', data).then((r) => r.data),
  aiAnalyze: (data: any) => API.post('/scenarios/ai-analyze', data, { timeout: 90000 }).then((r) => r.data),

  /** Streaming scenario analysis via SSE — yields events as AI generates */
  aiAnalyzeStream: async function* (
    data: { userId: string; type: string; label?: string; params?: Record<string, number>; customQuestion?: string },
    signal?: AbortSignal
  ): AsyncGenerator<any, void, void> {
    const resp = await fetch('/api/scenarios/ai-analyze/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
    if (!resp.ok) { const t = await resp.text().catch(() => 'Error'); throw new Error(`HTTP ${resp.status}: ${t}`); }
    if (!resp.body) throw new Error('No response body');
    yield* parseSSEStream(resp.body);
  },
};

// Life Events
export const lifeEventsApi = {
  getTypes: () => API.get('/life-events/types').then((r) => r.data),
  getMarketEvents: () => API.get('/life-events/market-events').then((r) => r.data),
  simulate: (data: { userId: string; type: string; label?: string; assumptions?: Record<string, number> }) =>
    API.post('/life-events/simulate', data).then((r) => r.data),
  aiAnalyze: (data: any) => API.post('/life-events/ai-analyze', data, { timeout: 90000 }).then((r) => r.data),

  /** Streaming event analysis via SSE — yields events as AI generates */
  aiAnalyzeStream: async function* (
    data: { userId: string; type: string; label?: string; assumptions?: Record<string, number>; customQuestion?: string },
    signal?: AbortSignal
  ): AsyncGenerator<any, void, void> {
    const resp = await fetch('/api/life-events/ai-analyze/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
    if (!resp.ok) { const t = await resp.text().catch(() => 'Error'); throw new Error(`HTTP ${resp.status}: ${t}`); }
    if (!resp.body) throw new Error('No response body');
    yield* parseSSEStream(resp.body);
  },

  affordability: (data: { userId: string; price: number; downPayment: number; interestRate: number; loanTermMonths: number }) =>
    API.post('/life-events/affordability', data).then((r) => r.data),
  loanBurden: (data: { userId: string; amount: number; interestRate: number; loanTermMonths: number }) =>
    API.post('/life-events/loan-burden', data).then((r) => r.data),
};

// ============================================================
// SSE Stream Parser — shared utility for all streaming endpoints
// Parses Server-Sent Events from a ReadableStream
// ============================================================
async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<any, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const eventStr of events) {
      if (!eventStr.trim()) continue;
      let eventType = '';
      let eventData = '';
      for (const line of eventStr.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) eventData = line.slice(6);
      }
      if (eventType && eventData) {
        try { yield { type: eventType, ...JSON.parse(eventData) }; } catch { /* skip */ }
      }
    }
  }
  // Process remaining buffer
  if (buffer.trim()) {
    let eventType = '';
    let eventData = '';
    for (const line of buffer.split('\n')) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      if (line.startsWith('data: ')) eventData = line.slice(6);
    }
    if (eventType && eventData) {
      try { yield { type: eventType, ...JSON.parse(eventData) }; } catch { /* skip */ }
    }
  }
}

// AI Coach — uses main /api/ai/chat endpoint (backed by GreenNode Agent when LLM_PROVIDER=greennode)
export const aiCoachApi = {
  chat: (data: { userId: string; message: string; sessionId?: string }) =>
    API.post('/ai/chat', data, { timeout: 90000 }).then((r) => r.data),

  /** Streaming chat via Server-Sent Events — yields events as the AI generates */
  chatStream: async function* (
    data: { userId: string; message: string; sessionId?: string }
  ): AsyncGenerator<import('../types').ChatStreamEvent, void, void> {
    const response = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const eventStr of events) {
        if (!eventStr.trim()) continue;

        let eventType = '';
        let eventData = '';
        for (const line of eventStr.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          if (line.startsWith('data: ')) eventData = line.slice(6);
        }

        if (eventType && eventData) {
          try {
            const parsed = JSON.parse(eventData);
            yield { type: eventType, ...parsed } as any;
          } catch {
            // Skip malformed event
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      let eventType = '';
      let eventData = '';
      for (const line of buffer.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) eventData = line.slice(6);
      }
      if (eventType && eventData) {
        try {
          const parsed = JSON.parse(eventData);
          yield { type: eventType, ...parsed } as any;
        } catch {
          // Skip
        }
      }
    }
  },

  getStatus: () => API.get('/ai-coach/status').then((r) => r.data),
  getSessions: (userId: string) => API.get(`/ai/sessions/${userId}`).then((r) => r.data),
};

// AI Chat — alias for backward compatibility
export const aiApi = {
  chat: (data: { userId: string; message: string; sessionId?: string }) =>
    API.post('/ai/chat', data).then((r) => r.data),
  getSessions: (userId: string) => API.get(`/ai/sessions/${userId}`).then((r) => r.data),
};

// Insights
export const insightsApi = {
  get: (userId: string) => API.get(`/insights/${userId}`).then((r) => r.data),
  getActionPlan: (userId: string) => API.get(`/insights/${userId}/action-plan`).then((r) => r.data),
};

// Knowledge
export const knowledgeApi = {
  get: () => API.get('/knowledge').then((r) => r.data),
};

// Health check — uses /health directly (not under /api)
export const healthCheck = () => axios.get('/health').then((r) => r.data).catch(() => null);

export default API;
