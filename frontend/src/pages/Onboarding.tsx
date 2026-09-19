import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';

export default function Onboarding() {
  const navigate = useNavigate();

  const handleDemo = async () => {
    try {
      await profileApi.loadDemo();
      localStorage.setItem('userId', 'demo-user-minhanh');
    } catch { /* ignore */ }
    navigate('/dashboard');
  };

  const handleManual = () => navigate('/profile');

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Bắt đầu</h1>
      <p className="text-gray-500 text-center mb-12">Chọn cách bạn muốn sử dụng AI Financial Coach</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={handleDemo}
          className="card text-left hover:border-primary-300 transition-all group"
        >
          <div className="text-4xl mb-4">👤</div>
          <h3 className="font-semibold text-gray-900 mb-2">Load Demo Persona</h3>
          <p className="text-sm text-gray-600 mb-4">
            Nguyễn Minh Anh, 28 tuổi, thu nhập 30M/tháng, mục tiêu mua nhà 3 tỷ
          </p>
          <span className="text-primary-600 text-sm font-medium group-hover:underline">
            Bắt đầu ngay →
          </span>
        </button>

        <button
          onClick={handleManual}
          className="card text-left hover:border-primary-300 transition-all group"
        >
          <div className="text-4xl mb-4">✏️</div>
          <h3 className="font-semibold text-gray-900 mb-2">Nhập dữ liệu manually</h3>
          <p className="text-sm text-gray-600 mb-4">
            Tự nhập thông tin tài chính cá nhân của bạn
          </p>
          <span className="text-primary-600 text-sm font-medium group-hover:underline">
            Nhập thông tin →
          </span>
        </button>
      </div>
    </div>
  );
}
