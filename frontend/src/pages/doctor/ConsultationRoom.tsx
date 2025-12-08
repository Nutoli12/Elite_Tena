import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Clock, FileText, Activity, Save, CheckCircle, Video as VideoIcon, MessageSquare } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoCall } from '../../components/video/VideoCall';
import { ChatWindow } from '../../components/chat/ChatWindow';

export const ConsultationRoom: React.FC = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Consultation form state
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: ''
  });

  const [consultationNotes, setConsultationNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'notes'>('video');

  const isDoctor = user?.role === 'doctor';
  const otherUserWallet = isDoctor
    ? appointment?.patientWalletAddress
    : appointment?.doctorWalletAddress;
  const otherUserName = isDoctor
    ? (appointment?.patientDetails as any)?.user?.fullName || 'Patient'
    : (appointment?.doctorDetails as any)?.user?.fullName || 'Doctor';

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    }
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await axios.get(`/appointments/${appointmentId}`);
      if (response.data.success) {
        setAppointment(response.data.data);

        // Fetch patient medical history
        const historyResponse = await axios.get(
          `/medical-records/${response.data.data.patientWalletAddress}`
        );
        if (historyResponse.data.success) {
          setPatientHistory(historyResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      // Save consultation notes
      await axios.put(`/appointments/${appointmentId}/notes`, {
        notes: consultationNotes,
        vitalSigns,
        diagnosis,
        treatmentPlan
      });

      alert('Notes saved successfully!');
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!consultationNotes || !diagnosis) {
      alert('Please fill in consultation notes and diagnosis before completing');
      return;
    }

    try {
      const response = await axios.post(`/appointments/${appointmentId}/complete`, {
        notes: consultationNotes,
        vitalSigns,
        diagnosis,
        treatmentPlan
      });

      if (response.data.success) {
        alert('Consultation completed successfully!');
        navigate('/doctor/dashboard');
      }
    } catch (error) {
      console.error('Failed to complete consultation:', error);
      alert('Failed to complete consultation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Appointment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-medical-100 rounded-xl flex items-center justify-center">
                <User className="w-8 h-8 text-medical-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {(appointment.patientDetails as any)?.user?.fullName || 'Patient'}
                </h1>
                <p className="text-gray-600">Consultation in Progress</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span>Started: {new Date(appointment.consultationStartedAt || Date.now()).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-gray-500">
                Appointment: {new Date(appointment.appointmentDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (Video/Chat) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[600px]">
              {activeTab === 'video' ? (
                <VideoCall
                  otherUserWallet={otherUserWallet}
                  isInitiator={isDoctor}
                  onEndCall={() => setActiveTab('notes')}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <p className="text-gray-500">Video call ended</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Chat & Notes) */}
          <div className="space-y-6">
            {/* Tabs for Doctor */}
            {isDoctor && (
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'video' ? 'bg-medical-50 text-medical-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <VideoIcon className="w-4 h-4" />
                    Video
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notes' ? 'bg-medical-50 text-medical-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </div>
                </button>
              </div>
            )}

            {/* Chat Window */}
            <ChatWindow
              appointmentId={appointmentId!}
              otherUserWallet={otherUserWallet}
              otherUserName={otherUserName}
            />
          </div>
        </div>

        {/* Doctor's Medical Notes Section (Only visible to Doctor) */}
        {isDoctor && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left Column - Patient Info & History */}
            <div className="space-y-6">
              {/* Patient Basic Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Patient Information</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Age</p>
                    <p className="font-semibold text-gray-900">
                      {(appointment.patientDetails as any)?.age || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Blood Type</p>
                    <p className="font-semibold text-gray-900">
                      {(appointment.patientDetails as any)?.bloodType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Allergies</p>
                    <p className="font-semibold text-red-600">
                      {(appointment.patientDetails as any)?.allergies || 'None reported'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reason for Visit</p>
                    <p className="font-semibold text-gray-900">{appointment.reason}</p>
                  </div>
                </div>
              </motion.div>

              {/* Medical History */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Medical History</h2>
                {patientHistory && patientHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {patientHistory.slice(0, 5).map((record: any) => (
                      <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                        <p className="font-semibold text-sm text-gray-900">{record.diagnosis}</p>
                        <p className="text-xs text-gray-600 mt-1">{record.treatment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No previous medical records</p>
                )}
              </motion.div>
            </div>

            {/* Middle Column - Vital Signs & Notes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vital Signs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-medical-600" />
                  <h2 className="text-lg font-bold text-gray-900">Vital Signs</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blood Pressure
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.bloodPressure}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, bloodPressure: e.target.value })}
                      placeholder="120/80"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.heartRate}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, heartRate: e.target.value })}
                      placeholder="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.temperature}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, temperature: e.target.value })}
                      placeholder="36.8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      O2 Saturation (%)
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.oxygenSaturation}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, oxygenSaturation: e.target.value })}
                      placeholder="98"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.weight}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, weight: e.target.value })}
                      placeholder="70"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="text"
                      value={vitalSigns.height}
                      onChange={(e) => setVitalSigns({ ...vitalSigns, height: e.target.value })}
                      placeholder="170"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Consultation Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-medical-600" />
                  <h2 className="text-lg font-bold text-gray-900">Consultation Notes</h2>
                </div>
                <textarea
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  rows={6}
                  placeholder="Document patient symptoms, examination findings, and observations..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                />
              </motion.div>

              {/* Diagnosis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Diagnosis</h2>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  placeholder="Enter diagnosis..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                />
              </motion.div>

              {/* Treatment Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Treatment Plan</h2>
                <textarea
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  rows={4}
                  placeholder="Outline treatment plan, medications, follow-up instructions..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                />
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Notes
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCompleteConsultation}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Consultation
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
