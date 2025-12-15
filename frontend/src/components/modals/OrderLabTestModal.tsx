import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Beaker, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';
import { Modal } from '../../services/modalService';

interface OrderLabTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientWallet: string;
  patientName: string;
  onSuccess?: () => void;
}

export const OrderLabTestModal: React.FC<OrderLabTestModalProps> = ({
  isOpen,
  onClose,
  patientWallet,
  patientName,
  onSuccess
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  const [loading, setLoading] = useState(false);

  const testType = watch('testType');

  const commonTests = {
    'Blood Test': [
      'Complete Blood Count (CBC)',
      'Blood Glucose',
      'Lipid Profile',
      'Liver Function Test',
      'Kidney Function Test',
      'Thyroid Function Test',
      'Hemoglobin A1C'
    ],
    'Urine Test': [
      'Urinalysis',
      'Urine Culture',
      'Urine Protein',
      '24-Hour Urine Collection'
    ],
    'Imaging': [
      'X-Ray',
      'CT Scan',
      'MRI',
      'Ultrasound',
      'Mammogram'
    ],
    'Other': [
      'ECG',
      'Echocardiogram',
      'Stress Test',
      'Biopsy',
      'Culture Test'
    ]
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await axios.post('/lab-results', {
        patientWalletAddress: patientWallet,
        doctorWalletAddress: user?.walletAddress,
        testType: data.testType,
        testName: data.testName,
        priority: data.priority,
        instructions: data.instructions,
        reason: data.reason,
        testDate: new Date().toISOString(),
        status: 'pending'
      });

      if (response.data.success) {
        Modal.error('Lab test ordered successfully!', 'Alert');
        reset();
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to order lab test:', error);
      Modal.error(error.response?.data?.message || 'Failed to order lab test', 'Alert');
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
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Lab Test</h2>
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
              {/* Test Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type *
                </label>
                <select
                  {...register('testType', { required: 'Test type is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select test type</option>
                  <option value="Blood Test">Blood Test</option>
                  <option value="Urine Test">Urine Test</option>
                  <option value="Imaging">Imaging</option>
                  <option value="Other">Other</option>
                </select>
                {errors.testType && (
                  <p className="text-red-500 text-sm mt-1">{errors.testType.message as string}</p>
                )}
              </div>

              {/* Test Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Name *
                </label>
                {testType && commonTests[testType as keyof typeof commonTests] ? (
                  <select
                    {...register('testName', { required: 'Test name is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select test</option>
                    {commonTests[testType as keyof typeof commonTests].map((test) => (
                      <option key={test} value={test}>{test}</option>
                    ))}
                    <option value="custom">Other (specify below)</option>
                  </select>
                ) : (
                  <input
                    {...register('testName', { required: 'Test name is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Complete Blood Count"
                  />
                )}
                {errors.testName && (
                  <p className="text-red-500 text-sm mt-1">{errors.testName.message as string}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  {...register('priority', { required: 'Priority is required' })}
                  defaultValue="routine"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Immediate)</option>
                </select>
                {errors.priority && (
                  <p className="text-red-500 text-sm mt-1">{errors.priority.message as string}</p>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  {...register('instructions')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Fasting required - 8 hours, No caffeine 24 hours before test"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include any preparation requirements for the patient
                </p>
              </div>

              {/* Reason for Test */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Test *
                </label>
                <textarea
                  {...register('reason', { required: 'Reason is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Annual checkup, Follow-up for diabetes, Suspected infection"
                />
                {errors.reason && (
                  <p className="text-red-500 text-sm mt-1">{errors.reason.message as string}</p>
                )}
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
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Ordering...
                    </>
                  ) : (
                    <>
                      <Beaker className="w-5 h-5" />
                      Order Lab Test
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
