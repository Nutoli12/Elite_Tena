import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, List, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DoctorConsentRequests } from '../../components/doctor/DoctorConsentRequests';
import { RequestAccessModal } from '../../components/modals/RequestAccessModal';

export const DoctorConsent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [prefilledPatient, setPrefilledPatient] = useState<string | undefined>();
  const [prefilledAppointment, setPrefilledAppointment] = useState<string | undefined>();

  useEffect(() => {
    // Check if we have URL parameters for pre-filling
    const patient = searchParams.get('patient');
    const appointment = searchParams.get('appointment');
    
    if (patient) {
      setPrefilledPatient(patient);
      setPrefilledAppointment(appointment || undefined);
      setShowRequestModal(true);
    }
  }, [searchParams]);

  const handleRequestSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setPrefilledPatient(undefined);
    setPrefilledAppointment(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-medical-600" />
            Patient Access Management
          </h1>
          <p className="text-gray-600 mt-2">Request and manage access to patient records</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRequestModal(true)}
          className="healthcare-button flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Request Access
        </motion.button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -5 }}
          className="medical-card p-6 text-center"
        >
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-900 mb-2">Request Access</h3>
          <p className="text-sm text-gray-600">
            Send access requests to patients for their medical records
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -5 }}
          className="medical-card p-6 text-center"
        >
          <div className="text-3xl mb-3">⏳</div>
          <h3 className="font-semibold text-gray-900 mb-2">Track Status</h3>
          <p className="text-sm text-gray-600">
            Monitor pending, approved, and denied access requests
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
          className="medical-card p-6 text-center"
        >
          <div className="text-3xl mb-3">✅</div>
          <h3 className="font-semibold text-gray-900 mb-2">Time-Limited</h3>
          <p className="text-sm text-gray-600">
            All access is time-limited and automatically expires
          </p>
        </motion.div>
      </div>

      {/* Requests List */}
      <DoctorConsentRequests key={refreshTrigger} />

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setPrefilledPatient(undefined);
          setPrefilledAppointment(undefined);
        }}
        patientWalletAddress={prefilledPatient}
        appointmentId={prefilledAppointment}
        onSuccess={handleRequestSuccess}
      />
    </motion.div>
  );
};
