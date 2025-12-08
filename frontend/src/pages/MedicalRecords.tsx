import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Download, Eye, Calendar, User, Users } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import type { MedicalRecord } from '../types/healthcare';
import { CreateRecordModal } from '../components/modals/CreateRecordModal';
import { ipfsService } from '../services/ipfs';
import { useConsentCheck } from '../hooks/useConsentCheck';
import { NoAccessView } from '../components/consent/NoAccessView';
import { AccessGrantedBanner } from '../components/doctor/AccessGrantedBanner';

interface Patient {
  walletAddress: string;
  fullName: string;
}

export const MedicalRecords: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  
  // Get patient wallet from URL params (for doctors viewing patient records)
  const viewingPatientWallet = searchParams.get('patient');
  const targetWallet = viewingPatientWallet || user?.walletAddress;
  
  // Check consent if doctor is viewing patient records
  const { hasAccess, loading: consentLoading, consent } = useConsentCheck(
    viewingPatientWallet || undefined,
    'viewMedicalHistory'
  );

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchPatientsWithConsent();
    }
  }, [user?.role]);

  useEffect(() => {
    fetchRecords();
  }, [targetWallet]);

  const fetchPatientsWithConsent = async () => {
    if (!user?.walletAddress) return;
    
    setLoadingPatients(true);
    try {
      const uniquePatients = new Map<string, Patient>();
      
      // Fetch patients with active consent
      const consentsResponse = await axios.get(`/consent/doctor/${user.walletAddress}`, {
        params: { status: 'active' }
      });

      if (consentsResponse.data.success) {
        consentsResponse.data.data.forEach((consent: any) => {
          const patientWallet = consent.patientWalletAddress;
          if (patientWallet) {
            uniquePatients.set(patientWallet, {
              walletAddress: patientWallet,
              fullName: consent.patient?.user?.name || 
                       consent.patient?.name ||
                       consent.patient?.user?.email?.split('@')[0] ||
                       `Patient ${patientWallet.substring(0, 8)}...`
            });
          }
        });
      }

      // Also fetch from appointments
      const appointmentsResponse = await axios.get('/appointments', {
        params: {
          userRole: 'doctor',
          userId: user.walletAddress
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
                       `Patient ${patientWallet.substring(0, 8)}...`
            });
          }
        });
      }

      setPatients(Array.from(uniquePatients.values()));
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handlePatientSelect = (patientWallet: string) => {
    if (patientWallet === 'own') {
      navigate('/medical-records');
    } else {
      navigate(`/medical-records?patient=${patientWallet}`);
    }
  };

  const fetchRecords = async () => {
    if (!targetWallet) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching medical records for:', targetWallet);
      const response = await axios.get(`/medical-records/${targetWallet}`);
      
      if (response.data.success) {
        const backendRecords = response.data.data.map((record: any) => ({
          id: record.id.toString(),
          patientId: record.patientWalletAddress,
          doctorId: record.doctorWalletAddress,
          title: `${record.recordType} - ${new Date(record.createdAt).toLocaleDateString()}`,
          diagnosis: record.diagnosis || 'No diagnosis provided',
          treatment: record.treatment || 'No treatment specified',
          symptoms: 'See full record',
          notes: record.notes || 'No additional notes',
          date: record.createdAt.split('T')[0],
          ipfsHash: record.ipfsHash,
          isEncrypted: true,
          blockchainTxHash: record.blockchainTxHash || null
        }));
        
        setRecords(backendRecords);
        console.log('✅ Loaded', backendRecords.length, 'medical records');
      } else {
        console.log('📝 No medical records found');
        setRecords([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch medical records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (data: any) => {
    try {
      console.log('📝 Creating medical record...', data);

      // Validate patient wallet is provided
      if (!data.patientWallet) {
        alert('Please select a patient for this medical record');
        return;
      }

      let ipfsHash = '';
      let fileUrl = '';

      // Upload file to IPFS if provided
      if (data.file) {
        console.log('📤 Uploading file to IPFS...');
        const uploadResult = await ipfsService.uploadFile(data.file, {
          name: `medical-record-${Date.now()}-${data.file.name}`,
          keyvalues: {
            type: 'medical-record-attachment',
            patientWallet: data.patientWallet,
            doctorWallet: user?.walletAddress || '',
          }
        });

        if (uploadResult.success) {
          ipfsHash = uploadResult.ipfsHash || '';
          fileUrl = uploadResult.ipfsUrl || '';
          console.log('✅ File uploaded to IPFS:', ipfsHash);
        } else {
          console.error('❌ IPFS upload failed:', uploadResult.error);
          alert('Failed to upload file to IPFS. Creating record without attachment.');
        }
      }

      // Create medical record via API - use selected patient wallet
      const recordData = {
        patientWalletAddress: data.patientWallet, // Use selected patient
        doctorWalletAddress: user?.walletAddress, // Doctor creating the record
        recordType: 'consultation',
        title: data.title,
        description: data.notes || '',
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        symptoms: data.symptoms ? data.symptoms.split(',').map((s: string) => s.trim()) : [],
        visitDate: new Date().toISOString(),
        ipfsHash: ipfsHash || null,
        fileUrl: fileUrl || null,
        isEncrypted: true
      };

      console.log('📤 Sending record to backend...', recordData);

      const response = await axios.post('/medical-records', recordData, {
        headers: {
          'x-wallet-address': user?.walletAddress
        }
      });

      if (response.data.success) {
        console.log('✅ Medical record created successfully');
        alert('Medical record created successfully!');
        fetchRecords(); // Refresh the list
      } else {
        console.error('❌ Failed to create record:', response.data);
        alert('Failed to create medical record. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error creating medical record:', error);
      alert(error.response?.data?.message || 'Failed to create medical record. Please try again.');
    }
  };

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading while checking consent
  if (loading || consentLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // If doctor is viewing patient records without consent, show no access view
  if (user?.role === 'doctor' && viewingPatientWallet && !hasAccess) {
    return (
      <NoAccessView
        patientWalletAddress={viewingPatientWallet}
        message="You need patient consent to view these medical records."
        onAccessGranted={() => window.location.reload()}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Access Granted Banner for Doctors */}
      {user?.role === 'doctor' && consent && hasAccess && (
        <AccessGrantedBanner
          patientName={viewingPatientWallet || 'Patient'}
          expiresAt={consent.expiresAt}
          permissions={consent.permissions}
          recordsAvailable={{
            consultations: records.filter(r => r.title.includes('Consultation')).length,
            labResults: records.filter(r => r.title.includes('Lab')).length,
            imagingReports: records.filter(r => r.title.includes('Imaging')).length,
            medications: records.filter(r => r.title.includes('Prescription')).length
          }}
          onViewRecords={() => {}}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('medical_records')}</h1>
            <p className="text-gray-600 mt-1">
              {viewingPatientWallet ? 'Viewing patient medical records' : 'View and manage your medical records'}
            </p>
          </div>

          {user?.role === 'doctor' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="healthcare-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Record
            </motion.button>
          )}
        </div>

        {/* Patient Selector for Doctors */}
        {user?.role === 'doctor' && (
          <div className="medical-card p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Select Patient to View Records
            </label>
            <select
              value={viewingPatientWallet || 'own'}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
              disabled={loadingPatients}
            >
              <option value="own">My Own Records</option>
              {patients.length > 0 && <option disabled>─────────────────</option>}
              {patients.map((patient) => (
                <option key={patient.walletAddress} value={patient.walletAddress}>
                  {patient.fullName} ({patient.walletAddress.substring(0, 8)}...)
                </option>
              ))}
              {patients.length === 0 && !loadingPatients && (
                <option disabled>No patients with active consent</option>
              )}
            </select>
            {loadingPatients && (
              <p className="text-sm text-gray-500 mt-2">Loading patients...</p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search medical records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Records Grid */}
      <div className="grid gap-6">
        <AnimatePresence>
          {filteredRecords.map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
              className="medical-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-medical-100 rounded-xl flex items-center justify-center"
                  >
                    <FileText className="w-6 h-6 text-medical-600" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{record.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{record.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Dr. {record.doctorId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {record.blockchainTxHash && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-medical-500 rounded-full"
                    title="Verified on Blockchain"
                  />
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Diagnosis:</p>
                  <p className="text-gray-600">{record.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Treatment:</p>
                  <p className="text-gray-600">{record.treatment}</p>
                </div>
                {record.symptoms && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Symptoms:</p>
                    <p className="text-gray-600">{record.symptoms}</p>
                  </div>
                )}
              </div>

              {record.ipfsHash && (
                <div className="flex items-center gap-1 text-xs text-medical-600 mb-4">
                  <div className="w-2 h-2 bg-medical-500 rounded-full" />
                  <span>Secured on IPFS: {record.ipfsHash.substring(0, 15)}...</span>
                </div>
              )}

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 border border-medical-500 text-medical-500 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 bg-medical-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No medical records found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search' : 'No medical records have been created yet'}
          </p>
        </motion.div>
      )}

      {/* Create Record Modal */}
      <CreateRecordModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRecord}
      />
    </motion.div>
  );
};
