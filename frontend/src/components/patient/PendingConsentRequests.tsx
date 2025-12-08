import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, User, Calendar, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

interface ConsentRequest {
  id: string;
  doctorWalletAddress: string;
  appointmentId?: string;
  purpose: string;
  requestReason: string;
  permissions: {
    viewMedicalHistory: boolean;
    viewLabResults: boolean;
    viewPrescriptions: boolean;
    addConsultationNotes: boolean;
    orderTests: boolean;
    writePrescriptions: boolean;
  };
  durationType: string;
  durationValue: number;
  requestedAt: string;
  doctor: {
    name: string;
    specialty: string;
    user: {
      name: string;
      email: string;
    };
  };
  appointment?: {
    appointmentDate: string;
    appointmentType: string;
  };
}

export const PendingConsentRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConsentRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      const response = await axios.get(`/consent/pending/${walletAddress}`);
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (request: ConsentRequest, durationType?: string) => {
    setActionLoading(true);
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      await axios.post(`/consent/${request.id}/grant`, {
        patientWalletAddress: walletAddress,
        customDuration: durationType ? {
          type: durationType === 'appointment' ? 'appointment_only' : 'hours',
          value: durationType === 'appointment' ? 2 : 24
        } : undefined
      });
      
      // Remove from list
      setRequests(requests.filter(r => r.id !== request.id));
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to grant consent:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (request: ConsentRequest, reason?: string) => {
    setActionLoading(true);
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      await axios.post(`/consent/${request.id}/deny`, {
        patientWalletAddress: walletAddress,
        reason: reason || 'Patient denied access'
      });
      
      setRequests(requests.filter(r => r.id !== request.id));
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to deny consent:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getDurationText = (type: string, value: number) => {
    switch (type) {
      case 'hours': return `${value} hour${value > 1 ? 's' : ''}`;
      case 'days': return `${value} day${value > 1 ? 's' : ''}`;
      case 'weeks': return `${value} week${value > 1 ? 's' : ''}`;
      case 'months': return `${value} month${value > 1 ? 's' : ''}`;
      case 'appointment_only': return 'This appointment only';
      default: return 'Unknown';
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

  if (requests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="medical-card p-12 text-center"
      >
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Requests</h3>
        <p className="text-gray-600">You don't have any pending consent requests at the moment.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {requests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
            className="medical-card overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center"
                  >
                    <Shield className="w-8 h-8 text-blue-600" />
                  </motion.div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">🔔 New Access Request</h3>
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full"
                      >
                        Pending
                      </motion.span>
                    </div>
                    <p className="text-gray-600">
                      <User className="w-4 h-4 inline mr-1" />
                      {request.doctor?.user?.name || request.doctor?.name || request.doctor?.user?.email?.split('@')[0] || 'Doctor'} ({request.doctor?.specialty || request.doctor?.specialization || 'Specialist'})
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Requested {new Date(request.requestedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Appointment Info */}
              {request.appointment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">For Appointment</h4>
                  </div>
                  <p className="text-blue-800">
                    {request.appointment.appointmentType} - {new Date(request.appointment.appointmentDate).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Purpose */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Purpose:</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{request.purpose}</p>
                {request.requestReason && (
                  <p className="text-gray-600 text-sm mt-2 italic">"{request.requestReason}"</p>
                )}
              </div>

              {/* Duration */}
              <div className="flex items-center space-x-2 text-gray-700">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Requested Duration:</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {getDurationText(request.durationType, request.durationValue)}
                </span>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">What Access Includes:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(request.permissions).map(([key, value]) => (
                    <div
                      key={key}
                      className={`flex items-center space-x-2 p-3 rounded-lg ${
                        value ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {value ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <span className={value ? 'text-green-800' : 'text-red-800'}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Access will automatically expire after the specified duration</li>
                      <li>You can revoke access at any time</li>
                      <li>All access is logged for your security</li>
                      <li>Doctor will be notified of your decision</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleGrant(request)}
                  disabled={actionLoading}
                  className="flex-1 min-w-[200px] px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Permit for {getDurationText(request.durationType, request.durationValue)}
                </motion.button>

                {request.appointment && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGrant(request, 'appointment')}
                    disabled={actionLoading}
                    className="flex-1 min-w-[200px] px-6 py-3 bg-yellow-600 text-white rounded-xl font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Permit for Appointment Only
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeny(request)}
                  disabled={actionLoading}
                  className="flex-1 min-w-[200px] px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Deny Access
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRequest(request)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  View Details
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
