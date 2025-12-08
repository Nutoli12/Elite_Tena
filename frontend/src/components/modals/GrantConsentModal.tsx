import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface GrantConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const GrantConsentModal: React.FC<GrantConsentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const consentTypes = watch('consentTypes') || [];

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Failed to grant consent:', error);
    } finally {
      setLoading(false);
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
          onClick={onClose}
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
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Grant Consent</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Healthcare Provider *</label>
                <select
                  {...register('providerId', { required: 'Please select a provider' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                >
                  <option value="">Select provider</option>
                  <option value="doc1">Dr. Alemayehu - Cardiology</option>
                  <option value="doc2">Dr. Selam - Dermatology</option>
                  <option value="lab1">City Laboratory</option>
                  <option value="pharm1">Health Plus Pharmacy</option>
                </select>
                {errors.providerId && <p className="text-red-500 text-sm mt-1">{errors.providerId.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Access Permissions *</label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-medical-500 transition-colors">
                    <input
                      type="checkbox"
                      {...register('consentTypes', { required: 'Please select at least one permission' })}
                      value="medical_records"
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">📁 Medical Records</p>
                      <p className="text-sm text-gray-600">Access to view and manage your medical records</p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-medical-500 transition-colors">
                    <input
                      type="checkbox"
                      {...register('consentTypes')}
                      value="prescriptions"
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">💊 Prescriptions</p>
                      <p className="text-sm text-gray-600">Access to view and manage your prescriptions</p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-medical-500 transition-colors">
                    <input
                      type="checkbox"
                      {...register('consentTypes')}
                      value="lab_results"
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">🧪 Lab Results</p>
                      <p className="text-sm text-gray-600">Access to view your laboratory test results</p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-red-300 rounded-xl cursor-pointer hover:border-red-500 transition-colors bg-red-50">
                    <input
                      type="checkbox"
                      {...register('consentTypes')}
                      value="emergency"
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-medium text-red-900">🚨 Emergency Access</p>
                      <p className="text-sm text-red-700">Full access in case of medical emergency</p>
                    </div>
                  </label>
                </div>
                {errors.consentTypes && <p className="text-red-500 text-sm mt-1">{errors.consentTypes.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
                <select
                  {...register('duration', { required: 'Please select duration' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                >
                  <option value="">Select duration</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">6 months</option>
                  <option value="365">1 year</option>
                  <option value="permanent">Permanent</option>
                </select>
                {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
                <textarea
                  {...register('purpose', { required: 'Purpose is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Routine medical care, consultation, treatment..."
                />
                {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose.message as string}</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-800 font-medium">
                  <strong>Important:</strong> By granting consent, you authorize the selected provider to:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Access the selected health information</li>
                  <li>View and download your medical data</li>
                  <li>Make updates as necessary for your care</li>
                </ul>
                <p className="text-sm text-blue-800 mt-2">
                  You can revoke this consent at any time from the Consent Management page.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || consentTypes.length === 0}
                  className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    'Grant Consent'
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
