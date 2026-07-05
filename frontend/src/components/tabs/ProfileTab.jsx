import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  User, Mail, Calendar, Shield, LogOut, FileText, Lock, ChevronRight,
} from 'lucide-react';

export default function ProfileTab({ onViewTransactions }) {
  const { user, logout } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      const { data } = await api.post('/api/user/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      if (data.success) {
        setPasswordMsg({ type: 'success', text: data.message });
        setPasswordForm({ current: '', newPass: '', confirm: '' });
        setShowPasswordForm(false);
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: FileText, label: 'Transaction History', action: onViewTransactions },
    { icon: Lock, label: 'Change Password', action: () => setShowPasswordForm(true) },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-10">
      <div className="card p-7 text-center">
        <div className="w-20 h-20 mx-auto bg-navy/10 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-navy" />
        </div>
        <div className="text-2xl font-semibold text-navy">{user?.full_name}</div>
        <div className="text-slate-500">@{user?.username}</div>

        <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
          <Shield className="w-3.5 h-3.5" /> VERIFIED CUSTOMER
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Available Balance</p>
        <p className="text-3xl font-semibold text-navy tabular-nums">{formatCurrency(user?.balance || 0)}</p>
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {menuItems.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-navy">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      <div className="card p-6">
        <h4 className="font-semibold mb-5 px-1 text-navy">Account Information</h4>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-4 px-1">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">EMAIL ADDRESS</div>
              <div>{user?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">MEMBER SINCE</div>
              <div>{user?.created_at ? formatDate(user.created_at) : 'N/A'}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-1">
            <Shield className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">ACCOUNT TYPE</div>
              <div className="capitalize">{user?.role} Account • Full Access</div>
            </div>
          </div>
        </div>
      </div>

      {passwordMsg.text && (
        <div className={`card p-4 text-sm ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {passwordMsg.text}
        </div>
      )}

      {showPasswordForm && (
        <form onSubmit={handlePasswordChange} className="card p-6 space-y-4">
          <h4 className="font-semibold text-navy">Change Password</h4>
          <input
            type="password"
            placeholder="Current password"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={passwordForm.newPass}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            required
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowPasswordForm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      )}

      <div className="card p-5 bg-amber-50 border-amber-100 text-amber-800 text-sm">
        Your account is protected with two-factor authentication (OTP).
        Never share your login credentials or OTP codes.
      </div>

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-3 py-4 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors rounded-2xl font-medium border border-red-100"
      >
        <LogOut className="w-4 h-4" /> Sign Out of Account
      </button>

      <div className="text-center text-[10px] text-slate-400 pt-4">
        Western Commercial Bank • Member FDIC<br />
        Customer Support: support@westernbank.com
      </div>
    </div>
  );
}
