import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { Modal } from '../../services/modalService';

interface CreatePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientWallet: string;
  patientName: string;
  onSuccess?: () => void;
}

export const CreatePrescriptionModal: React.FC<CreatePrescriptionModalProps> = ({
  isOpen,
  onClose,
  patientWallet,
  patientName,
  onSuccess
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(data.duration));

      const payload: any = {
        patientWalletAddress: patientWallet,
        doctorWalletAddress: user?.walletAddress,
        medicationName: data.medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: `${data.duration} days`,
        instructions: data.instructions,
        quantity: parseInt(data.quantity),
        refills: parseInt(data.refills) || 0,
        issueDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString()
      };

      // Add suggested pharmacy if provided
      if (data.suggestedPharmacyName && data.suggestedPharmacyWallet) {
        payload.suggestedPharmacyName = data.suggestedPharmacyName.trim();
        payload.suggestedPharmacyWallet = data.suggestedPharmacyWallet.trim();
        payload.accessControlEnabled = true;
        payload.requiresPatientApproval = true;
      }

      const response = await axios.post('/prescriptions', payload);

      if (response.data.success) {
        Modal.error('Prescription created successfully!', 'Alert');
        reset();
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create prescription:', error);
      Modal.error(error.response?.data?.message || 'Failed to create prescription', 'Alert');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      onClose();
    }
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
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Pill className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Write Prescription</h2>
                  <p className="text-sm text-gray-600">For: {patientName}</p>
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

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              {/* Medication Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medication Name *
                </label>
                <input
                  {...register('medicationName', { required: 'Medication name is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Amoxicillin 500mg"
                />
                {errors.medicationName && (
                  <p className="text-red-500 text-sm mt-1">{errors.medicationName.message as string}</p>
                )}
              </div>

              {/* Dosage and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage *
                  </label>
                  <input
                    {...register('dosage', { required: 'Dosage is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 500mg"
                  />
                  {errors.dosage && (
                    <p className="text-red-500 text-sm mt-1">{errors.dosage.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    {...register('frequency', { required: 'Frequency is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="3 times daily">3 times daily</option>
                    <option value="4 times daily">4 times daily</option>
                    <option value="Every 4 hours">Every 4 hours</option>
                    <option value="Every 6 hours">Every 6 hours</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="As needed">As needed</option>
                  </select>
                  {errors.frequency && (
                    <p className="text-red-500 text-sm mt-1">{errors.frequency.message as string}</p>
                  )}
                </div>
              </div>

              {/* Duration and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (days) *
                  </label>
                  <input
                    type="number"
                    {...register('duration', { required: 'Duration is required', min: 1 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 7"
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    {...register('quantity', { required: 'Quantity is required', min: 1 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 21"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-sm mt-1">{errors.quantity.message as string}</p>
                  )}
                </div>
              </div>

              {/* Refills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refills Allowed
                </label>
                <input
                  type="number"
                  {...register('refills')}
                  defaultValue={0}
                  min={0}
                  max={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions *
                </label>
                <textarea
                  {...register('instructions', { required: 'Instructions are required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Take with food. Avoid alcohol. Complete full course."
                />
                {errors.instructions && (
                  <p className="text-red-500 text-sm mt-1">{errors.instructions.message as string}</p>
                )}
              </div>

              {/* Suggested Pharmacy (Optional) */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Suggest Pharmacy (Optional)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Recommend a pharmacy for the patient. They can quickly approve your suggestion.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pharmacy Name
                    </label>
                    <input
                      {...register('suggestedPharmacyName')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., City Pharmacy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pharmacist Wallet Address
                    </label>
                    <input
                      {...register('suggestedPharmacyWallet')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                </div>
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
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Pill className="w-5 h-5" />
                      Create Prescription
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
