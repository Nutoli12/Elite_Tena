import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Wallet, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, connectWallet, loginWithWallet } = useAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet'>('email');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithEmail(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const walletAddress = await connectWallet();
      await loginWithWallet(walletAddress);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen healthcare-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 healthcare-gradient rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back</h1>
        <p className="text-gray-600 text-center mb-6">Sign in to Elite Tena</p>

        {/* Auth Method Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'email'
                ? 'bg-white text-medical-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
          <button
            onClick={() => setAuthMethod('wallet')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'wallet'
                ? 'bg-white text-medical-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            Wallet
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Email Login Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="healthcare-button w-full disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>
        )}

        {/* Wallet Login */}
        {authMethod === 'wallet' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Connect your MetaMask wallet to sign in securely
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWalletLogin}
              disabled={loading}
              className="healthcare-button w-full disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </motion.button>
          </div>
        )}

        {/* Register Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-medical-600 font-semibold hover:underline">
            Register as Patient
          </Link>
        </p>

        {/* Demo Mode */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.setItem('auth_token', 'demo-token');
              localStorage.setItem('user_wallet', '0xDemo123');
              window.location.href = '/dashboard';
            }}
            className="w-full py-2 text-sm text-gray-600 hover:text-medical-600 transition-colors"
          >
            🎯 Try Demo Mode
          </button>
        </div>
      </motion.div>
    </div>
  );
};
