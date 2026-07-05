import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

export default function OtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const inputsRef = useRef([]);
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const preOtpToken = location.state?.preOtpToken || sessionStorage.getItem('wcb_pre_otp_token');
  const username = location.state?.username || 'your account';

  // Redirect if no preOtpToken
  useEffect(() => {
    if (!preOtpToken) {
      navigate('/', { replace: true });
    }
  }, [preOtpToken, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto focus next
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus last filled or next empty
    const lastIndex = Math.min(pasteData.length - 1, 5);
    inputsRef.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOtp(preOtpToken, code);

    if (result.success) {
      sessionStorage.removeItem('wcb_pre_otp_token');
      navigate(
        result.user?.role === 'admin' || result.user?.role === 'moderator'
          ? '/administrator'
          : '/dashboard',
        { replace: true }
      );
    } else {
      setError(result.error);
      // Clear OTP on failure for security
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = () => {
    // For demo: just go back to login
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 -ml-2 text-slate-500 hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-semibold text-navy">Two-Factor Verification</div>
          <div className="text-xs text-slate-500">Step 2 of 2 • Secure Login</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-navy/10 rounded-2xl flex items-center justify-center mb-5">
              <ShieldCheck className="w-9 h-9 text-navy" />
            </div>
            <h1 className="text-3xl font-semibold text-navy">Enter Verification Code</h1>
            <p className="mt-3 text-slate-600">
              We've sent a 6-digit code to the registered channel for <span className="font-medium text-navy">{username}</span>.
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-2.5 mb-8" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`otp-input ${digit ? 'filled' : ''}`}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="mb-6 text-center text-sm text-red-600 bg-red-50 py-3 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-8">
            <Clock className="w-4 h-4" />
            <span>
              Code expires in <span className="font-mono font-semibold text-navy">{formatTime(timeLeft)}</span>
            </span>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6 || timeLeft === 0}
            className="btn-primary w-full text-lg py-4 disabled:bg-slate-300"
          >
            {loading ? 'Verifying...' : 'Verify & Continue to Banking'}
          </button>

          <div className="text-center mt-6">
            <button 
              onClick={handleResend} 
              className="text-sm text-slate-600 hover:text-navy underline-offset-4 hover:underline"
            >
              Didn't receive the code? Return to login
            </button>
          </div>

          <div className="mt-10 text-[10px] text-center text-slate-400 tracking-wider">
            This OTP is valid for one-time use only.<br />
            For security, never share this code with anyone.
          </div>
        </div>
      </div>
    </div>
  );
}
