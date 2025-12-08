import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

interface Patient {
  walletAddress: string;
  fullName: string;
}

export const CreateRecordModal: React.FC<CreateRecordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Fetch doctor's patients when modal opens
  useEffect(() => {
    if (isOpen && user?.walletAddress) {
      fetchPatients();
    }
  }, [isOpen, user?.walletAddress]);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      console.log('🔍 Fetching doctor\'s patients...');
      
      const uniquePatients = new Map<string, Patient>();
      
      // 1. Fetch patients from appointments
      try {
        const appointmentsResponse = await axios.get('/appointments', {
          params: {
            userRole: 'doctor',
            userId: user?.walletAddress
          }
        });

        if (appointmentsResponse.data.success) {
          appointmentsResponse.data.data.forEach((appointment: any) => {
            const patientWallet = appointment.patientWalletAddress;
            if (patientWallet && !uniquePatients.has(patientWallet)) {
              uniquePatients.set(patientWallet, {
                walletAddress: patientWallet,
                fullName: appointment.patient?.user?.profileData?.fullName || 
                         appointment.patient?.user?.name ||
                         appointment.patient?.name ||
                         `Patient ${patientWallet.substring(0, 8)}...`
              });
            }
          });
        }
      } catch (error) {
        console.error('⚠️ Failed to fetch appointments:', error);
      }

      // 2. Fetch patients with active consent (who granted access)
      try {
        const consentsResponse = await axios.get(`/consent/doctor/${user?.walletAddress}`, {
          params: { status: 'active' }
        });

        if (consentsResponse.data.success) {
          consentsResponse.data.data.forEach((consent: any) => {
            const patientWallet = consent.patientWalletAddress;
            if (patientWallet && !uniquePatients.has(patientWallet)) {
              uniquePatients.set(patientWallet, {
                walletAddress: patientWallet,
                fullName: consent.patient?.user?.name || 
                         consent.patient?.name ||
                         consent.patient?.user?.email?.split('@')[0] ||
                         `Patient ${patientWallet.substring(0, 8)}...`
              });
            }
          });
          console.log('✅ Added', consentsResponse.data.data.length, 'patients with active consent');
        }
      } catch (error) {
        console.error('⚠️ Failed to fetch consents:', error);
      }

      const patientList = Array.from(uniquePatients.values());
      setPatients(patientList);
      console.log('✅ Total unique patients:', patientList.length);
    } catch (error) {
      console.error('❌ Failed to fetch patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ ...data, file, patientWallet: selectedPatient });
      reset();
      setFile(null);
      setSelectedPatient('');
      onClose();
    } catch (error) {
      console.error('Failed to create record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setFile(null);
      setSelectedPatient('');
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
              <h2 className="text-2xl font-bold text-gray-900">Create Medical Record</h2>
              <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
              {/* Patient Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Select Patient *
                </label>
                {loadingPatients ? (
                  <div className="flex items-center justify-center py-3 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading patients...
                  </div>
                ) : patients.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 text-center">
                    No patients found. Patients appear here after they book appointments with you.
                  </div>
                ) : (
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- Select a patient --</option>
                    {patients.map((patient) => (
                      <option key={patient.walletAddress} value={patient.walletAddress}>
                        {patient.fullName} ({patient.walletAddress.substring(0, 10)}...)
                      </option>
                    ))}
                  </select>
                )}
                {!selectedPatient && patients.length > 0 && (
                  <p className="text-amber-600 text-sm mt-1">Please select which patient this record is for</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Annual Checkup 2024"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                <textarea
                  {...register('diagnosis', { required: 'Diagnosis is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter diagnosis..."
                />
                {errors.diagnosis && <p className="text-red-500 text-sm mt-1">{errors.diagnosis.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment *</label>
                <textarea
                  {...register('treatment', { required: 'Treatment is required' })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Enter treatment plan..."
                />
                {errors.treatment && <p className="text-red-500 text-sm mt-1">{errors.treatment.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                <input
                  {...register('symptoms')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="e.g., Fever, cough, headache"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-medical-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer text-medical-600 hover:text-medical-700">
                    Click to upload or drag and drop
                  </label>
                  {file && <p className="text-sm text-gray-600 mt-2">{file.name}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 healthcare-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {file ? 'Uploading...' : 'Creating...'}
                    </>
                  ) : (
                    'Create Record'
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
