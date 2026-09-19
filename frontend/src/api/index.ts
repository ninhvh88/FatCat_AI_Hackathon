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
  getBaseline: (userId: string) => API.get(`/scenarios/${userId}/baseline`).then((r) => r.data),
  simulate: (data: any) => API.post('/scenarios/simulate', data).then((r) => r.data),
};

// Life Events
export const lifeEventsApi = {
  getTypes: () => API.get('/life-events/types').then((r) => r.data),
  simulate: (data: { userId: string; type: string; label?: string; assumptions?: Record<string, number> }) =>
    API.post('/life-events/simulate', data).then((r) => r.data),
  affordability: (data: { userId: string; price: number; downPayment: number; interestRate: number; loanTermMonths: number }) =>
    API.post('/life-events/affordability', data).then((r) => r.data),
  loanBurden: (data: { userId: string; amount: number; interestRate: number; loanTermMonths: number }) =>
    API.post('/life-events/loan-burden', data).then((r) => r.data),
};

// AI Chat
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
