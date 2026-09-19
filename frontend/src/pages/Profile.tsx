import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    age: 28, maritalStatus: 'SINGLE', dependents: 0,
    monthlyIncome: 30000000, otherIncome: 0,
    housing: 5000000, food: 4000000, transportation: 2000000,
    family: 2000000, entertainment: 3000000, otherExpense: 2000000,
    cash: 50000000, savings: 200000000, stocks: 0, realEstate: 0, otherAsset: 0,
    loanBalance: 200000000, interestRate: 10, monthlyRepayment: 4400000,
    goalName: 'Mua nhà', targetAmount: 3000000000, targetYears: 5,
  });

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const userId = `user-${Date.now()}`;
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + form.targetYears);

    try {
      await profileApi.create({
        userId,
        personal: { age: form.age, maritalStatus: form.maritalStatus, dependents: form.dependents },
        income: { monthlyIncome: form.monthlyIncome, otherIncome: form.otherIncome },
        expenses: {
          housing: form.housing, food: form.food, transportation: form.transportation,
          family: form.family, entertainment: form.entertainment, other: form.otherExpense,
        },
        assets: {
          cash: form.cash, savings: form.savings, stocks: form.stocks,
          realEstate: form.realEstate, other: form.otherAsset,
        },
        liabilities: {
          loanBalance: form.loanBalance, interestRate: form.interestRate,
          monthlyRepayment: form.monthlyRepayment,
        },
        goals: [{
          goalType: 'BUY_HOUSE', goalName: form.goalName,
          targetAmount: form.targetAmount, targetDate: targetDate.toISOString(),
          currentAllocated: form.cash + form.savings,
        }],
      });
      localStorage.setItem('userId', userId);
      navigate('/dashboard');
    } catch (err) {
      alert('Lỗi khi tạo profile. Kiểm tra backend đang chạy.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Financial Profile</h1>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Personal</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Age</label>
            <input type="number" className="input" value={form.age} onChange={(e) => set('age', +e.target.value)} />
          </div>
          <div>
            <label className="label">Marital Status</label>
            <select className="input" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>
          </div>
          <div>
            <label className="label">Dependents</label>
            <input type="number" className="input" value={form.dependents} onChange={(e) => set('dependents', +e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Income (VND/month)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly Income</label>
            <input type="number" className="input" value={form.monthlyIncome} onChange={(e) => set('monthlyIncome', +e.target.value)} />
          </div>
          <div>
            <label className="label">Other Income</label>
            <input type="number" className="input" value={form.otherIncome} onChange={(e) => set('otherIncome', +e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Expenses (VND/month)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            ['housing', 'Housing'], ['food', 'Food'], ['transportation', 'Transport'],
            ['family', 'Family'], ['entertainment', 'Entertainment'], ['otherExpense', 'Other'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="number" className="input" value={(form as any)[key]} onChange={(e) => set(key, +e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Assets (VND)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            ['cash', 'Cash'], ['savings', 'Savings'], ['stocks', 'Stocks'],
            ['realEstate', 'Real Estate'], ['otherAsset', 'Other'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="number" className="input" value={(form as any)[key]} onChange={(e) => set(key, +e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Liabilities</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Loan Balance</label>
            <input type="number" className="input" value={form.loanBalance} onChange={(e) => set('loanBalance', +e.target.value)} />
          </div>
          <div>
            <label className="label">Interest Rate (%)</label>
            <input type="number" className="input" value={form.interestRate} onChange={(e) => set('interestRate', +e.target.value)} />
          </div>
          <div>
            <label className="label">Monthly Repayment</label>
            <input type="number" className="input" value={form.monthlyRepayment} onChange={(e) => set('monthlyRepayment', +e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Goal</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Goal Name</label>
            <input className="input" value={form.goalName} onChange={(e) => set('goalName', e.target.value)} />
          </div>
          <div>
            <label className="label">Target Amount</label>
            <input type="number" className="input" value={form.targetAmount} onChange={(e) => set('targetAmount', +e.target.value)} />
          </div>
          <div>
            <label className="label">Years to Target</label>
            <input type="number" className="input" value={form.targetYears} onChange={(e) => set('targetYears', +e.target.value)} />
          </div>
        </div>
      </div>

      <button onClick={submit} className="btn-primary w-full">Tạo Profile & Xem Dashboard</button>
    </div>
  );
}
