import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface RevokeConsentModalProps {
  isOpen: boolean;
  consent: any;
  onClose: () => void;
  onRevoke: (reason: string) => Promise<void>;
}

export const RevokeConsentModal: React.FC<RevokeConsentModalProps> = ({
  isOpen,
  consent,
  onClose,
  onRevoke
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmations, setConfirmations] = useState({
    understand: false,
    proceed: false
  });
  const [loading, setLoading] = useState(false);

  const predefinedReasons = [
    'Treatment completed',
    'Changing doctors',
    'Privacy concerns',
    'No longer needed',
    'Other reason'
  ];

  const handleRevoke = async () => {
    if (!confirmations.understand || !confirmations.proceed) return;
    if (!reason) return;

    setLoading(true);
    try {
      const finalReason = reason === 'Other reason' ? customReason : reason;
      await onRevoke(finalReason);
      handleClose();
    } catch (error) {
      console.error('Failed to revoke:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    setConfirmations({ understand: false, proceed: false });
    onClose();
  };

  if (!consent) return null;

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
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">Revoke Access Confirmation</h2>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Doctor Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">You are about to revoke access for:</p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    {consent.doctor?.user?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      👨‍⚕️ {consent.doctor?.user?.name || 'Doctor'}
                    </h3>
                    <p className="text-gray-600">{consent.doctor?.specialty || 'Healthcare Provider'}</p>
                  </div>
                </div>
              </div>

              {/* Consequences Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900 mb-2">⚠️ CONSEQUENCES:</h4>
                    <ul className="space-y-2 text-sm text-red-800">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Doctor immediately loses access to your records</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Cannot view past or new records</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>May affect ongoing treatment</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Doctor will be notified of revocation</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  📝 Reason for Revoking (Optional but recommended):
                </label>
                <div className="space-y-2">
                  {predefinedReasons.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        reason === r
                          ? 'border-medical-500 bg-medical-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-900">{r}</span>
                    </label>
                  ))}
                </div>

                {reason === 'Other reason' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Please specify your reason..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    />
                  </motion.div>
                )}
              </div>

              {/* Confirmations */}
              <div className="space-y-3">
                <p className="font-semibold text-gray-900">ARE YOU SURE?</p>
                
                <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={confirmations.understand}
                    onChange={(e) => setConfirmations({ ...confirmations, understand: e.target.checked })}
                    className="mt-1 mr-3"
                  />
                  <span className="text-gray-900">
                    ✅ I understand this action and its consequences
                  </span>
                </label>

                <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={confirmations.proceed}
                    onChange={(e) => setConfirmations({ ...confirmations, proceed: e.target.checked })}
                    className="mt-1 mr-3"
                  />
                  <span className="text-gray-900">
                    ✅ I want to proceed with revoking access
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={!confirmations.understand || !confirmations.proceed || !reason || loading}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Confirm Revoke
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
