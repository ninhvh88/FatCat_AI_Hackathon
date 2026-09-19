import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';

export default function Landing() {
  const navigate = useNavigate();

  const handleDemo = async () => {
    try {
      await profileApi.loadDemo();
      localStorage.setItem('userId', 'demo-user-minhanh');
    } catch {
      // Backend might not be ready, still navigate
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
          Innovation Prototype
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Hiểu tiền của bạn.
          <br />
          <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Chủ động tương lai.
          </span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          AI Financial Coach giúp bạn hiểu sức khỏe tài chính, lập mục tiêu và
          mô phỏng những quyết định quan trọng trước khi thực hiện.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            onClick={() => navigate('/onboarding')}
            className="btn-primary text-lg px-8 py-4"
          >
            Khám phá tài chính của tôi
          </button>
          <button
            onClick={handleDemo}
            className="btn-secondary text-lg px-8 py-4"
          >
            Try Demo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon="📊"
            title="Financial Health Score"
            desc="Đánh giá sức khỏe tài chính tổng quan với breakdown chi tiết."
          />
          <FeatureCard
            icon="🎯"
            title="Goal Planner"
            desc="Lập kế hoạch mục tiêu với dự phóng và 3 kịch bản tiết kiệm."
          />
          <FeatureCard
            icon="🔮"
            title="Scenario Simulator"
            desc="Mô phỏng các quyết định tài chính trước khi thực hiện."
          />
          <FeatureCard
            icon="🤖"
            title="AI Financial Coach"
            desc="Trò chuyện với AI hiểu hồ sơ tài chính của bạn."
          />
          <FeatureCard
            icon="📋"
            title="Action Plan"
            desc="Kế hoạch hành động cá nhân hóa với ưu tiên rõ ràng."
          />
          <FeatureCard
            icon="🔒"
            title="AI Guardrails"
            desc="AI không tự tính toán, không bịa dữ liệu, sử dụng ngôn ngữ thận trọng."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card text-left">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
