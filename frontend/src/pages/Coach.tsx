import { useState, useRef, useEffect } from 'react';
import { aiCoachApi, profileApi } from '../api';
import type { ChatMessage, ActionPlan } from '../types';

const DEMO_USER_ID = 'demo-user-minhanh';

const SUGGESTED_QUESTIONS = [
  'Mua nhà 3 tỷ trong 5 năm có khả thi không?',
  'Nếu năm sau tôi có con thì sao?',
  'Tôi đang tiết kiệm đủ chưa?',
  'Tôi có thể vay thêm bao nhiêu?',
  'Tôi cần bao nhiêu tiền dự phòng?',
  'Làm sao đạt mục tiêu mua nhà nhanh hơn?',
];

interface AgentStatus {
  configured: boolean;
  available: boolean;
  agentUrl?: string;
  agentProvider?: string;
  message?: string;
}

export default function Coach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [toolCallsVisible, setToolCallsVisible] = useState<Record<number, boolean>>({});
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check agent status on mount
  useEffect(() => {
    aiCoachApi.getStatus().then(setAgentStatus).catch(() => {
      setAgentStatus({ configured: false, available: false, message: 'Cannot reach backend' });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreaming(true);
    setThinkingMsg('AI đang phân tích...');
    setError(null);

    try {
      const userId = localStorage.getItem('userId') || DEMO_USER_ID;

      // Add placeholder assistant message for streaming
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      for await (const event of aiCoachApi.chatStream({ userId, message: text, sessionId })) {
        switch (event.type) {
          case 'thinking':
            setThinkingMsg(event.message);
            break;
          case 'tools':
            // Update last message with tool calls
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                toolCalls: event.toolCalls,
              };
              return updated;
            });
            setThinkingMsg('AI đang tạo phản hồi...');
            break;
          case 'delta':
            // Append content chunk to last message
            setThinkingMsg(null);
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + event.content,
              };
              return updated;
            });
            break;
          case 'done':
            // Final update with complete message
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: 'assistant',
                content: event.message,
                toolCalls: event.toolCalls,
              };
              return updated;
            });
            setSessionId(event.sessionId);
            if (event.actionPlan) setActionPlan(event.actionPlan);
            break;
          case 'error':
            setError(event.message);
            // Remove placeholder if empty
            setMessages((prev) => {
              if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
                return prev.slice(0, -1);
              }
              return prev;
            });
            break;
        }
      }
    } catch (err: any) {
      let errorMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại.';

      if (err?.message?.includes('timeout') || err?.message?.includes('abort')) {
        errorMsg = '⏱️ AI đang phản hồi chậm. Vui lòng thử lại sau.';
      } else if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
        errorMsg = '🔌 Không thể kết nối tới AI. Vui lòng kiểm tra kết nối.';
      } else if (err?.message?.includes('404')) {
        errorMsg = '📋 Chưa có hồ sơ tài chính. Vui lòng load demo hoặc tạo hồ sơ trước.';
      }

      setError(errorMsg);
      // Remove empty placeholder or add error message
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }];
        }
        return [...prev, { role: 'assistant', content: errorMsg }];
      });
    } finally {
      setLoading(false);
      setStreaming(false);
      setThinkingMsg(null);
    }
  };

  const agentConnected = agentStatus?.configured && agentStatus?.available;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">🤖 AI Financial Coach</h1>
          {/* Agent status indicator */}
          {agentStatus && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              agentConnected
                ? 'bg-green-50 text-green-700'
                : agentStatus.configured
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                agentConnected ? 'bg-green-500' : agentStatus.configured ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              {agentConnected ? 'Agent connected' : agentStatus.configured ? 'Agent unreachable' : 'Not configured'}
            </span>
          )}
        </div>
        <p className="text-gray-500 mt-1">
          Trò chuyện với AI hiểu hồ sơ tài chính của bạn. AI sử dụng financial tools để tính toán — không tự bịa số liệu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 card flex flex-col" style={{ minHeight: '500px' }}>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-gray-500 mb-6">Hỏi tôi bất cứ điều gì về tài chính của bạn</p>
                <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary-50 text-sm text-gray-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-3 border-t border-gray-200/30 pt-2">
                      <button
                        onClick={() => setToolCallsVisible((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="text-xs opacity-70 hover:opacity-100"
                      >
                        {toolCallsVisible[idx] ? '▼' : '▶'} {msg.toolCalls.length} tool calls
                      </button>
                      {toolCallsVisible[idx] && (
                        <div className="mt-2 space-y-1">
                          {msg.toolCalls.map((tc: any, i: number) => (
                            <div key={i} className="text-xs bg-gray-200/50 rounded-lg p-2">
                              <span className="font-mono font-bold">{tc.toolName}</span>
                              <span className="opacity-60 ml-2">({tc.latencyMs}ms)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && thinkingMsg && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-gray-500">{thinkingMsg}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Streaming cursor on last message */}
            {streaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
              <div className="flex justify-start -mt-2">
                <div className="bg-gray-100 rounded-2xl px-4 py-1">
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-sm"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">×</button>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Hỏi về tài chính của bạn..."
              className="input flex-1"
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>

        {/* Sidebar: Action Plan */}
        <div className="space-y-4">
          {actionPlan ? (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Action Plan</h3>
              <p className="text-sm text-gray-500 mb-4">{actionPlan.summary}</p>
              <div className="space-y-2">
                {actionPlan.items.map((item) => (
                  <div key={item.priority} className="p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                        {item.priority}
                      </span>
                      <span className="font-medium text-sm text-gray-900">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-8">{item.description}</p>
                    {item.target && <p className="text-xs text-primary-600 ml-8 mt-1">{item.target}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-gray-500">
                Hỏi AI tạo action plan để thấy kế hoạch hành động cá nhân hóa
              </p>
            </div>
          )}

          {/* Agent info */}
          {agentStatus && agentStatus.configured && (
            <div className="card bg-green-50 border-green-100">
              <h3 className="font-semibold text-green-900 mb-2 text-sm">🟢 AI Agent</h3>
              <p className="text-xs text-green-700">
                {agentStatus.available
                  ? `Đã kết nối tới GreenNode AgentBase`
                  : 'Không thể kết nối tới Agent'}
              </p>
              {agentStatus.agentProvider && (
                <p className="text-xs text-green-600 mt-1">Provider: {agentStatus.agentProvider}</p>
              )}
            </div>
          )}

          <div className="card bg-blue-50 border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">🔒 AI Guardrails</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>✓ Sử dụng financial tools để tính toán</li>
              <li>✓ Không tự tính số tiền</li>
              <li>✓ Không bịa dữ liệu</li>
              <li>✓ Ngôn ngữ thận trọng ("ước tính", "có thể")</li>
              <li>✓ Không cam kết lợi nhuận đầu tư</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
