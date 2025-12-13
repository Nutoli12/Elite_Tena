/**
 * PHASE 3: FRONTEND STABILIZATION
 * 
 * Protected Route component to handle authentication and prevent refresh redirect issues
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'patient' | 'doctor' | 'admin' | 'pharmacist' | 'lab_technician';
  fallbackPath?: string;
}

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallbackPath = '/' 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('🔒 ProtectedRoute check:', {
      loading,
      isAuthenticated,
      user: user ? { 
        walletAddress: user.walletAddress, 
        role: user.role 
      } : null,
      requiredRole,
      currentPath: location.pathname
    });
  }, [loading, isAuthenticated, user, requiredRole, location.pathname]);

  // Show loading screen while checking authentication
  if (loading) {
    console.log('🔄 Authentication loading...');
    return <LoadingScreen />;
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated || !user) {
    console.log('❌ Not authenticated, redirecting to landing page');
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement if specified
  if (requiredRole && user.role !== requiredRole) {
    console.log(`❌ Role mismatch. Required: ${requiredRole}, User: ${user.role}`);
    
    // Redirect based on user's actual role
    const roleRedirects = {
      patient: '/dashboard',
      doctor: '/dashboard',
      admin: '/admin/dashboard',
      pharmacist: '/pharmacy/dashboard',
      lab_technician: '/lab/dashboard'
    };
    
    const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  console.log('✅ Authentication check passed, rendering protected content');
  return <>{children}</>;
};

// Named export used above