import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Upload, Search, CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react';
import axios from '../lib/axios';
import type { LabResult } from '../types/healthcare';

export const LabResults: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    try {
      const response = await axios.get('/lab-results');
      // Handle different response structures
      const data = response.data?.data || response.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
      // Mock data
      setResults([
        {
          id: '1',
          patientId: user?.id || '',
          doctorId: 'Dr. Selam',
          labTechId: 'Tech Alemayehu',
          testName: 'Complete Blood Count',
          testType: 'Blood Test',
          results: 'WBC: 7.5, RBC: 5.2, Hemoglobin: 14.5',
          normalRange: 'WBC: 4-11, RBC: 4.5-5.5, Hb: 13-17',
          status: 'approved',
          submitted: '2024-01-15',
          approved: '2024-01-16',
          ipfsHash: 'QmXyz...',
          blockchainTxHash: '0x123abc...',
          files: ['blood_count.pdf']
        },
        {
          id: '2',
          patientId: user?.id || '',
          doctorId: 'Dr. Alemayehu',
          labTechId: 'Tech Marta',
          testName: 'Lipid Panel',
          testType: 'Blood Test',
          results: 'Cholesterol: 180, Triglycerides: 120',
          normalRange: 'Cholesterol: <200, Triglycerides: <150',
          status: 'pending',
          submitted: '2024-01-18',
          ipfsHash: 'QmAbc...',
          blockchainTxHash: '0x456def...',
          files: ['lipid_panel.pdf']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Approved' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending Review' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Rejected' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: 'Pending' };
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.testName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || result.status === filterStatus;
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
          <h1 className="text-2xl font-bold text-gray-900">{t('lab_results')}</h1>
          <p className="text-gray-600 mt-1">View and manage laboratory test results</p>
        </div>

        {user?.role === 'lab_technician' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="healthcare-button flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Results
          </motion.button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lab results..."
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Results Grid */}
      <div className="grid gap-6">
        <AnimatePresence>
          {filteredResults.map((result, index) => {
            const statusConfig = getStatusConfig(result.status);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                className="medical-card p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-12 h-12 bg-medical-100 rounded-xl flex items-center justify-center"
                    >
                      <Beaker className="w-6 h-6 text-medical-600" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{result.testName}</h3>
                      <p className="text-sm text-gray-600">{result.testType}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color} flex items-center gap-1`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </motion.div>

                    {result.blockchainTxHash && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-medical-500 rounded-full"
                        title="Verified on Blockchain"
                      />
                    )}
                  </div>
                </div>

                {/* Results Data */}
                <div className="grid md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Test Results</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">{result.results}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Normal Range</h4>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <pre className="text-sm text-blue-700 whitespace-pre-wrap">{result.normalRange}</pre>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  <div><strong>Lab Tech:</strong> {result.labTechId}</div>
                  <div><strong>Doctor:</strong> {result.doctorId}</div>
                  <div><strong>Submitted:</strong> {result.submitted}</div>
                  {result.approved && <div><strong>Approved:</strong> {result.approved}</div>}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {result.files?.map((file) => (
                      <motion.button
                        key={file}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {file}
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 text-gray-400 hover:text-medical-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>

                    {user?.role === 'doctor' && result.status === 'pending' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium"
                        >
                          Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium"
                        >
                          Reject
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredResults.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Beaker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No lab results found</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter'
              : 'No lab results have been submitted yet'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
