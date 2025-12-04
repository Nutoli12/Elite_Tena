import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Clock,
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Save,
  CheckCircle,
  FileText,
  Pill,
  TestTube,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import axios from '../../lib/axios';

export const ConsultationInterface: React.FC = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Consultation data
  const [consultationNotes, setConsultationNotes] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyPresentIllness, setHistoryPresentIllness] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');

  // Examination findings
  const [examFindings, setExamFindings] = useState({
    heart: '',
    lungs: '',
    abdomen: '',
    extremities: '',
    neurological: '',
    other: ''
  });

  // Vital signs
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressure: '',
    pulse: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: ''
  });

  useEffect(() => {
    fetchConsultationDetails();
  }, [appointmentId]);

  // Timer effect
  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime]);

  // Auto-save effect
  useEffect(() => {
    if (startTime && consultationNotes) {
      const autoSaveTimer = setTimeout(() => {
        autoSaveNotes();
      }, 3000); // Auto-save after 3 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [consultationNotes, chiefComplaint, historyPresentIllness, examFindings, vitalSigns, provisionalDiagnosis]);

  const fetchConsultationDetails = async () => {
    try {
      console.log('🔍 Fetching consultation details for:', appointmentId);

      const response = await axios.get(`/consultations/${appointmentId}`);

      if (response.data.success) {
        const apt = response.data.data.appointment;
        setAppointment(apt);

        // Load existing data if consultation already started
        if (apt.consultationStartedAt) {
          setStartTime(new Date(apt.consultationStartedAt));
          setConsultationNotes(apt.consultationNotes || '');
          setChiefComplaint(apt.chiefComplaint || '');
          setHistoryPresentIllness(apt.historyPresentIllness || '');
          setProvisionalDiagnosis(apt.provisionalDiagnosis || '');
          setTreatmentPlan(apt.treatmentPlan || '');
          setFinalDiagnosis(apt.finalDiagnosis || '');
          if (apt.examFindings) setExamFindings(apt.examFindings);
          if (apt.vitalSigns) setVitalSigns(apt.vitalSigns);
        }

        console.log('✅ Consultation details loaded');
      }
    } catch (error) {
      console.error('❌ Failed to fetch consultation details:', error);
      alert('Failed to load consultation details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    try {
      console.log('🩺 Starting consultation...');

      const response = await axios.post(`/consultations/${appointmentId}/start`, {
        doctorWalletAddress: user?.walletAddress
      });

      if (response.data.success) {
        setStartTime(new Date());
        console.log('✅ Consultation started');
      }
    } catch (error) {
      console.error('❌ Failed to start consultation:', error);
      alert('Failed to start consultation');
    }
  };

  const autoSaveNotes = useCallback(async () => {
    if (!startTime) return;

    try {
      setSaving(true);

      await axios.put(`/consultations/${appointmentId}/notes`, {
        consultationNotes,
        chiefComplaint,
        historyPresentIllness,
        examFindings,
        vitalSigns,
        provisionalDiagnosis
      });

      console.log('💾 Notes auto-saved');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [appointmentId, consultationNotes, chiefComplaint, historyPresentIllness, examFindings, vitalSigns, provisionalDiagnosis, startTime]);

  const handleCompleteConsultation = async () => {
    if (!finalDiagnosis || !treatmentPlan) {
      alert('Please provide final diagnosis and treatment plan');
      return;
    }

    if (!window.confirm('Are you sure you want to complete this consultation?')) {
      return;
    }

    try {
      console.log('✅ Completing consultation...');

      const response = await axios.post(`/consultations/${appointmentId}/complete`, {
        doctorWalletAddress: user?.walletAddress,
        finalDiagnosis,
        treatmentPlan,
        icd10Codes: [], // TODO: Add ICD-10 selector
        prescriptions: [], // TODO: Add prescription interface
        followUpRequired: false,
        followUpDate: null
      });

      if (response.data.success) {
        alert('Consultation completed successfully!');
        navigate('/appointments');
      }
    } catch (error) {
      console.error('❌ Failed to complete consultation:', error);
      alert('Failed to complete consultation');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Not Found</h2>
          <button
            onClick={() => navigate('/appointments')}
            className="healthcare-button"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  const patientName = appointment.patientDetails?.user?.profileData?.fullName || 
                      appointment.patientWalletAddress?.substring(0, 10) + '...';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/appointments')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🩺 Consultation - {patientName}
              </h1>
              <p className="text-sm text-gray-600">
                {new Date(appointment.appointmentDate).toLocaleDateString()} at{' '}
                {new Date(appointment.appointmentDate).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {startTime && (
              <div className="flex items-center gap-2 bg-medical-50 px-4 py-2 rounded-lg">
                <Clock className="w-5 h-5 text-medical-600" />
                <span className="text-lg font-mono font-bold text-medical-600">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            )}

            {/* Auto-save indicator */}
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Save className="w-4 h-4 animate-pulse" />
                <span>Saving...</span>
              </div>
            )}

            {/* Start/Complete buttons */}
            {!startTime ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartConsultation}
                className="healthcare-button flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Start Consultation
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCompleteConsultation}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Consultation
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Patient Info & Vitals */}
        <div className="space-y-6">
          {/* Patient Information */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {patientName}
              </div>
              <div>
                <span className="font-medium">Reason:</span> {appointment.reason || 'Consultation'}
              </div>
              {appointment.notes && (
                <div>
                  <span className="font-medium">Notes:</span> {appointment.notes}
                </div>
              )}
            </div>
          </div>

          {/* Vital Signs */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Vital Signs
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Heart className="w-4 h-4 inline mr-1" />
                  Blood Pressure
                </label>
                <input
                  type="text"
                  value={vitalSigns.bloodPressure}
                  onChange={(e) => setVitalSigns({...vitalSigns, bloodPressure: e.target.value})}
                  placeholder="120/80 mmHg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  Pulse
                </label>
                <input
                  type="text"
                  value={vitalSigns.pulse}
                  onChange={(e) => setVitalSigns({...vitalSigns, pulse: e.target.value})}
                  placeholder="72 bpm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Thermometer className="w-4 h-4 inline mr-1" />
                  Temperature
                </label>
                <input
                  type="text"
                  value={vitalSigns.temperature}
                  onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
                  placeholder="36.5°C"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Wind className="w-4 h-4 inline mr-1" />
                  O2 Saturation
                </label>
                <input
                  type="text"
                  value={vitalSigns.oxygenSaturation}
                  onChange={(e) => setVitalSigns({...vitalSigns, oxygenSaturation: e.target.value})}
                  placeholder="98%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={!startTime}
              >
                <TestTube className="w-4 h-4" />
                Order Tests
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={!startTime}
              >
                <Pill className="w-4 h-4" />
                Write Prescription
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={!startTime}
              >
                <FileText className="w-4 h-4" />
                View History
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Consultation Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chief Complaint */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chief Complaint</h3>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Patient's main complaint..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 h-20"
              disabled={!startTime}
            />
          </div>

          {/* History of Present Illness */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">History of Present Illness</h3>
            <textarea
              value={historyPresentIllness}
              onChange={(e) => setHistoryPresentIllness(e.target.value)}
              placeholder="Detailed history..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 h-32"
              disabled={!startTime}
            />
          </div>

          {/* Consultation Notes */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Notes</h3>
            <textarea
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              placeholder="Type your consultation notes here... (auto-saves)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 h-48 font-mono text-sm"
              disabled={!startTime}
            />
          </div>

          {/* Physical Examination */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Physical Examination</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(examFindings).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setExamFindings({...examFindings, [key]: e.target.value})}
                    placeholder={`${key} findings...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                    disabled={!startTime}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="medical-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnosis & Treatment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provisional Diagnosis
                </label>
                <input
                  type="text"
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                  placeholder="Initial diagnosis..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Diagnosis
                </label>
                <input
                  type="text"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  placeholder="Confirmed diagnosis..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                  disabled={!startTime}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment Plan
                </label>
                <textarea
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Treatment plan and instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 h-32"
                  disabled={!startTime}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
