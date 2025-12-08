import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, User, CheckCircle, XCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

interface ConsentRequest {
  id: string;
  patientWalletAddress: string;
  status: string;
  purpose: string;
  requestReason: string;
  requestedAt: string;
  grantedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  durationType: string;
  durationValue: number;
  patient: {
    user: {
      name: string;
    };
  };
}

export const DoctorConsentRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'requested' | 'active' | 'denied'>('all');

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const walletAddress = user?.walletAddress;
      
      if (!walletAddress) {
        console.error('Wallet address not found');
        setLoading(false);
        return;
      }
      
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await axios.get(`/consent/doctor/${walletAddress}${statusParam}`);
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch consent requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'requested':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Pending',
          description: 'Waiting for patient response'
        };
      case 'active':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Granted',
          description: 'Access granted'
        };
      case 'patient_revoked':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Revoked',
          description: 'Patient revoked access'
        };
      case 'expired':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          label: 'Expired',
          description: 'Access expired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle,
          label: status,
          description: 'Unknown status'
        };
    }
  };

  const getDurationText = (type: string, value: number) => {
    switch (type) {
      case 'hours': return `${value} hour${value > 1 ? 's' : ''}`;
      case 'days': return `${value} day${value > 1 ? 's' : ''}`;
      case 'appointment_only': return 'Appointment only';
      default: return 'Unknown';
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'denied') return req.status === 'patient_revoked';
    return req.status === filter;
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
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-medical-600" />
            My Access Requests
          </h2>
          <p className="text-gray-600 mt-1">Track your patient access requests</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchRequests}
          className="px-4 py-2 bg-medical-600 text-white rounded-lg font-medium hover:bg-medical-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <div className="medical-card p-2">
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All', count: requests.length },
            { id: 'requested', label: 'Pending', count: requests.filter(r => r.status === 'requested').length },
            { id: 'active', label: 'Active', count: requests.filter(r => r.status === 'active').length },
            { id: 'denied', label: 'Denied', count: requests.filter(r => r.status === 'patient_revoked').length }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === tab.id
                  ? 'bg-medical-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filter === tab.id
                    ? 'bg-white text-medical-600'
                    : 'bg-medical-100 text-medical-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="medical-card p-12 text-center"
        >
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't sent any access requests yet."
              : `No ${filter} requests found.`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredRequests.map((request, index) => {
              const statusConfig = getStatusConfig(request.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="medical-card overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {/* Patient Info */}
                      <div className="flex items-center space-x-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                        >
                          {(request.patient?.user?.name || request.patient?.name || 'P').charAt(0)}
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-500" />
                            {request.patient?.user?.name || request.patient?.name || request.patient?.user?.email?.split('@')[0] || 'Patient'}
                          </h3>
                          <p className="text-gray-600 text-sm">{request.purpose}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`px-4 py-2 rounded-full border-2 ${statusConfig.color} flex items-center gap-2`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        <span className="font-medium">{statusConfig.label}</span>
                      </motion.div>
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Requested</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Duration</p>
                        <p className="text-sm font-medium text-gray-900">
                          {getDurationText(request.durationType, request.durationValue)}
                        </p>
                      </div>
                      {request.grantedAt && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Granted</p>
                          <p className="text-sm font-medium text-green-600">
                            {new Date(request.grantedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {request.expiresAt && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Expires</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(request.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    {request.requestReason && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Reason:</span> {request.requestReason}
                        </p>
                      </div>
                    )}

                    {/* Status Description */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{statusConfig.description}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
