import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, ArrowLeft, ArrowRight, Save, CheckCircle, AlertCircle,
  User, Heart, Activity, TestTube,
  Pill, Calendar, BookOpen, Award, Shield
} from 'lucide-react';
import axios from '../../lib/axios';

// Import phase components
import { PatientInfoPhase } from '../../components/consultation/PatientInfoPhase.tsx';
import { HistoryTakingPhase } from '../../components/consultation/HistoryTakingPhase.tsx';
import { PhysicalExamPhase } from '../../components/consultation/PhysicalExamPhase.tsx';
import { DiagnosticTestsPhase } from '../../components/consultation/DiagnosticTestsPhase.tsx';
import { DiagnosisPhase } from '../../components/consultation/DiagnosisPhase.tsx';
import { TreatmentPlanPhase } from '../../components/consultation/TreatmentPlanPhase.tsx';
import { AdmissionReferralPhase } from '../../components/consultation/AdmissionReferralPhase.tsx';
import { FollowUpEducationPhase } from '../../components/consultation/FollowUpEducationPhase.tsx';
import { FinalDocumentationPhase } from '../../components/consultation/FinalDocumentationPhase.tsx';

const PHASES = [
  { id: 'patient_info', name: 'Patient Info', icon: User },
  { id: 'history', name: 'History', icon: BookOpen },
  { id: 'examination', name: 'Examination', icon: Activity },
  { id: 'tests', name: 'Tests', icon: TestTube },
  { id: 'diagnosis', name: 'Diagnosis', icon: Heart },
  { id: 'treatment', name: 'Treatment', icon: Pill },
  { id: 'admission', name: 'Admission', icon: Shield },
  { id: 'follow_up', name: 'Follow-up', icon: Calendar },
  { id: 'finalize', name: 'Finalize', icon: Award }
];

