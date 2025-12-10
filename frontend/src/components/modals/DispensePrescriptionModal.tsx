import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

interface DispensePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: any;
  onSuccess?: () => void;
}

export const DispensePrescriptionModal: React.FC<DispensePrescriptionModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onSuccess
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<any>(null);

  // Verify prescription when modal opens
  React.useEffect(() => {
    if (isOpen && prescription) {
      verifyPrescription();
    }
  }, [isOpen, prescription]);

  const verifyPrescription = async () => {
    setVerifying(true);
    try {
      const response = await axios.get(`/prescriptions/${prescription.id}/verify`);
      if (response.data.success) {
        setVerification(response.data.data.verification);
      }
    } catch (error) {
      console.error('Failed to verify prescription:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await axios.post(`/prescriptions/${prescription.id}/dispense`, {
        pharmacistWallet: user?.walletAddress,
        dispensedQuantity: parseInt(data.dispensedQuantity) || prescription.quantity,
        dispensedDate: new Date().toISOString(),
        notes: data.notes,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null
      });

      if (response.data.success) {
        alert('Prescription dispensed successfully!');
        reset();
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to dispense prescription:', error);
      alert(error.response?.data?.message || 'Failed to dispense prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setVerification(null);
      onClose();
    }
  };

  if (!prescription) return null;

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
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Pill className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Dispense Prescription</h2>
                  <p className="text-sm text-gray-600">{prescription.medicationName}</p>
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

            <div className="p-6 space-y-4">
              {/* Verification Status */}
              {verifying ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                  <span className="text-gray-700">Verifying prescription...</span>
                </div>
              ) : verification ? (
                <div className={`border rounded-xl p-4 ${
                  verification.isValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {verification.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        verification.isValid ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {verification.isValid ? 'Prescription Valid' : 'Prescription Invalid'}
                      </h3>
                      {verification.warnings && verification.warnings.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {verification.warnings.map((warning: string, index: number) => (
                            <li key={index} className="text-sm text-red-700">• {warning}</li>
                          ))}
                        </ul>
                      )}
                      {verification.isValid && (
                        <p className="text-sm text-green-700 mt-1">
                          Expires in {verification.daysUntilExpiry} days
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Prescription Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-3">Prescription Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Medication:</span>
                    <p className="font-medium text-gray-900">{prescription.medicationName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Dosage:</span>
                    <p className="font-medium text-gray-900">{prescription.dosage}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Frequency:</span>
                    <p className="font-medium text-gray-900">{prescription.frequency}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium text-gray-900">{prescription.duration}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p className="font-medium text-gray-900">{prescription.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Refills:</span>
                    <p className="font-medium text-gray-900">{prescription.refills}</p>
                  </div>
                </div>
                {prescription.instructions && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <span className="text-gray-600 text-sm">Instructions:</span>
                    <p className="text-gray-900 mt-1">{prescription.instructions}</p>
                  </div>
                )}
              </div>

              {/* Dispensing Form */}
              {verification?.isValid && (
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                  {/* Quantity Dispensed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity Dispensed *
                    </label>
                    <input
                      type="number"
                      {...register('dispensedQuantity', { 
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Quantity must be at least 1' },
                        max: { value: prescription.quantity, message: `Cannot exceed ${prescription.quantity}` }
                      })}
                      defaultValue={prescription.quantity}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {errors.dispensedQuantity && (
                      <p className="text-red-500 text-sm mt-1">{errors.dispensedQuantity.message as string}</p>
                    )}
                  </div>

                  {/* Batch Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      {...register('batchNumber')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., BATCH-2024-001"
                    />
                  </div>

                  {/* Medication Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medication Expiry Date
                    </label>
                    <input
                      type="date"
                      {...register('expiryDate')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Pharmacist Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pharmacist Notes
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Patient counseled on side effects, storage instructions provided"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
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
                          Dispensing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Dispense Medication
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Cannot Dispense Message */}
              {verification && !verification.isValid && (
                <div className="text-center py-4">
                  <p className="text-red-600 font-medium">
                    This prescription cannot be dispensed at this time.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
