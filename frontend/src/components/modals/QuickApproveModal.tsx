import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

interface QuickApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: any;
  onSuccess?: () => void;
}

export const QuickApproveModal: React.FC<QuickApproveModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [patientNote, setPatientNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `/prescriptions/${prescription.id}/access/quick-approve`,
        {
          patientWalletAddress: user?.walletAddress,
          expiryDays,
          patientNote: patientNote.trim() || undefined
        }
      );

      if (response.data.success) {
        alert('Access granted to pharmacy!');
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to quick approve:', error);
      alert(error.response?.data?.error || 'Failed to grant access');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPatientNote('');
      setExpiryDays(30);
      onClose();
    }
  };

  if (!prescription?.suggestedPharmacyWallet) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Quick Approve</h2>
                  <p className="text-sm text-gray-600">Grant access to suggested pharmacy</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Pharmacy Info */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-900 mb-2">Suggested Pharmacy</h3>
                <p className="text-green-800 font-medium">{prescription.suggestedPharmacyName}</p>
                <p className="text-xs text-green-700 mt-1 font-mono break-all">
                  {prescription.suggestedPharmacyWallet}
                </p>
              </div>

              {/* Prescription Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Prescription</h3>
                <p className="text-gray-800 font-medium">{prescription.medicationName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {prescription.dosage} • {prescription.frequency}
                </p>
              </div>

              {/* Expiry Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiryDays(days)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        expiryDays === days
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{days}</div>
                        <div className="text-xs text-gray-600">days</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Access expires on {new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., My regular pharmacy"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p>
                  ✓ The pharmacy will be able to view and dispense this prescription
                </p>
                <p className="mt-1">
                  ✓ You can revoke access anytime before dispensing
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Approve Access
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
