import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

interface ManualGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: any;
  onSuccess?: () => void;
}

export const ManualGrantModal: React.FC<ManualGrantModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacistWallet, setPharmacistWallet] = useState('');
  const [expiryType, setExpiryType] = useState<'days' | 'date'>('days');
  const [expiryDays, setExpiryDays] = useState(30);
  const [expiryDate, setExpiryDate] = useState('');
  const [patientNote, setPatientNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pharmacyName.trim() || !pharmacistWallet.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        patientWalletAddress: user?.walletAddress,
        pharmacistWalletAddress: pharmacistWallet.trim(),
        pharmacyName: pharmacyName.trim(),
        patientNote: patientNote.trim() || undefined
      };

      if (expiryType === 'days') {
        payload.expiryDays = expiryDays;
      } else {
        payload.expiryDate = new Date(expiryDate).toISOString();
      }

      const response = await axios.post(
        `/prescriptions/${prescription.id}/access/manual-grant`,
        payload
      );

      if (response.data.success) {
        alert('Access granted to pharmacy!');
        resetForm();
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      alert(error.response?.data?.error || 'Failed to grant access');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPharmacyName('');
    setPharmacistWallet('');
    setExpiryType('days');
    setExpiryDays(30);
    setExpiryDate('');
    setPatientNote('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

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
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Manual Grant</h2>
                  <p className="text-sm text-gray-600">Choose pharmacy and set expiry</p>
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
              {/* Prescription Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Prescription</h3>
                <p className="text-gray-800 font-medium">{prescription.medicationName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {prescription.dosage} • {prescription.frequency}
                </p>
              </div>

              {/* Pharmacy Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacy Name *
                </label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., City Pharmacy"
                  required
                />
              </div>

              {/* Pharmacist Wallet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacist Wallet Address *
                </label>
                <input
                  type="text"
                  value={pharmacistWallet}
                  onChange={(e) => setPharmacistWallet(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask the pharmacist for their wallet address
                </p>
              </div>

              {/* Expiry Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Duration
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setExpiryType('days')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      expiryType === 'days'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryType('date')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      expiryType === 'date'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Specific Date
                  </button>
                </div>

                {expiryType === 'days' ? (
                  <div>
                    <div className="grid grid-cols-4 gap-2">
                      {[7, 14, 30, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setExpiryDays(days)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            expiryDays === days
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg font-bold">{days}</div>
                            <div className="text-xs text-gray-600">days</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      Expires on {new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Pharmacy near my office"
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
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Grant Access
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
