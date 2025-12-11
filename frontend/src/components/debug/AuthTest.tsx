import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const AuthTest: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold text-sm mb-2">🔍 Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>
          <span className="font-medium">Loading:</span> 
          <span className={isLoading ? 'text-yellow-600' : 'text-green-600'}>
            {isLoading ? ' Yes' : ' No'}
          </span>
        </div>
        <div>
          <span className="font-medium">Authenticated:</span> 
          <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
            {isAuthenticated ? ' Yes' : ' No'}
          </span>
        </div>
        <div>
          <span className="font-medium">User:</span> 
          <span className="text-gray-600">
            {user ? ` ${user.walletAddress?.substring(0, 8)}...` : ' None'}
          </span>
        </div>
        <div>
          <span className="font-medium">Token:</span> 
          <span className="text-gray-600">
            {localStorage.getItem('auth_token') ? ' Present' : ' Missing'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;