import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ children, adminOnly = false, studentOnly = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p>Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (studentOnly && user?.role === 'admin') {
    return <Navigate to="/admin/overview" replace />;
  }

  return children;
};

export default ProtectedRoute;
