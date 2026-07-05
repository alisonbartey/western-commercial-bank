import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages / Views
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

// Protected Route wrapper
function ProtectedRoute({ children, requireStaff = false }) {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (requireStaff && !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center card p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold text-navy mb-2">Access Restricted</h2>
          <p className="text-slate-600 mb-6">
            This area is reserved for bank administrators and moderators only.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  const { isAuthenticated, isStaff } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to={isStaff ? "/administrator" : "/dashboard"} replace />
            ) : (
              <LoginPage />
            )
          } 
        />
        
        <Route path="/verify-otp" element={<OtpPage />} />

        {/* Regular User Routes - Mobile-first with bottom nav */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <UserLayout />
            </ProtectedRoute>
          }
        />

        {/* Isolated Admin Panel - accessible only via explicit route */}
        <Route
          path="/administrator"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminLayout />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
