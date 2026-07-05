import React from 'react';
import { LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BankLogo from './BankLogo';
import { getGreeting } from '../utils/helpers';

export default function TopHeader({ title, user }) {
  const { logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BankLogo size="sm" showText={false} variant="dark" />
          <div className="min-w-0">
            <div className="font-semibold text-xl text-navy tracking-tight truncate">{title}</div>
            <div className="text-xs text-slate-500 -mt-0.5 truncate">
              Good {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Customer'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="p-3 text-slate-400 hover:text-navy transition-colors rounded-2xl hover:bg-slate-100" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-2xl hover:bg-slate-100 text-slate-600 hover:text-navy transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