export const ComprehensiveConsultation: React.FC = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPhase, setCurrentPhase] = useState(0);
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Consultation data state
  const [consultationData, setConsultationData] = useState({
    // Patient Info
    patientInfo: {},
    
    // History
    chiefComplaint: '',
    historyPresentIllness: '',
    pastMedicalHistory: [],
    surgeries: [],
    hospitalizations: [],
    immunizations: [],
    familyHistory: {},
    allergies: [],
    currentMedications: [],
    reviewOfSystems: {},
    
    // Physical Exam
    vitalSigns: {
      bloodPressure: '',
      pulse: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      bmi: ''
    },
    physicalExamDetailed: {},
    
    // Tests
    testResults: [],
    imagingResults: [],
    labInterpretation: '',
    
    // Diagnosis
    primaryDiagnosis: {},
    secondaryDiagnoses: [],
    differentialDiagnoses: [],
    clinicalImpression: '',
    icd10Codes: [],
    
    // Treatment
    immediateManagement: [],
    proceduresPlanned: [],
    prescriptionsIssued: [],
    treatmentPlan: '',
    
    // Admission
    admissionRequired: false,
    admissionDetails: {},
    consultationsRequested: [],
    dietaryOrders: [],
    activityOrders: '',
    
    // Follow-up
    followUpSchedule: {},
    patientEducation: [],
    educationMaterialsProvided: [],
    
    // Final
    assessmentSummary: '',
    disposition: '',
    prognosis: '',
    additionalNotes: '',
    digitalSignature: ''
  });

  useEffect(() => {
    fetchConsultationDetails();
  }, [appointmentId]);

  // Timer effect
  useEffect(() => {
    if (startTime && !isCompleted) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, isCompleted]);

  // Auto-save effect
  useEffect(() => {
    if (startTime) {
      const autoSaveTimer = setTimeout(() => {
        autoSaveConsultation();
      }, 5000); // Auto-save every 5 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [consultationData, startTime]);

  const fetchConsultationDetails = async () => {
    try {
      const response = await axios.get(`/consultations/${appointmentId}`);
      
      if (response.data.success) {
        const apt = response.data.data.appointment;
        setAppointment(apt);

        // Load existing data
        if (apt.consultationStartedAt) {
          setStartTime(new Date(apt.consultationStartedAt));
          
          // Check if consultation is already completed
          if (apt.status === 'completed' || apt.consultationEndedAt) {
            setIsCompleted(true);
            // Calculate final elapsed time
            const start = new Date(apt.consultationStartedAt);
            const end = apt.consultationEndedAt ? new Date(apt.consultationEndedAt) : new Date();
            const elapsed = Math.floor((end.getTime() - start.getTime()) / 1000);
            setElapsedTime(elapsed);
          }
          
          // Load all saved data
          setConsultationData({
            patientInfo: apt.patientDetails || {},
            chiefComplaint: apt.chiefComplaint || '',
            historyPresentIllness: apt.historyPresentIllness || '',
            pastMedicalHistory: apt.past_medical_history || [],
            surgeries: apt.surgeries || [],
            hospitalizations: apt.hospitalizations || [],
            immunizations: apt.immunizations || [],
            familyHistory: apt.family_history || {},
            allergies: apt.allergies || [],
            currentMedications: apt.current_medications || [],
            reviewOfSystems: apt.review_of_systems || {},
            vitalSigns: apt.vitalSigns || {},
            physicalExamDetailed: apt.physical_exam_detailed || {},
            testResults: apt.test_results || [],
            imagingResults: apt.imaging_results || [],
            labInterpretation: apt.lab_interpretation || '',
            primaryDiagnosis: apt.primary_diagnosis || {},
            secondaryDiagnoses: apt.secondary_diagnoses || [],
            differentialDiagnoses: apt.differential_diagnoses || [],
            clinicalImpression: apt.clinical_impression || '',
            icd10Codes: apt.icd10_codes || [],
            immediateManagement: apt.immediate_management || [],
            proceduresPlanned: apt.procedures_planned || [],
            prescriptionsIssued: apt.prescriptions_issued || [],
            treatmentPlan: apt.treatmentPlan || '',
            admissionRequired: apt.admission_required || false,
            admissionDetails: apt.admission_details || {},
            consultationsRequested: apt.consultations_requested || [],
            dietaryOrders: apt.dietary_orders || [],
            activityOrders: apt.activity_orders || '',
            followUpSchedule: apt.follow_up_schedule || {},
            patientEducation: apt.patient_education || [],
            educationMaterialsProvided: apt.education_materials_provided || [],
            assessmentSummary: apt.assessment_summary || '',
            disposition: apt.disposition || '',
            prognosis: apt.prognosis || '',
            additionalNotes: apt.additional_notes || '',
            digitalSignature: apt.digital_signature || ''
          });

          // Set phase based on saved progress
          const phaseMap: any = {
            'not_started': 0,
            'history': 1,
            'examination': 2,
            'tests': 3,
            'diagnosis': 4,
            'treatment': 5,
            'admission': 6,
            'follow_up': 7,
            'completed': 8
          };
          setCurrentPhase(phaseMap[apt.consultation_phase] || 0);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch consultation:', error);
      alert('Failed to load consultation details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    try {
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

  const autoSaveConsultation = useCallback(async () => {
    if (!startTime) return;

    try {
      setSaving(true);

      await axios.put(`/consultations/${appointmentId}/comprehensive`, {
        ...consultationData,
        consultationPhase: PHASES[currentPhase].id
      });

      console.log('💾 Auto-saved');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [appointmentId, consultationData, currentPhase, startTime]);

  const updateConsultationData = (field: string, value: any) => {
    setConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentPhase < PHASES.length - 1) {
      setCurrentPhase(prev => prev + 1);
      autoSaveConsultation();
    }
  };

  const handlePrevious = () => {
    if (currentPhase > 0) {
      setCurrentPhase(prev => prev - 1);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!window.confirm('Are you sure you want to finalize this consultation? This action cannot be undone.')) {
      return;
    }

    try {
      // Stop the timer
      setIsCompleted(true);

      const response = await axios.post(`/consultations/${appointmentId}/finalize`, {
        ...consultationData,
        consultationDuration: elapsedTime,
        signedAt: new Date().toISOString()
      });

      if (response.data.success) {
        alert('Consultation completed and medical record created successfully!');
        navigate('/appointments');
      }
    } catch (error: any) {
      console.error('❌ Failed to complete consultation:', error);
      alert(error.response?.data?.message || 'Failed to complete consultation');
      // Restart timer if completion failed
      setIsCompleted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          <button onClick={() => navigate('/appointments')} className="healthcare-button">
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  const patientName = appointment.patientDetails?.user?.profileData?.fullName || 
                      appointment.patientWalletAddress?.substring(0, 10) + '...';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/appointments')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  🩺 Comprehensive Consultation
                </h1>
                <p className="text-sm text-gray-600">Patient: {patientName}</p>
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

              {/* Start button */}
              {!startTime && (
                <button
                  onClick={handleStartConsultation}
                  className="healthcare-button flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Start Consultation
                </button>
              )}
            </div>
          </div>

          {/* Phase Progress */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {PHASES.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = index === currentPhase;
              const isCompleted = index < currentPhase;
              
              return (
                <button
                  key={phase.id}
                  onClick={() => startTime && setCurrentPhase(index)}
                  disabled={!startTime}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-medical-500 text-white'
                      : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  } ${startTime ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{phase.name}</span>
                  {isCompleted && <CheckCircle className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentPhase === 0 && (
              <PatientInfoPhase
                data={consultationData}
                appointment={appointment}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 1 && (
              <HistoryTakingPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 2 && (
              <PhysicalExamPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 3 && (
              <DiagnosticTestsPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 4 && (
              <DiagnosisPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 5 && (
              <TreatmentPlanPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 6 && (
              <AdmissionReferralPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 7 && (
              <FollowUpEducationPhase
                data={consultationData}
                onUpdate={updateConsultationData}
              />
            )}
            {currentPhase === 8 && (
              <FinalDocumentationPhase
                data={consultationData}
                appointment={appointment}
                elapsedTime={elapsedTime}
                onUpdate={updateConsultationData}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {startTime && (
          <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
            <button
              onClick={handlePrevious}
              disabled={currentPhase === 0}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="text-sm text-gray-600">
              Phase {currentPhase + 1} of {PHASES.length}
            </div>

            {currentPhase < PHASES.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 healthcare-button"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleCompleteConsultation}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5" />
                Complete & Sign
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
