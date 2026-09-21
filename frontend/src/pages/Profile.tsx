import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';

interface ProfileListItem {
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  summary: { age: number; monthlyIncome: number; totalAssets: number; loanBalance: number };
}

interface FormState {
  name: string; age: number; maritalStatus: string; dependents: number;
  monthlyIncome: number; otherIncome: number;
  housing: number; food: number; transportation: number; family: number; entertainment: number; otherExpense: number;
  cash: number; savings: number; stocks: number; realEstate: number; otherAsset: number;
  loanBalance: number; interestRate: number; monthlyRepayment: number;
  goalName: string; targetAmount: number; targetYears: number;
}

const EMPTY_FORM: FormState = {
  name: '', age: 28, maritalStatus: 'SINGLE', dependents: 0,
  monthlyIncome: 30000000, otherIncome: 0,
  housing: 5000000, food: 4000000, transportation: 2000000, family: 2000000, entertainment: 3000000, otherExpense: 2000000,
  cash: 50000000, savings: 200000000, stocks: 0, realEstate: 0, otherAsset: 0,
  loanBalance: 200000000, interestRate: 10, monthlyRepayment: 4400000,
  goalName: 'Mua nhà', targetAmount: 3000000000, targetYears: 5,
};

function fmtVND(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [valErrs, setValErrs] = useState<Record<string, string>>({});

  const loadProfiles = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await profileApi.list();
      setProfiles(data.profiles || []);
    } catch { setProfiles([]); }
    finally { setListLoading(false); }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);

  const set = (key: keyof FormState, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (valErrs[key]) setValErrs((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên profile';
    if (form.age < 18 || form.age > 100) e.age = 'Tuổi 18-100';
    if (form.dependents < 0 || form.dependents > 20) e.dependents = '0-20';
    if (form.monthlyIncome < 0) e.monthlyIncome = 'Không âm';
    if (form.interestRate < 0 || form.interestRate > 100) e.interestRate = '0-100%';
    if (form.targetYears < 0 || form.targetYears > 50) e.targetYears = '0-50 năm';
    if (!form.goalName.trim()) e.goalName = 'Vui lòng nhập mục tiêu';
    setValErrs(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (userId?: string) => {
    const td = new Date(); td.setFullYear(td.getFullYear() + form.targetYears);
    return {
      userId, name: form.name,
      personal: { age: form.age, maritalStatus: form.maritalStatus, dependents: form.dependents },
      income: { monthlyIncome: form.monthlyIncome, otherIncome: form.otherIncome },
      expenses: { housing: form.housing, food: form.food, transportation: form.transportation, family: form.family, entertainment: form.entertainment, other: form.otherExpense },
      assets: { cash: form.cash, savings: form.savings, stocks: form.stocks, realEstate: form.realEstate, other: form.otherAsset },
      liabilities: { loanBalance: form.loanBalance, interestRate: form.interestRate, monthlyRepayment: form.monthlyRepayment },
      goals: [{ goalType: 'BUY_HOUSE', goalName: form.goalName, targetAmount: form.targetAmount, targetDate: td.toISOString(), currentAllocated: form.cash + form.savings }],
    };
  };

  const submit = async () => {
    if (loading) return;
    if (!validate()) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (editingUserId) {
        await profileApi.update(editingUserId, buildPayload(editingUserId));
        setSuccess(`✅ Đã cập nhật profile "${form.name}" thành công`);
        localStorage.setItem('userId', editingUserId);
      } else {
        const result = await profileApi.create(buildPayload());
        localStorage.setItem('userId', result.userId);
        setSuccess(`✅ Đã tạo profile "${form.name}" thành công`);
      }
      await loadProfiles();
      setShowForm(false); setEditingUserId(null); setForm(EMPTY_FORM); setValErrs({});
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 400) setError('❌ Thông tin không hợp lệ. Vui lòng kiểm tra lại.');
      else if (s === 401 || s === 403) setError('❌ Không có quyền thực hiện.');
      else if (s === 500) setError('❌ Không thể lưu profile. Vui lòng thử lại.');
      else if (err?.message?.includes('Network') || err?.message?.includes('fetch')) setError('❌ Lỗi kết nối mạng.');
      else setError('❌ Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  const editProfile = async (userId: string) => {
    try {
      const p = await profileApi.get(userId);
      setForm({
        name: profiles.find((x) => x.userId === userId)?.name || '',
        age: p.personal?.age ?? 28, maritalStatus: p.personal?.maritalStatus ?? 'SINGLE', dependents: p.personal?.dependents ?? 0,
        monthlyIncome: p.income?.monthlyIncome ?? 0, otherIncome: p.income?.otherIncome ?? 0,
        housing: p.expenses?.housing ?? 0, food: p.expenses?.food ?? 0, transportation: p.expenses?.transportation ?? 0,
        family: p.expenses?.family ?? 0, entertainment: p.expenses?.entertainment ?? 0, otherExpense: p.expenses?.other ?? 0,
        cash: p.assets?.cash ?? 0, savings: p.assets?.savings ?? 0, stocks: p.assets?.stocks ?? 0,
        realEstate: p.assets?.realEstate ?? 0, otherAsset: p.assets?.other ?? 0,
        loanBalance: p.liabilities?.loanBalance ?? 0, interestRate: p.liabilities?.interestRate ?? 0, monthlyRepayment: p.liabilities?.monthlyRepayment ?? 0,
        goalName: p.goals?.[0]?.goalName ?? 'Mua nhà', targetAmount: p.goals?.[0]?.targetAmount ?? 0,
        targetYears: p.goals?.[0]?.targetDate ? Math.max(0, Math.round((new Date(p.goals[0].targetDate).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000))) : 5,
      });
      setEditingUserId(userId); setShowForm(true); setError(null); setSuccess(null); setValErrs({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setError('❌ Không thể tải profile.'); }
  };

  const deleteProfile = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa profile này?')) return;
    try {
      await profileApi.delete(userId);
      setSuccess('✅ Đã xóa profile thành công');
      await loadProfiles();
      if (localStorage.getItem('userId') === userId) localStorage.removeItem('userId');
    } catch { setError('❌ Không thể xóa profile.'); }
  };

  const useProfile = (userId: string) => { localStorage.setItem('userId', userId); navigate('/dashboard'); };
  const startCreate = () => { setForm(EMPTY_FORM); setEditingUserId(null); setShowForm(true); setError(null); setSuccess(null); setValErrs({}); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelForm = () => { setShowForm(false); setEditingUserId(null); setForm(EMPTY_FORM); setValErrs({}); };
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const Field = ({ label, value, onChange, error, type = 'number' }: { label: string; value: any; onChange: (v: any) => void; error?: string; type?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input type={type} className={`input ${error ? 'border-red-500' : ''}`} value={value} onChange={(e) => onChange(type === 'number' ? +e.target.value : e.target.value)} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý Financial Profile</h1>
      <p className="text-gray-500 mb-6">Tạo, chỉnh sửa và quản lý hồ sơ tài chính của bạn</p>

      {success && <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{success}</div>}
      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {/* Profile List */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Danh sách Profile</h2>
          <button onClick={startCreate} className="btn-primary text-sm px-4 py-2">+ Tạo mới Profile</button>
        </div>
        {listLoading ? (
          <p className="text-gray-400 text-sm">Đang tải...</p>
        ) : profiles.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có profile nào. Click "Tạo mới Profile" để bắt đầu.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.userId} className={`flex items-center justify-between p-4 rounded-lg border ${activeUserId === p.userId ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{p.name}</span>
                    {activeUserId === p.userId && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Đang dùng</span>}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{p.summary.age} tuổi · Thu nhập {fmtVND(p.summary.monthlyIncome)}/tháng · Tài sản {fmtVND(p.summary.totalAssets)} · Nợ {fmtVND(p.summary.loanBalance)}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => useProfile(p.userId)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Mở</button>
                  <button onClick={() => editProfile(p.userId)} className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Sửa</button>
                  {p.userId !== 'demo-user-minhanh' && p.userId !== 'demo' && (
                    <button onClick={() => deleteProfile(p.userId)} className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">Xóa</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{editingUserId ? 'Chỉnh sửa Profile' : 'Tạo Profile mới'}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 text-sm">✕ Hủy</button>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">📋 Thông tin cá nhân</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Field label="Tên Profile" type="text" value={form.name} onChange={(v) => set('name', v)} error={valErrs.name} />
              <Field label="Tuổi" value={form.age} onChange={(v) => set('age', v)} error={valErrs.age} />
              <div>
                <label className="label">Tình trạng</label>
                <select className="input" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                  <option value="SINGLE">Độc thân</option><option value="MARRIED">Đã kết hôn</option>
                  <option value="DIVORCED">Ly hôn</option><option value="WIDOWED">Góa bụa</option>
                </select>
              </div>
              <Field label="Người phụ thuộc" value={form.dependents} onChange={(v) => set('dependents', v)} error={valErrs.dependents} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">💰 Thu nhập (VND/tháng)</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Thu nhập hàng tháng" value={form.monthlyIncome} onChange={(v) => set('monthlyIncome', v)} error={valErrs.monthlyIncome} />
              <Field label="Thu nhập khác" value={form.otherIncome} onChange={(v) => set('otherIncome', v)} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">🏠 Chi tiêu (VND/tháng)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Field label="Nhà cửa" value={form.housing} onChange={(v) => set('housing', v)} />
              <Field label="Ăn uống" value={form.food} onChange={(v) => set('food', v)} />
              <Field label="Di chuyển" value={form.transportation} onChange={(v) => set('transportation', v)} />
              <Field label="Gia đình" value={form.family} onChange={(v) => set('family', v)} />
              <Field label="Giải trí" value={form.entertainment} onChange={(v) => set('entertainment', v)} />
              <Field label="Khác" value={form.otherExpense} onChange={(v) => set('otherExpense', v)} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">💎 Tài sản (VND)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Field label="Tiền mặt" value={form.cash} onChange={(v) => set('cash', v)} />
              <Field label="Tiết kiệm" value={form.savings} onChange={(v) => set('savings', v)} />
              <Field label="Cổ phiếu" value={form.stocks} onChange={(v) => set('stocks', v)} />
              <Field label="Bất động sản" value={form.realEstate} onChange={(v) => set('realEstate', v)} />
              <Field label="Tài sản khác" value={form.otherAsset} onChange={(v) => set('otherAsset', v)} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">📉 Nợ & Trả nợ</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Field label="Tổng nợ (VND)" value={form.loanBalance} onChange={(v) => set('loanBalance', v)} />
              <Field label="Lãi suất (%/năm)" value={form.interestRate} onChange={(v) => set('interestRate', v)} error={valErrs.interestRate} />
              <Field label="Trả nợ/tháng (VND)" value={form.monthlyRepayment} onChange={(v) => set('monthlyRepayment', v)} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">🎯 Mục tiêu tài chính</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Field label="Tên mục tiêu" type="text" value={form.goalName} onChange={(v) => set('goalName', v)} error={valErrs.goalName} />
              <Field label="Số tiền mục tiêu (VND)" value={form.targetAmount} onChange={(v) => set('targetAmount', v)} />
              <Field label="Thời hạn (năm)" value={form.targetYears} onChange={(v) => set('targetYears', v)} error={valErrs.targetYears} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submit}
                disabled={loading}
                className={`btn-primary flex-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Đang lưu...' : editingUserId ? 'Cập nhật Profile' : 'Tạo Profile'}
              </button>
              <button onClick={cancelForm} className="btn-secondary px-6" disabled={loading}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}