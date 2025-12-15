import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { Modal } from '../../services/modalService';

interface RevokeAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  grant: any;
  onSuccess?: () => void;
}

export const RevokeAccessModal: React.FC<RevokeAccessModalProps> = ({
  isOpen,
  onClose,
  grant,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const response = await axios.delete(
        `/prescriptions/access/${grant.id}`,
        {
          data: { patientWalletAddress: user?.walletAddress }
        }
      );

      if (response.data.success) {
        Modal.error('Access revoked successfully!', 'Alert');
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      Modal.error(error.response?.data?.error || 'Failed to revoke access', 'Alert');
    } finally {
      setLoading(false);
    }
  };

  if (!grant) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Revoke Access</h2>
                  <p className="text-sm text-gray-600">Remove pharmacy access</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Grant Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Access Grant</h3>
                <p className="text-gray-800 font-medium">{grant.pharmacyName || 'Pharmacy'}</p>
                {grant.pharmacistWalletAddress && (
                  <p className="text-xs text-gray-600 mt-1 font-mono break-all">
                    {grant.pharmacistWalletAddress}
                  </p>
                )}
                <div className="mt-3 text-sm text-gray-600">
                  <p>Granted: {new Date(grant.grantedAt || grant.createdAt).toLocaleDateString()}</p>
                  <p>Expires: {new Date(grant.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-red-900">Are you sure?</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This pharmacy will immediately lose access to this prescription. 
                      They won't be able to view or dispense it anymore.
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      You can grant access again later if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      Revoke Access
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
