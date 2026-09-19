import type { KnowledgeDocument } from '../../types';

// ============================================================
// Knowledge Base
// Small built-in knowledge base for financial education.
// Used by RAG to provide educational context.
// ============================================================

export const knowledgeBase: KnowledgeDocument[] = [
  {
    id: 'kb-001',
    title: 'Quỹ dự phòng khẩn cấp',
    content:
      'Quỹ dự phòng khẩn cấp là khoản tiền dành cho các tình huống bất ngờ như mất việc, ốm đau, sửa chữa gấp. ' +
      'Quy tắc chung: nên tích lũy bằng 3-6 tháng chi phí sinh hoạt. ' +
      'Cách xây dựng: 1) Tính tổng chi phí sinh hoạt hàng tháng. 2) Nhân với số tháng mong muốn (3-6 tháng). ' +
      '3) Để riêng vào tài khoản dễ rút nhưng có lãi. 4) Tích lũy dần từ dòng tiền tự do hàng tháng. ' +
      'Không nên đầu tư quỹ dự phòng vào các tài sản rủi ro cao.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'emergency_fund',
    tags: ['emergency', 'savings', 'risk'],
  },
  {
    id: 'kb-002',
    title: 'Quản lý nợ và tỷ lệ nợ trên thu nhập',
    content:
      'Tỷ lệ nợ trên thu nhập (DTI) = Tổng nợ / Tổng thu nhập hàng năm. ' +
      'Ngưỡng an toàn: Dưới 20% tốt, 20-36% khả thi, trên 36% cần cảnh báo, trên 50% nguy cơ. ' +
      'Cách giảm nợ: 1) Ưu tiên trả nợ lãi suất cao trước (debt avalanche). ' +
      '2) Cân nhắc gom nợ nếu được lãi thấp hơn. 3) Tăng thu nhập hoặc giảm chi phí. ' +
      '4) Tránh vay thêm khi đang có nợ cao.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'debt_management',
    tags: ['debt', 'loan', 'dti'],
  },
  {
    id: 'kb-003',
    title: 'Ngân sách và quy tắc 50/30/20',
    content:
      'Quy tắc 50/30/20 là hướng dẫn phân bổ thu nhập: 50% nhu cầu thiết yếu (nhà cửa, ăn uống, đi lại), ' +
      '30% mong muốn (giải trí, du lịch, mua sắm), 20% tiết kiệm và trả nợ. ' +
      'Cách áp dụng: 1) Tính tổng thu nhập hàng tháng. 2) Phân bổ theo tỷ lệ. ' +
      '3) Điều chỉnh theo tình hình thực tế. 4) Theo dõi chi tiêu hàng tháng. ' +
      'Lưu ý: Đây là hướng dẫn tham khảo, có thể điều chỉnh theo từng hoàn cảnh.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'budgeting',
    tags: ['budget', '50-30-20', 'allocation'],
  },
  {
    id: 'kb-004',
    title: 'Lập kế hoạch mục tiêu tài chính',
    content:
      'Để đạt mục tiêu tài chính: 1) Xác định rõ mục tiêu và số tiền cần. 2) Đặt thời hạn cụ thể. ' +
      '3) Tính số tiền cần tiết kiệm hàng tháng. 4) Đánh giá khả thi dựa trên dòng tiền tự do. ' +
      '5) Lập 3 kịch bản: bảo thủ, cơ sở, lạc quan. 6) Theo dõi tiến độ định kỳ. ' +
      '7) Điều chỉnh khi có thay đổi về thu nhập, chi phí, hoặc thị trường. ' +
      'Nên ưu tiên mục tiêu theo tính cấp bách: dự phòng > trả nợ > tích lũy > đầu tư.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'goal_planning',
    tags: ['goal', 'planning', 'savings'],
  },
  {
    id: 'kb-005',
    title: 'Điểm sức khỏe tài chính',
    content:
      'Điểm sức khỏe tài chính tổng hợp các yếu tố: dòng tiền (25%), quỹ dự phòng (20%), nợ (20%), ' +
      'tiết kiệm (15%), tiến độ mục tiêu (20%). Điểm từ 0-100. ' +
      'Trên 85: xuất sắc. 70-84: tốt. 55-69: khá. 40-54: trung bình. Dưới 40: cần cải thiện. ' +
      'Mỗi component có recommendation cụ thể. Điểm này giúp người dùng hiểu tổng quan ' +
      'và biết cần ưu tiên cải thiện vùng nào.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'financial_health',
    tags: ['health', 'score', 'assessment'],
  },
  {
    id: 'kb-006',
    title: 'Mua nhà - Cân nhắc tài chính',
    content:
      'Khi cân nhắc mua nhà: 1) Tính tổng chi phí sở hữu (giá + thuế + bảo hiểm + bảo trì). ' +
      '2) Đánh giá khả năng trả trước (thường 20-30% giá trị). 3) Tính khoản vay và lãi suất. ' +
      '4) Đảm bảo trả nợ hàng tháng không quá 30% thu nhập. 5) Dự trù chi phí phát sinh. ' +
      '6) Cân nhắc thời gian giữ nhà (tối thiểu 5 năm để bù đắp chi phí giao dịch). ' +
      'Lưu ý: Đây là thông tin giáo dục, không phải lời khuyên đầu tư.',
    source: 'AI Financial Coach Knowledge Base',
    version: '1.0',
    effectiveDate: '2025-01-01',
    category: 'goal_planning',
    tags: ['house', 'mortgage', 'real_estate'],
  },
];
