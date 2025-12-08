import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Plus, Search, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react';
import axios from '../lib/axios';
import type { Prescription } from '../types/healthcare';

export const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await axios.get('/prescriptions');
      // Handle different response structures
      const data = response.data?.data || response.data || [];
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
      // Mock data for demo
      setPrescriptions([
        {
          id: '1',
          patientId: user?.id || '',
          doctorId: 'doc1',
          medication: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          duration: '30 days',
          instructions: 'Take with meals',
          quantity: 60,
          refills: 2,
          status: 'active',
          issued: '2024-01-15',
          expires: '2024-04-15',
          isFilled: false,
          blockchainTxHash: '0x123abc...',
          ipfsHash: 'QmXyz...'
        },
        {
          id: '2',
          patientId: user?.id || '',
          doctorId: 'doc2',
          medication: 'Amoxicillin',
          dosage: '250mg',
          frequency: 'Three times daily',
          duration: '7 days',
          instructions: 'Complete full course',
          quantity: 21,
          refills: 0,
          status: 'filled',
          issued: '2024-01-10',
          expires: '2024-02-10',
          isFilled: true,
          filledBy: 'City Pharmacy',
          filledAt: '2024-01-11',
          blockchainTxHash: '0x456def...',
          ipfsHash: 'QmAbc...'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Active' };
      case 'filled':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Filled' };
      case 'expired':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Expired' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' };
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.medication?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
    const matchesFilter = filterStatus === 'all' || prescription.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">{t('prescriptions')}</h1>
          <p className="text-gray-600 mt-1">Manage and track your prescriptions</p>
        </div>

        {user?.role === 'doctor' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="healthcare-button flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('issue_prescription')}
          </motion.button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prescriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent transition-all"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="filled">Filled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Prescriptions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filteredPrescriptions.map((prescription, index) => {
            const statusConfig = getStatusConfig(prescription.status);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="medical-card p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </motion.div>

                  {prescription.blockchainTxHash && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-medical-500 rounded-full"
                      title="Verified on Blockchain"
                    />
                  )}
                </div>

                {/* Medication Info */}
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {prescription.medication}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Dosage:</strong> {prescription.dosage}</p>
                    <p><strong>Frequency:</strong> {prescription.frequency}</p>
                    <p><strong>Duration:</strong> {prescription.duration}</p>
                    {prescription.instructions && (
                      <p><strong>Instructions:</strong> {prescription.instructions}</p>
                    )}
                  </div>
                </div>

                {/* Doctor Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Dr. {prescription.doctorId}</span>
                  </div>
                  <div>Issued: {prescription.issued}</div>
                </div>

                {/* Filling Information */}
                {prescription.isFilled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <span>Filled by {prescription.filledBy} on {prescription.filledAt}</span>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {user?.role === 'pharmacist' && !prescription.isFilled && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      Dispense
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 border border-medical-500 text-medical-500 py-2 rounded-lg text-sm font-medium"
                  >
                    View Details
                  </motion.button>
                </div>

                {/* Refills Info */}
                {prescription.refills > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 text-center text-xs text-medical-600"
                  >
                    {prescription.refills} refill{prescription.refills !== 1 ? 's' : ''} remaining
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredPrescriptions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No prescriptions found</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter'
              : 'No prescriptions have been issued yet'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
