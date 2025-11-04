import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <p>Please connect your wallet to view profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
      
      <div className="card max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{user.walletAddress}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
          </div>
          
          {user.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
