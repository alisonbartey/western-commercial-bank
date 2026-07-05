import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatDate, isOutgoingTransaction } from '../../utils/helpers';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

function TransactionRow({ txn, userId }) {
  const isDeposit = txn.type === 'deposit';
  const isExternal = txn.type === 'external_transfer';
  const isOutgoing = isOutgoingTransaction(txn, userId);

  const label = isDeposit
    ? 'Account Deposit'
    : isExternal
      ? 'External Transfer'
      : isOutgoing
        ? `To ${txn.to_name || txn.to_username}`
        : `From ${txn.from_name || txn.from_username}`;

  return (
    <div className="txn-row px-5">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          isDeposit || !isOutgoing ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
        }`}>
          {isDeposit || !isOutgoing ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{label}</div>
          <div className="text-xs text-slate-500 truncate">{txn.description}</div>
          <div className="text-[10px] text-slate-400 capitalize mt-0.5">{txn.type?.replace('_', ' ') || 'transfer'}</div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <div className={`font-semibold tabular-nums ${isOutgoing ? 'text-red-600' : 'text-emerald-600'}`}>
          {isOutgoing ? '-' : '+'}{formatCurrency(txn.amount)}
        </div>
        <div className="text-[10px] text-slate-400 capitalize">{txn.status}</div>
      </div>
    </div>
  );
}

export default function TransactionsTab({ onBack }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/user/transactions?limit=100')
      .then((res) => {
        if (res.data.success) setTransactions(res.data.transactions);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = transactions.reduce((acc, txn) => {
    const date = formatDate(txn.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(txn);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-2xl hover:bg-slate-100 text-navy transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-navy">Transactions</h2>
          <p className="text-slate-600 text-sm">{transactions.length} total records</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-400">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500 font-medium">No transactions found</p>
          <p className="text-xs text-slate-400 mt-1">Your activity will appear here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, txns]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{date}</p>
            <div className="card divide-y divide-slate-100">
              {txns.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} userId={user?.id} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
