import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Eye, Download, Calendar, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

export const MedicalRecordsPreview: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/medical-records/${user.walletAddress}`);
      if (response.data.success) {
        const backendRecords = response.data.data.slice(0, 3).map((record: any) => ({
          id: record.id,
          title: `${record.recordType} - ${new Date(record.createdAt).toLocaleDateString()}`,
          doctor: record.doctor?.profileData?.name || record.doctor?.profileData?.fullName || (record.doctor?.profileData?.firstName && record.doctor?.profileData?.lastName ? `${record.doctor.profileData.firstName} ${record.doctor.profileData.lastName}` : record.doctor?.user?.name || record.doctor?.name || `Dr. ${record.doctorWalletAddress?.substring(0, 8)}...` || 'Unknown Doctor'),
          date: record.createdAt.split('T')[0],
          type: record.recordType || 'Medical Record',
          diagnosis: record.diagnosis || 'No diagnosis provided',
          ipfsHash: record.ipfsHash
        }));
        setRecords(backendRecords);
      } else {
        // No records found
        setRecords([]);
      }
    } catch (error) {
      console.error('Failed to fetch medical records:', error);
      // Set empty array on error
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="medical-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Medical Records</h3>
        <a href="/medical-records" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          View All →
        </a>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-medical-500 border-t-transparent rounded-full"
            />
          </div>
        ) : records.map((record, index) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ x: 5 }}
            className="flex items-start space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all group"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <FileText className="w-6 h-6 text-medical-600" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 truncate">{record.title}</h4>
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-medical-100 text-medical-800"
                >
                  {record.type}
                </motion.span>
              </div>

              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{record.diagnosis}</p>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{record.doctor}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{record.date}</span>
                </div>
              </div>

              {record.ipfsHash && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center space-x-1 mt-2 text-xs text-medical-600"
                >
                  <div className="w-2 h-2 bg-medical-500 rounded-full" />
                  <span>Secured on IPFS</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-gray-400 hover:text-medical-600 transition-colors"
                title="View Record"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-gray-400 hover:text-medical-600 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
        
        {!loading && records.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No medical records found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
