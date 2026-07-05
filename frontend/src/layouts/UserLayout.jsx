import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import TopHeader from '../components/TopHeader';
import { AlertCircle } from 'lucide-react';

import HomeTab from '../components/tabs/HomeTab';
import TransfersTab from '../components/tabs/TransfersTab';
import ExploreTab from '../components/tabs/ExploreTab';
import ProfileTab from '../components/tabs/ProfileTab';
import TransactionsTab from '../components/tabs/TransactionsTab';
import RequestFundsTab from '../components/tabs/RequestFundsTab';

const TAB_TITLES = {
  home: 'Dashboard',
  transfers: 'Transfers',
  explore: 'Explore',
  profile: 'Profile',
  request: 'Request Funds',
};

export default function UserLayout() {
  const [activeTab, setActiveTab] = useState('home');
  const [showTransactions, setShowTransactions] = useState(false);
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const handleSwitchTab = (e) => {
      const tab = e.detail;
      if (tab === 'request' || tab === 'deposit') {
        setShowTransactions(false);
        setActiveTab('request');
      } else if (['home', 'transfers', 'explore', 'profile'].includes(tab)) {
        setShowTransactions(false);
        setActiveTab(tab);
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, []);

  const handleTabChange = (tab) => {
    setShowTransactions(false);
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (showTransactions) {
      return <TransactionsTab onBack={() => setShowTransactions(false)} />;
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            onSwitchTab={handleTabChange}
            onViewTransactions={() => setShowTransactions(true)}
          />
        );
      case 'transfers':
        return <TransfersTab />;
      case 'explore':
        return <ExploreTab />;
      case 'profile':
        return <ProfileTab onViewTransactions={() => setShowTransactions(true)} />;
      case 'request':
        return <RequestFundsTab onSwitchTab={handleTabChange} />;
      default:
        return <HomeTab onSwitchTab={handleTabChange} onViewTransactions={() => setShowTransactions(true)} />;
    }
  };

  const headerTitle = showTransactions ? 'Transactions' : (TAB_TITLES[activeTab] || 'Dashboard');
  const hideBottomNav = showTransactions || activeTab === 'request';

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {!showTransactions && activeTab !== 'request' && (
        <TopHeader title={headerTitle} user={user} />
      )}

      <main className="max-w-2xl mx-auto px-4 pt-6">
        {user?.is_restricted && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 mt-px flex-shrink-0" />
            <div>
              <p className="font-semibold">Account Restricted</p>
              <p className="mt-0.5 text-red-600 text-xs">
                Banking operations are disabled. Contact your administrator for assistance.
              </p>
            </div>
          </div>
        )}
        {renderContent()}
      </main>

      {!hideBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}
