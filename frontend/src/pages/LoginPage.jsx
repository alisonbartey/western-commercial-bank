import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User } from 'lucide-react';
import BankLogo from '../components/BankLogo';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier.trim(), password);

    if (result.success && result.requiresOTP) {
      navigate('/verify-otp', {
        state: {
          preOtpToken: result.preOtpToken,
          username: identifier,
        },
      });
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          <BankLogo size="lg" variant="light" />
          <div className="mt-5 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-white/30" />
            <span className="text-xs uppercase tracking-[3px] text-white/60 font-medium">Member FDIC</span>
            <div className="h-px w-8 bg-white/30" />
          </div>
        </div>

        <div className="card p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-navy">Welcome back</h2>
            <p className="text-slate-600 mt-1.5">Sign in to access your accounts</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username or Email Address
              </label>
              <div className="relative">
                <User className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:border-navy focus:ring-1 focus:ring-navy/30 text-lg placeholder:text-slate-400"
                  placeholder="john_doe or name@bank.com"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:border-navy focus:ring-1 focus:ring-navy/30 text-lg"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="btn-primary w-full mt-2 text-lg disabled:bg-slate-400"
            >
              {loading ? 'Verifying credentials...' : 'Sign In Securely'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              This is a secure banking portal. Public registration is disabled.<br />
              New accounts can only be created by authorized bank administrators.
            </p>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-8 tracking-wide">
          © Western Commercial Bank • Member FDIC • Equal Housing Lender
        </p>
      </div>
    </div>
  );
}
