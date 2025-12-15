import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Wallet, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, connectWallet, loginWithWallet } = useAuth();
  const { theme } = useTheme();
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
    <div className="min-h-screen healthcare-gradient flex items-center justify-center p-4 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full transition-colors duration-300"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 healthcare-gradient rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-center mb-2">Welcome Back</h1>
        <p className="text-gray-600 dark:text-slate-300 text-center mb-6">Sign in to Elite Tena</p>

        {/* Auth Method Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'email'
                ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-300'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
          <button
            onClick={() => setAuthMethod('wallet')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              authMethod === 'wallet'
                ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-300'
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
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Email Login Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-primary w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-primary w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
            <p className="text-sm text-gray-600 dark:text-slate-300 text-center">
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
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            Register as Patient
          </Link>
        </p>


      </motion.div>
    </div>
  );
};
