import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, CheckCircle, XCircle, Clock, User, Calendar, Eye, Bell, History, Settings } from 'lucide-react';
import axios from '../lib/axios';
import type { Consent } from '../types/healthcare';
import { PendingConsentRequests } from '../components/patient/PendingConsentRequests';
import { ActiveConsentsList } from '../components/patient/ActiveConsentsList';

export const ConsentManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    revoked: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      const response = await axios.get(`/consent/stats/patient/${walletAddress}`);
      setStats(response.data.data || stats);
    } catch (error) {
      console.error('Failed to fetch consent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending Requests', icon: Bell, count: stats.pending },
    { id: 'active', label: 'Active Permissions', icon: CheckCircle, count: stats.active },
    { id: 'history', label: 'History', icon: History, count: stats.total }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-medical-600" />
            Consent Management
          </h1>
          <p className="text-gray-600 mt-2">Control who can access your healthcare data</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="healthcare-button flex items-center gap-2"
        >
          <Settings className="w-5 h-5" />
          Preferences
        </motion.button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-100 text-blue-800', icon: '📊' },
          { label: 'Active', value: stats.active, color: 'bg-green-100 text-green-800', icon: '✅' },
          { label: 'Pending', value: stats.pending, color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
          { label: 'Expired', value: stats.expired, color: 'bg-gray-100 text-gray-800', icon: '⏰' },
          { label: 'Revoked', value: stats.revoked, color: 'bg-red-100 text-red-800', icon: '🚫' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="medical-card text-center p-4"
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="medical-card p-2">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-medical-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {tab.count > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id
                        ? 'bg-white text-medical-600'
                        : 'bg-medical-100 text-medical-600'
                    }`}
                  >
                    {tab.count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'pending' && <PendingConsentRequests />}
          {activeTab === 'active' && <ActiveConsentsList />}
          {activeTab === 'history' && (
            <div className="medical-card p-12 text-center">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">History View</h3>
              <p className="text-gray-600">Complete consent history coming soon...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
