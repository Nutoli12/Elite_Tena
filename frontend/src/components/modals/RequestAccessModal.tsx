import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2, User, Clock, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientWalletAddress?: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  isOpen,
  onClose,
  patientWalletAddress: initialPatient,
  appointmentId,
  onSuccess
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);

  const selectedPermissions = watch('permissions') || [];
  const durationType = watch('durationType') || '24hours';

  useEffect(() => {
    if (isOpen && !initialPatient) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const doctorWallet = user?.walletAddress;
      
      if (!doctorWallet) {
        console.error('Doctor wallet address not found');
        alert('Please log in again to continue');
        return;
      }
      
      const permissions = {
        viewMedicalHistory: selectedPermissions.includes('viewMedicalHistory'),
        viewLabResults: selectedPermissions.includes('viewLabResults'),
        viewPrescriptions: selectedPermissions.includes('viewPrescriptions'),
        addConsultationNotes: selectedPermissions.includes('addConsultationNotes'),
        orderTests: selectedPermissions.includes('orderTests'),
        writePrescriptions: selectedPermissions.includes('writePrescriptions'),
        shareWithColleagues: false,
        exportRecords: false,
        deleteRecords: false
      };

      let durationType, durationValue;
      switch (data.durationType) {
        case 'appointment':
          durationType = 'appointment_only';
          durationValue = 2;
          break;
        case '24hours':
          durationType = 'hours';
          durationValue = 24;
          break;
        case '7days':
          durationType = 'days';
          durationValue = 7;
          break;
        case '30days':
          durationType = 'days';
          durationValue = 30;
          break;
        default:
          durationType = 'hours';
          durationValue = 24;
      }

      await axios.post('/consent/request', {
        patientWalletAddress: initialPatient || data.patientWalletAddress,
        doctorWalletAddress: doctorWallet,
        appointmentId: appointmentId || null,
        purpose: data.purpose,
        requestReason: data.requestReason,
        permissions,
        durationType,
        durationValue,
        consentTypes: ['medical_records']
      });

      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to request access:', error);
    } finally {
      setLoading(false);
    }
  };

  const permissionOptions = [
    { id: 'viewMedicalHistory', label: 'View medical history', icon: '📋', recommended: true },
    { id: 'viewLabResults', label: 'View lab results', icon: '🧪', recommended: true },
    { id: 'viewPrescriptions', label: 'View prescriptions', icon: '💊', recommended: true },
    { id: 'addConsultationNotes', label: 'Add consultation notes', icon: '📝', recommended: true },
    { id: 'orderTests', label: 'Order tests', icon: '🔬', recommended: false },
    { id: 'writePrescriptions', label: 'Write prescriptions', icon: '💉', recommended: false }
  ];

  const durationOptions = [
    { value: 'appointment', label: 'This appointment only (2 hours)', icon: '⏱️' },
    { value: '24hours', label: '24 hours (Standard)', icon: '📅', recommended: true },
    { value: '7days', label: '7 days (Weekly follow-up)', icon: '📆' },
    { value: '30days', label: '30 days (Chronic condition)', icon: '🗓️' }
  ];

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
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">Request Patient Access</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
              {/* Patient Selection */}
              {!initialPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Select Patient *
                  </label>
                  <select
                    {...register('patientWalletAddress', { required: 'Please select a patient' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient.walletAddress} value={patient.walletAddress}>
                        {patient.user?.name || patient.walletAddress}
                      </option>
                    ))}
                  </select>
                  {errors.patientWalletAddress && (
                    <p className="text-red-500 text-sm mt-1">{errors.patientWalletAddress.message as string}</p>
                  )}
                </div>
              )}

              {/* Access Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Access Needed * (Select at least one)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissionOptions.map((permission) => (
                    <label
                      key={permission.id}
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedPermissions.includes(permission.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        {...register('permissions', { required: 'Select at least one permission' })}
                        value={permission.id}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{permission.icon}</span>
                          <span className="font-medium text-gray-900">{permission.label}</span>
                        </div>
                        {permission.recommended && (
                          <span className="text-xs text-blue-600 mt-1 inline-block">Recommended</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.permissions && (
                  <p className="text-red-500 text-sm mt-1">{errors.permissions.message as string}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration Requested *
                </label>
                <div className="space-y-2">
                  {durationOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        durationType === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('durationType', { required: true })}
                        value={option.value}
                        className="mr-3"
                      />
                      <span className="text-xl mr-3">{option.icon}</span>
                      <span className="flex-1 font-medium text-gray-900">{option.label}</span>
                      {option.recommended && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Purpose of Access *
                </label>
                <input
                  type="text"
                  {...register('purpose', { required: 'Purpose is required' })}
                  placeholder="e.g., Cardiology consultation, Follow-up visit..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.purpose && (
                  <p className="text-red-500 text-sm mt-1">{errors.purpose.message as string}</p>
                )}
              </div>

              {/* Reason/Justification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Reason (Optional but recommended)
                </label>
                <textarea
                  {...register('requestReason')}
                  rows={3}
                  placeholder="Explain why you need access to help the patient make an informed decision..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">📋 What happens next:</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Patient will receive a notification about your request</li>
                  <li>They can approve, deny, or modify the permissions</li>
                  <li>You'll be notified once they make a decision</li>
                  <li>Access will automatically expire after the specified duration</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedPermissions.length === 0}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Send Request
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
