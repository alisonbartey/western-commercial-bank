import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, KeyRound, BarChart3, LogOut } from 'lucide-react';
import BankLogo from '../components/BankLogo';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminOtpMonitor from '../components/admin/AdminOtpMonitor';

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('users');
  const { user, logout, isAdmin } = useAuth();

  const portalTitle = isAdmin ? 'Administrator Portal' : 'Moderator Portal';

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Admin Top Navigation */}
      <header className="bg-navy text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BankLogo size="sm" variant="light" />
            <div>
              <div className="font-semibold tracking-tight">{portalTitle}</div>
              <div className="text-[10px] text-white/60 -mt-0.5">Member FDIC</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="hidden sm:block text-right">
              <div className="font-medium">{user?.full_name}</div>
              <div className="text-xs text-white/60">{user?.username}</div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-white/10 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Admin Sub Navigation */}
        <div className="border-t border-white/10 bg-navy-800">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 text-sm">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'users' 
                ? 'border-white text-white font-medium' 
                : 'border-transparent text-white/70 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Manage Users
            </button>
            <button
              onClick={() => setActiveTab('otps')}
              className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'otps' 
                ? 'border-white text-white font-medium' 
                : 'border-transparent text-white/70 hover:text-white'}`}
            >
              <KeyRound className="w-4 h-4" /> OTP Live Monitor
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-all ${activeTab === 'stats' 
                ? 'border-white text-white font-medium' 
                : 'border-transparent text-white/70 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4" /> Overview
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'users' && <AdminUsersTab isAdmin={isAdmin} />}
        {activeTab === 'otps' && <AdminOtpMonitor />}
        {activeTab === 'stats' && (
          <div className="card p-8">
            <h3 className="text-xl font-semibold mb-4">System Overview</h3>
            <p className="text-slate-600">Real-time banking statistics and controls will appear here in a full implementation.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-2xl border">Total Users: <span className="font-semibold text-navy">128</span></div>
              <div className="p-5 bg-white rounded-2xl border">Active Sessions: <span className="font-semibold text-navy">47</span></div>
              <div className="p-5 bg-white rounded-2xl border">Pending OTPs: <span className="font-semibold text-navy">3</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
