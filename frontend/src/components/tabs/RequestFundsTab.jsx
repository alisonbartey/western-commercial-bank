import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Copy, Check, Smartphone, Building2, Share2, ArrowLeft,
} from 'lucide-react';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
      <div>
        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</p>
        <p className="font-mono text-sm font-medium text-navy mt-1">{value}</p>
      </div>
      <button onClick={copy} className="p-2 rounded-xl hover:bg-white text-slate-500 transition-colors" aria-label={`Copy ${label}`}>
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function RequestFundsTab({ onSwitchTab }) {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState('');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    api.get('/api/user/deposit-info')
      .then((res) => {
        if (res.data.success) setInfo(res.data.depositInfo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildShareMessage = () => {
    if (!info) return '';
    return `Hi — please send funds to my Western Commercial Bank account:

Account Holder: ${info.account_holder}
Bank: ${info.bank_name}
Routing Number: ${info.routing_number}
Account Number: ${info.account_number}
Account Type: ${info.account_type}

Thank you!`;
  };

  const handleShare = async () => {
    const message = buildShareMessage();
    setShareMsg(message);

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Request Funds', text: message });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(message);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  };

  if (loading) {
    return <div className="card p-10 text-center text-slate-400">Loading account details...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSwitchTab?.('home')}
          className="p-2 -ml-2 rounded-2xl hover:bg-slate-100 text-navy transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-navy">Request Funds</h2>
          <p className="text-slate-600 text-sm mt-0.5">Share your details or set up deposits</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-navy/5 text-navy">
            <Share2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-navy">Request from Someone</h3>
            <p className="text-sm text-slate-500 mt-1">
              Share your account details so friends, family, or clients can send you money.
            </p>
            <button onClick={handleShare} className="btn-primary w-full mt-4 py-3 text-sm">
              {shared ? 'Copied to Clipboard!' : 'Share Account Details'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-navy">Direct Deposit</h3>
            <p className="text-xs text-slate-500">For payroll, benefits, or recurring transfers</p>
          </div>
        </div>
        <CopyField label="Account Holder" value={info?.account_holder || user?.full_name} />
        <CopyField label="Routing Number" value={info?.routing_number || '121000248'} />
        <CopyField label="Account Number" value={info?.account_number || '—'} />
        <CopyField label="Account Type" value={info?.account_type || 'Checking'} />
        <CopyField label="Bank Name" value={info?.bank_name || 'Western Commercial Bank'} />
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-navy">Mobile Check Deposit</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              To deposit a check using your phone, endorse the back of the check, open the WCB mobile app,
              select <strong>Deposit Check</strong>, photograph both sides, and submit. Funds are typically
              available within 1–2 business days.
            </p>
            <ul className="text-xs text-slate-500 mt-3 space-y-1.5 list-disc pl-4">
              <li>Daily limit: ${info?.mobile_deposit_limit?.toLocaleString('en-US') || '10,000'}</li>
              <li>Use a dark, flat surface and good lighting</li>
              <li>Sign &quot;For mobile deposit only&quot; on the back of the check</li>
            </ul>
          </div>
        </div>
      </div>

      {shareMsg && (
        <div className="card p-4 bg-slate-50">
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-2">Preview</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">{shareMsg}</pre>
        </div>
      )}
    </div>
  );
}
