import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, User, Eye, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { RevokeConsentModal } from '../modals/RevokeConsentModal';

interface ActiveConsent {
  id: string;
  doctorWalletAddress: string;
  status: string;
  permissions: any;
  grantedAt: string;
  expiresAt: string;
  lastAccessedAt: string;
  accessCount: number;
  recordsViewed: number;
  doctor: {
    name: string;
    specialty: string;
    user: {
      name: string;
    };
  };
}

export const ActiveConsentsList: React.FC = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ActiveConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; consent: ActiveConsent | null }>({
    open: false,
    consent: null
  });

  useEffect(() => {
    fetchActiveConsents();
    const interval = setInterval(fetchActiveConsents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchActiveConsents = async () => {
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      const response = await axios.get(`/consent/active/${walletAddress}`);
      setConsents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch active consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  const getTimeColor = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours <= 2) return 'text-red-600 bg-red-100';
    if (hours <= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const handleRevoke = async (reason: string) => {
    if (!revokeModal.consent) return;
    
    try {
      const walletAddress = user?.walletAddress || localStorage.getItem('user_wallet');
      await axios.post(`/consent/${revokeModal.consent.id}/revoke`, {
        patientWalletAddress: walletAddress,
        reason
      });
      
      setConsents(consents.filter(c => c.id !== revokeModal.consent!.id));
      setRevokeModal({ open: false, consent: null });
    } catch (error) {
      console.error('Failed to revoke consent:', error);
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

  if (consents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="medical-card p-12 text-center"
      >
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Permissions</h3>
        <p className="text-gray-600">You haven't granted access to any healthcare providers yet.</p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <AnimatePresence>
          {consents.map((consent, index) => (
            <motion.div
              key={consent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.1 }}
              className="medical-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {/* Doctor Info */}
                  <div className="flex items-center space-x-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    >
                      {(consent.doctor?.profileData?.name || consent.doctor?.profileData?.fullName || (consent.doctor?.profileData?.firstName && consent.doctor?.profileData?.lastName ? `${consent.doctor.profileData.firstName} ${consent.doctor.profileData.lastName}` : consent.doctor?.user?.name || consent.doctor?.name || 'Doctor') || 'D').charAt(0)}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        👨‍⚕️ {consent.doctor?.profileData?.name || consent.doctor?.profileData?.fullName || (consent.doctor?.profileData?.firstName && consent.doctor?.profileData?.lastName ? `${consent.doctor.profileData.firstName} ${consent.doctor.profileData.lastName}` : consent.doctor?.user?.name || consent.doctor?.name || 'Doctor') || consent.doctor?.user?.email?.split('@')[0]}
                        <motion.span
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </motion.span>
                      </h3>
                      <p className="text-gray-600">{consent.doctor?.specialty || consent.doctor?.specialization || 'Specialist'}</p>
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className="text-right">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getTimeColor(consent.expiresAt)}`}
                    >
                      <Clock className="w-4 h-4 inline mr-1" />
                      {getTimeRemaining(consent.expiresAt)}
                    </motion.div>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(consent.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Access Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-medical-600">{consent.accessCount}</p>
                    <p className="text-xs text-gray-600">Times Accessed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-medical-600">{consent.recordsViewed}</p>
                    <p className="text-xs text-gray-600">Records Viewed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {consent.lastAccessedAt 
                        ? new Date(consent.lastAccessedAt).toLocaleTimeString()
                        : 'Not yet'}
                    </p>
                    <p className="text-xs text-gray-600">Last Access</p>
                  </div>
                </div>

                {/* Granted Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>Granted: {new Date(consent.grantedAt).toLocaleString()}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    ✅ Active
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRevokeModal({ open: true, consent })}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Revoke Access
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </motion.button>
                </div>

                {/* Warning for expiring soon */}
                {getTimeRemaining(consent.expiresAt).includes('h') && 
                 parseInt(getTimeRemaining(consent.expiresAt)) <= 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2"
                  >
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Expiring Soon</p>
                      <p>This access will expire in less than 2 hours. The doctor may request an extension.</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Revoke Modal */}
      <RevokeConsentModal
        isOpen={revokeModal.open}
        consent={revokeModal.consent}
        onClose={() => setRevokeModal({ open: false, consent: null })}
        onRevoke={handleRevoke}
      />
    </>
  );
};
