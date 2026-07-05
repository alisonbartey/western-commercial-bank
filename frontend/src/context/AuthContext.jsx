import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('wcb_access_token');
    const storedUser = localStorage.getItem('wcb_user');

    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Set axios default header
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        usernameOrEmail,
        password
      });

      if (data.requiresOTP) {
        sessionStorage.setItem('wcb_pre_otp_token', data.preOtpToken);
        return {
          success: true, 
          requiresOTP: true, 
          preOtpToken: data.preOtpToken,
          message: data.message 
        };
      }

      return { success: false, error: 'Unexpected login response' };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const verifyOtp = async (preOtpToken, otp) => {
    try {
      const { data } = await api.post('/api/auth/verify-otp', {
        preOtpToken,
        otp
      });

      if (data.success && data.accessToken) {
        const { accessToken: token, user: userData } = data;

        // Store in state + localStorage
        setAccessToken(token);
        setUser(userData);
        localStorage.setItem('wcb_access_token', token);
        localStorage.setItem('wcb_user', JSON.stringify(userData));

        // Set for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        return { success: true, user: userData };
      }

      return { success: false, error: data.error || 'OTP verification failed' };
    } catch (error) {
      const message = error.response?.data?.error || 'Invalid or expired OTP.';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('wcb_access_token');
    localStorage.removeItem('wcb_user');
    sessionStorage.removeItem('wcb_pre_otp_token');
    delete api.defaults.headers.common['Authorization'];
    navigate('/');
  };

  const updateBalance = (newBalance) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, balance: newBalance };
      localStorage.setItem('wcb_user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshProfile = async () => {
    try {
      const { data } = await api.get('/api/user/profile');
      if (data.success) {
        setUser((prev) => {
          const updated = { ...prev, ...data.user };
          localStorage.setItem('wcb_user', JSON.stringify(updated));
          return updated;
        });
        return data.user;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const isStaff = isAdmin || isModerator;

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isAdmin,
    isModerator,
    isStaff,
    loading,
    login,
    verifyOtp,
    logout,
    updateBalance,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
