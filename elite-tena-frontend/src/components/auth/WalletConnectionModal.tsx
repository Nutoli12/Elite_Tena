import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, CheckCircle, Loader2 } from 'lucide-react';
import axios from '../../lib/axios';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose
}) => {
  const { connectWallet, login, isConnecting } = useAuth();
  const { t } = useTranslation();
  const [isSigning, setIsSigning] = useState(false);

  const handleWalletConnect = async () => {
    try {
      setIsSigning(true);
      const walletAddress = await connectWallet();

      // Request signature for authentication
      if (window.ethereum) {
        // 1. Get nonce/message from backend
        let messageToSign = '';
        try {
          const nonceResponse = await axios.get(`/auth/wallet/nonce/${walletAddress}`);
          if (nonceResponse.data && nonceResponse.data.data) {
            messageToSign = nonceResponse.data.data.message;
          }
        } catch (error) {
          console.error('Failed to get nonce, falling back to local message:', error);
          // Fallback if backend is unreachable (though login will likely fail too if backend is down)
          messageToSign = `Welcome to Elite Tena Healthcare! Please sign this message to authenticate. Timestamp: ${Date.now()}`;
        }

        // 2. Request signature
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [
            messageToSign,
            walletAddress
          ]
        });

        // 3. Login with signature and message
        await login(walletAddress, signature, messageToSign);
        onClose();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      transition: { duration: 2, repeat: Infinity }
                    }}
                    className="w-12 h-12 healthcare-gradient rounded-xl flex items-center justify-center"
                  >
                    <Shield className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('connect_wallet')}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Secure access to your healthcare data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600">
                  Connect your wallet for secure, decentralized access to your healthcare records
                </p>
              </div>

              {/* MetaMask Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWalletConnect}
                disabled={isConnecting || isSigning}
                className="w-full p-4 border-2 border-orange-500 rounded-xl flex items-center gap-4 hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting || isSigning ? (
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                ) : (
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                )}
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">MetaMask</div>
                  <div className="text-sm text-gray-600">
                    {isSigning ? 'Please sign the message...' : isConnecting ? 'Connecting...' : 'Browser wallet'}
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </motion.button>

              {/* Security Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4"
              >
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Secure & Private</p>
                    <p className="text-blue-700 mt-1">
                      Your data remains encrypted and under your control. No personal information is stored on-chain.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
