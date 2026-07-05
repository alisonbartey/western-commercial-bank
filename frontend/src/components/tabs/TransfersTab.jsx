import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { Send, CheckCircle, AlertCircle, UserCheck, Building, Globe } from 'lucide-react';

export default function TransfersTab() {
  const { user, updateBalance, refreshProfile } = useAuth();
  const [tab, setTab] = useState('internal');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const [external, setExternal] = useState({
    routing_number: '',
    account_number: '',
    recipient_name: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const isRestricted = !!user?.is_restricted;

  useEffect(() => {
    if (tab !== 'internal' || !recipient || recipient.length < 3) {
      setRecipientInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const { data } = await api.get(`/api/user/lookup/${encodeURIComponent(recipient.trim())}`);
        if (data.success) setRecipientInfo(data.recipient);
        else setRecipientInfo(null);
      } catch {
        setRecipientInfo(null);
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipient, tab]);

  const handleInternal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!recipient || !amount) {
      setError('Please enter recipient username and amount.');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount > (user?.balance || 0)) {
      setError('Transfer amount exceeds your available balance.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/user/transfer', {
        recipient_username: recipient,
        amount: transferAmount,
        description: description || 'Bank transfer via mobile app',
      });

      if (data.success) {
        setSuccess({
          message: data.message,
          amount: transferAmount,
          recipient: data.transaction.recipient,
          newBalance: data.transaction.new_balance,
        });
        updateBalance(data.transaction.new_balance);
        setRecipient('');
        setAmount('');
        setDescription('');
        setRecipientInfo(null);
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExternal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    try {
      const transferAmount = parseFloat(external.amount);
      const { data } = await api.post('/api/user/transfer/external', {
        routing_number: external.routing_number,
        account_number: external.account_number,
        amount: transferAmount,
        recipient_name: external.recipient_name,
        description: external.description || 'External ACH/Wire transfer',
      });

      if (data.success) {
        setSuccess({
          message: data.message,
          amount: transferAmount,
          recipient: external.recipient_name || 'External account',
          newBalance: data.transaction.new_balance,
        });
        updateBalance(data.transaction.new_balance);
        setExternal({ routing_number: '', account_number: '', recipient_name: '', amount: '', description: '' });
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'External transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-navy">Transfers</h2>
        <p className="text-slate-600 text-sm mt-1">Send money within WCB or to external banks</p>
      </div>

      <div className="card p-4 mb-6 bg-slate-50">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Available Balance</p>
        <p className="text-2xl font-semibold text-navy tabular-nums mt-1">{formatCurrency(user?.balance || 0)}</p>
      </div>

      {isRestricted && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 mt-px flex-shrink-0" />
          <div>
            <p className="font-semibold">Account Restricted</p>
            <p className="mt-1 text-red-600">
              Your account has been restricted and cannot perform transfers or other banking operations.
              Please contact your bank administrator.
            </p>
          </div>
        </div>
      )}

      <div className="flex bg-white rounded-2xl p-1 border border-slate-200 mb-6">
        <button
          onClick={() => { setTab('internal'); setError(''); setSuccess(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            tab === 'internal' ? 'bg-navy text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          <Building className="w-4 h-4" /> WCB Transfer
        </button>
        <button
          onClick={() => { setTab('external'); setError(''); setSuccess(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            tab === 'external' ? 'bg-navy text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          <Globe className="w-4 h-4" /> External
        </button>
      </div>

      {success && (
        <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-3xl flex gap-4">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-700">Transfer Successful!</div>
            <div className="text-emerald-600 mt-1">
              You sent {formatCurrency(success.amount)} to <span className="font-medium">{success.recipient}</span>.<br />
              New balance: {formatCurrency(success.newBalance)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 mt-px flex-shrink-0" />
          {error}
        </div>
      )}

      {tab === 'internal' ? (
        <form onSubmit={handleInternal} className="card p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">RECIPIENT USERNAME</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. amara_eze"
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 text-lg placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-navy/10"
              required
            />
            {lookupLoading && <p className="text-[10px] text-slate-400 mt-1.5 px-1">Looking up recipient...</p>}
            {recipientInfo && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-navy">{recipientInfo.full_name}</span>
                <span className="text-slate-500">@{recipientInfo.username}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">AMOUNT ($)</label>
            <div className="relative">
              <div className="absolute left-5 top-4 text-2xl text-slate-400 font-light">$</div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-300 focus:border-navy rounded-2xl pl-11 pr-5 py-3.5 text-3xl font-semibold tabular-nums outline-none focus:ring-2 focus:ring-navy/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">DESCRIPTION (OPTIONAL)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rent payment, invoice, gift..."
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>

          <button type="submit" disabled={loading || isRestricted || !recipient || !amount} className="btn-primary w-full py-4 disabled:opacity-50">
            {loading ? 'Processing...' : <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send Transfer</span>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleExternal} className="card p-6 space-y-5">
          <p className="text-xs text-slate-500">ACH / wire to an external U.S. bank account</p>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">ROUTING NUMBER</label>
            <input
              type="text"
              value={external.routing_number}
              onChange={(e) => setExternal({ ...external, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="9-digit routing number"
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-navy/10 font-mono"
              maxLength={9}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">ACCOUNT NUMBER</label>
            <input
              type="text"
              value={external.account_number}
              onChange={(e) => setExternal({ ...external, account_number: e.target.value })}
              placeholder="Recipient account number"
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-navy/10 font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">RECIPIENT NAME</label>
            <input
              type="text"
              value={external.recipient_name}
              onChange={(e) => setExternal({ ...external, recipient_name: e.target.value })}
              placeholder="Full name"
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">AMOUNT ($)</label>
            <div className="relative">
              <div className="absolute left-5 top-4 text-2xl text-slate-400 font-light">$</div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={external.amount}
                onChange={(e) => setExternal({ ...external, amount: e.target.value })}
                placeholder="0.00"
                className="w-full border border-slate-300 focus:border-navy rounded-2xl pl-11 pr-5 py-3.5 text-3xl font-semibold tabular-nums outline-none focus:ring-2 focus:ring-navy/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wider text-slate-500 block mb-1.5">MEMO (OPTIONAL)</label>
            <input
              type="text"
              value={external.description}
              onChange={(e) => setExternal({ ...external, description: e.target.value })}
              placeholder="Reference note"
              className="w-full border border-slate-300 focus:border-navy rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>

          <button type="submit" disabled={loading || isRestricted} className="btn-primary w-full py-4 disabled:opacity-50">
            {loading ? 'Processing...' : 'Send External Transfer'}
          </button>
        </form>
      )}
    </div>
  );
}
