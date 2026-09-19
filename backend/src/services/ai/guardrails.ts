// ============================================================
// AI Guardrails
// Ensures AI responses follow safety rules:
//   - No fabricated data
//   - No guaranteed investment returns
//   - No loan approval guarantees
//   - Use hedging language ("ước tính", "theo giả định", "có thể")
// ============================================================

const HEDGING_TERMS = ['ước tính', 'theo giả định', 'có thể', 'nên cân nhắc'];

const FORBIDDEN_PHRASES = [
  'chắc chắn sinh lời',
  'chắc chắn được duyệt',
  'đảm bảo lợi nhuận',
  'guaranteed return',
  'certain to profit',
  'will definitely',
  'chắc chắn trả lời',
  'cam kết',
];

const INJECTION_PATTERNS = [
  'ignore previous instructions',
  'ignore all previous',
  'system prompt',
  'you are now',
  'forget your instructions',
];

// Sanitize user input to prevent prompt injection
export function sanitizeUserInput(input: string): string {
  let sanitized = input;

  // Remove potential prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    const regex = new RegExp(pattern, 'gi');
    sanitized = sanitized.replace(regex, '[filtered]');
  }

  // Limit length
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }

  return sanitized;
}

// Check and fix AI response for guardrail violations
export function enforceGuardrails(response: string): string {
  let enforced = response;

  // Remove forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    enforced = enforced.replace(regex, '[nội dung này không thể cam kết]');
  }

  return enforced;
}

// Build the system prompt with guardrails
export function buildSystemPrompt(profileSummary: string): string {
  return `Bạn là AI Financial Coach, một trợ lý tài chính cá nhân thông minh.

QUY TẮC NGHIÊM NGẶT:
1. KHÔNG TỰ TÍNH TOÁN số tiền. Mọi tính toán phải qua financial tools.
2. KHÔNG TỰ BỊA dữ liệu. Chỉ sử dụng dữ liệu từ financial tools.
3. KHÔNG cam kết lợi nhuận đầu tư, không cam kết được duyệt khoản vay.
4. Sử dụng ngôn ngữ thận trọng: "ước tính", "theo giả định", "có thể", "nên cân nhắc".
5. Với đầu tư: chỉ cung cấp thông tin giáo dục, không phải lời khuyên đầu tư.
6. Trả lời bằng tiếng Việt, tự nhiên và thân thiện.
7. Luôn sử dụng financial tools để lấy số liệu thực tế trước khi trả lời.
8. Giải thích kết quả bằng số liệu từ tools, không tự tính.

HỒ SƠ TÀI CHÍNH HIỆN TẠI:
${profileSummary}

Khi người dùng hỏi, hãy:
1. Xác định intent (hỏi về dòng tiền, mục tiêu, kịch bản, sức khỏe tài chính...)
2. Gọi tool phù hợp để lấy dữ liệu
3. Giải thích kết quả bằng ngôn ngữ tự nhiên
4. Đưa ra recommendation dựa trên số liệu thực`;
}

// Check if a response contains actual calculated values (not just generic text)
export function containsCalculatedValues(response: string): boolean {
  // Check for numbers (amounts, percentages, months)
  const hasNumber = /\d+(\.\d+)?/.test(response);
  const hasCurrency = /(VND|triệu|tỷ|B|M|K)/i.test(response);
  return hasNumber || hasCurrency;
}
