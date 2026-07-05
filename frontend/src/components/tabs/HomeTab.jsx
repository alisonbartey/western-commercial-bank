import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatDateTime, isOutgoingTransaction } from '../../utils/helpers';
import { ArrowUpRight, ArrowDownLeft, Clock, HandCoins } from 'lucide-react';

function TransactionRow({ txn, userId }) {
  const isDeposit = txn.type === 'deposit';
  const isExternal = txn.type === 'external_transfer';
  const isOutgoing = isOutgoingTransaction(txn, userId);

  const otherParty = isDeposit
    ? 'Account Deposit'
    : isExternal
      ? 'External Transfer'
      : isOutgoing
        ? txn.to_name || txn.to_username
        : txn.from_name || txn.from_username;

  return (
    <div className="txn-row px-5">
      <div className="flex items-center gap-4">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          isDeposit || !isOutgoing ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
        }`}>
          {isDeposit || !isOutgoing ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>
        <div>
          <div className="font-medium text-sm">{otherParty}</div>
          <div className="text-xs text-slate-500">{txn.description}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-semibold tabular-nums ${isOutgoing ? 'text-red-600' : 'text-emerald-600'}`}>
          {isOutgoing ? '-' : '+'}{formatCurrency(txn.amount)}
        </div>
        <div className="text-[10px] text-slate-400">{formatDateTime(txn.created_at)}</div>
      </div>
    </div>
  );
}

export default function HomeTab({ onSwitchTab, onViewTransactions }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(user?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes] = await Promise.all([
        api.get('/api/user/profile'),
        api.get('/api/user/transactions?limit=6'),
      ]);

      if (profileRes.data.success) {
        setBalance(profileRes.data.user.balance);
      }
      if (txnRes.data.success) {
        setTransactions(txnRes.data.transactions);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    const handleSwitchTab = (e) => onSwitchTab?.(e.detail);
    window.addEventListener('refresh-dashboard', handleRefresh);
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
      window.removeEventListener('switch-tab', handleSwitchTab);
    };
  }, [onSwitchTab]);

  useEffect(() => {
    if (user?.balance !== undefined) {
      setBalance(user.balance);
    }
  }, [user?.balance]);

  return (
    <div className="space-y-6">
      <div className="card p-7 bg-gradient-to-br from-navy to-navy-800 text-white rounded-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-white/70 text-sm tracking-widest">AVAILABLE BALANCE</div>
            <div className="text-5xl font-semibold tracking-tighter mt-2 tabular-nums">
              {formatCurrency(balance)}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-white/10 text-xs rounded-full">USD CHECKING</div>
          </div>
        </div>
        <div className="mt-8 text-xs text-white/60 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Last updated just now
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSwitchTab?.('transfers')}
          className="card p-5 flex flex-col items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors text-center"
        >
          <ArrowUpRight className="w-6 h-6 text-navy mb-2" />
          <span className="font-medium text-sm">Send Money</span>
        </button>
        <button
          onClick={() => onSwitchTab?.('request')}
          className="card p-5 flex flex-col items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors text-center"
        >
          <HandCoins className="w-6 h-6 text-navy mb-2" />
          <span className="font-medium text-sm">Request Funds</span>
        </button>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <div className="font-semibold text-lg text-navy">Recent Activity</div>
          <button
            onClick={onViewTransactions}
            className="text-xs text-navy font-medium hover:underline underline-offset-2"
          >
            View all
          </button>
        </div>

        <div className="card divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No transactions yet. Send a transfer or request funds to get started.
            </div>
          ) : (
            transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} userId={user?.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
