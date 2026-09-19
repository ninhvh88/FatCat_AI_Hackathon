import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Scenarios from './pages/Scenarios';
import LifeEvents from './pages/LifeEvents';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { healthCheck } from './api';

export default function App() {
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    healthCheck().then((data) => setBackendReady(!!data));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      {backendReady === false && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
          ⚠️ Backend chưa sẵn sàng. Một số tính năng có thể không hoạt động.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/life-events" element={<LifeEvents />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="text-6xl">404</p>
            <p className="text-gray-500">Trang không tìm thấy</p>
            <Link to="/dashboard" className="btn-primary">Về Dashboard</Link>
          </div>
        } />
      </Routes>
    </div>
  );
}
