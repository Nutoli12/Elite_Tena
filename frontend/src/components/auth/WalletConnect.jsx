import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import web3Service from '../services/web3';
import { authService } from '../services/api';

const WalletConnect = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const connectWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // Connect to MetaMask
      const walletAddress = await web3Service.connectWallet();
      
      // Generate nonce for authentication
      const nonceResponse = await authService.generateNonce(walletAddress);
      
      // Sign the message
      const signature = await web3Service.signMessage(nonceResponse.message);
      
      // Authenticate with backend
      const authResponse = await authService.authenticate(
        walletAddress,
        signature,
        nonceResponse.message
      );
      
      // Login user
      await login(authResponse.user, authResponse.token);
      
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <button
        onClick={connectWallet}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-4 text-xs text-gray-500">
        We use MetaMask to securely authenticate your identity
      </p>
    </div>
  );
};

export default WalletConnect;
