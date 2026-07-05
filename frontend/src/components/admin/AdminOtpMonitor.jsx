import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { RefreshCw, Clock, Copy, User } from 'lucide-react';

export default function AdminOtpMonitor() {
  const [otps, setOtps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchActiveOtps = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/otps');
      if (data.success) {
        setOtps(data.active_otps || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load OTPs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOtps();
    const interval = setInterval(fetchActiveOtps, 8000); // Auto-refresh every 8s
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (otp, username) => {
    navigator.clipboard.writeText(otp);
    // Simple toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-5 py-2 rounded-2xl shadow-xl z-[200]';
    toast.textContent = `OTP for ${username} copied to clipboard`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold text-navy flex items-center gap-3">
            OTP Live Monitor
            <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-mono tracking-widest">LIVE</span>
          </h2>
          <p className="text-slate-600">Real-time view of active one-time passwords for login attempts</p>
        </div>
        <button 
          onClick={fetchActiveOtps} 
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-2xl border border-slate-300 hover:bg-white disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading && otps.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Loading active OTP sessions...</div>
        ) : otps.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <div className="font-medium text-lg text-slate-700">No active OTPs right now</div>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">When a user attempts to log in, their generated OTP will appear here instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[640px]">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>OTP Code</th>
                  <th>Expires In</th>
                  <th className="text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {otps.map((otpItem) => (
                  <tr key={otpItem.user_id} className="hover:bg-slate-50">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-navy" />
                        </div>
                        <div>
                          <div className="font-medium">{otpItem.full_name}</div>
                          <div className="text-xs text-slate-500 font-mono">@{otpItem.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-2xl tracking-[6px] font-semibold text-navy tabular-nums select-all">
                        {otpItem.otp}
                      </div>
                    </td>
                    <td>
                      <div className="inline-flex items-center gap-1.5 text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                        <Clock className="w-3.5 h-3.5" /> {otpItem.time_remaining}
                      </div>
                    </td>
                    <td className="text-right pr-6">
                      <button 
                        onClick={() => copyToClipboard(otpItem.otp, otpItem.username)}
                        className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-2xl border border-slate-300 hover:bg-white active:bg-slate-100"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy OTP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-500 px-1 flex items-center gap-2">
        {lastUpdated && <>Last updated: {lastUpdated.toLocaleTimeString()}</>}
        <span className="flex-1" />
        Auto-refreshes every 8 seconds
      </div>
    </div>
  );
}
