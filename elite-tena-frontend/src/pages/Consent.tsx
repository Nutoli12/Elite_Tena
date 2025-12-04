import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, CheckCircle, XCircle, Clock, User, Calendar, Eye } from 'lucide-react';
import axios from '../lib/axios';
import type { Consent } from '../types/healthcare';

export const ConsentManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      // Use the correct endpoint with wallet address
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      const response = await axios.get(`/consent/${walletAddress}`);
      const data = response.data?.data || response.data || [];
      setConsents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch consents:', error);
      // Mock data
      setConsents([
        {
          id: '1',
          patientId: user?.id || '',
          providerId: 'doc1',
          providerName: 'Dr. Alemayehu',
          consentType: 'medical_records',
          status: 'active',
          granted: '2024-01-15',
          expires: '2024-01-22',
          purpose: 'Routine medical care',
          blockchainTxHash: '0x123abc...'
        },
        {
          id: '2',
          patientId: user?.id || '',
          providerId: 'lab1',
          providerName: 'City Laboratory',
          consentType: 'lab_results',
          status: 'active',
          granted: '2024-01-10',
          expires: '2024-02-10',
          purpose: 'Lab test results access',
          blockchainTxHash: '0x456def...'
        },
        {
          id: '3',
          patientId: user?.id || '',
          providerId: 'pharm1',
          providerName: 'Health Plus Pharmacy',
          consentType: 'prescriptions',
          status: 'expired',
          granted: '2023-12-01',
          expires: '2024-01-01',
          purpose: 'Prescription dispensing',
          blockchainTxHash: '0x789ghi...'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const consentTypes = {
    medical_records: { label: t('consent_medical_records'), icon: '📁', color: 'blue' },
    prescriptions: { label: t('consent_prescriptions'), icon: '💊', color: 'purple' },
    lab_results: { label: t('consent_lab_results'), icon: '🧪', color: 'green' },
    emergency: { label: t('consent_emergency'), icon: '🚨', color: 'red' }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' };
      case 'expired':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Expired' };
      case 'revoked':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Revoked' };
      case 'pending':
        return { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pending' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Unknown' };
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{t('consent_management')}</h1>
          <p className="text-gray-600 mt-1">Manage access to your healthcare data</p>
        </div>

        {user?.role === 'patient' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="healthcare-button flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('grant_consent')}
          </motion.button>
        )}
      </div>

      {/* Consent Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(consentTypes).map(([type, config], index) => {
          const activeConsents = consents.filter(
            c => c.consentType === type && c.status === 'active'
          );

          return (
            <motion.div
              key={type}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="medical-card text-center p-6"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { duration: 2, repeat: Infinity }
                }}
                className="text-3xl mb-3"
              >
                {config.icon}
              </motion.div>
              <h3 className="font-semibold text-gray-900 mb-2">{config.label}</h3>
              <p className="text-2xl font-bold text-medical-600 mb-1">{activeConsents.length}</p>
              <p className="text-sm text-gray-600">
                Active consent{activeConsents.length !== 1 ? 's' : ''}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Active Consents List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="medical-card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Consent History</h3>

        <div className="space-y-4">
          <AnimatePresence>
            {consents.map((consent, index) => {
              const statusConfig = getStatusConfig(consent.status);
              const typeConfig = consentTypes[consent.consentType];
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={consent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 5 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-4">
                    {/* Consent Type Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-xl">{typeConfig.icon}</span>
                    </motion.div>

                    {/* Consent Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{typeConfig.label}</h4>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </motion.span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{consent.providerName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Granted: {consent.granted}</span>
                        </div>
                        {consent.expires && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Expires: {consent.expires}</span>
                          </div>
                        )}
                      </div>

                      {consent.purpose && (
                        <div className="text-sm text-gray-500 mt-1">
                          Purpose: {consent.purpose}
                        </div>
                      )}

                      {/* Blockchain Verification */}
                      {consent.blockchainTxHash && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center space-x-1 mt-2 text-xs text-medical-600"
                        >
                          <div className="w-2 h-2 bg-medical-500 rounded-full" />
                          <span>Recorded on Blockchain</span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {user?.role === 'patient' && consent.status === 'active' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium"
                      >
                        Revoke
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 text-gray-400 hover:text-medical-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {consents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No consent records found</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
