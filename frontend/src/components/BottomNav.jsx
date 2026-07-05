import React from 'react';
import { Home, ArrowLeftRight, Compass, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transfers', label: 'Transfer', icon: ArrowLeftRight },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bottom-nav flex items-center justify-around w-[94%] max-w-[420px] shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-2 rounded-3xl transition-all active:scale-95
              ${isActive
                ? 'text-navy bg-navy/5'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon className={`w-5 h-5 mb-0.5 transition-all ${isActive ? 'scale-110' : ''}`} />
            <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
