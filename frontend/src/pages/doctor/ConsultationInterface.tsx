import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Clock, User, Activity, CheckCircle, Pill, TestTube, AlertCircle, ArrowLeft,
  Clipboard, Brain, Calendar, FileCheck, ChevronRight, Stethoscope
} from 'lucide-react';
import axios from '../../lib/axios';

// Tabs configuration
const TABS = [
  { id: 'vitals', label: 'Vitals & Info', icon: Activity },
  { id: 'history', label: 'History', icon: Clipboard },
  { id: 'exam', label: 'Examination', icon: User },
  { id: 'tests', label: 'Tests', icon: TestTube },
  { id: 'diagnosis', label: 'Diagnosis', icon: Brain },
  { id: 'treatment', label: 'Treatment', icon: Pill },
  { id: 'admission', label: 'Admission', icon: Stethoscope },
  { id: 'followup', label: 'Follow-up', icon: Calendar },
  { id: 'finalize', label: 'Finalize', icon: FileCheck },
];

export const ConsultationInterface: React.FC = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState('vitals');

  // Comprehensive Consultation State
  const [formData, setFormData] = useState({
    // Vitals
    vitalSigns: { bp: '', pulse: '', temp: '', rr: '', spo2: '', weight: '', height: '', bmi: '' },

    // History
    chiefComplaint: '',
    hpi: { onset: '', location: '', duration: '', character: '', aggravating: '', relieving: '', severity: '', associated: '' },
    reviewOfSystems: { constitutional: '', cardiovascular: '', respiratory: '', gastrointestinal: '', gu: '', neuro: '', skin: '', msk: '' },
    pastMedicalHistory: { conditions: [], surgeries: [], hospitalizations: [], immunizations: [], familyHistory: '' },

    // Exam
    examFindings: { general: '', cardiovascular: '', respiratory: '', abdomen: '', neuro: '', msk: '', skin: '', heent: '' },

    // Tests
    testsOrdered: [] as any[], // { name, type, status, result, date }

    // Diagnosis
    diagnosis: { primary: '', secondary: [], differential: '', clinicalImpression: '', icd10Codes: [] },

    // Treatment
    treatment: { immediate: '', prescriptions: [] as any[], procedures: [] },

    // Admission
    admission: { required: false, unit: '', bed: '', priority: '', instructions: '' },

    // Follow-up
    followUp: { date: '', location: '', instructions: '', education: [] as string[] },

    // Finalize
    finalNotes: '',
    disposition: ''
  });

  useEffect(() => {
    fetchConsultationDetails();
  }, [appointmentId]);

  // Timer
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

  // Auto-save
  useEffect(() => {
    if (startTime) {
      const timer = setTimeout(() => autoSave(), 3000);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  const fetchConsultationDetails = async () => {
    try {
      const response = await axios.get(`/consultations/${appointmentId}`);
      if (response.data.success) {
        const apt = response.data.data.appointment;
        setAppointment(apt);

        if (apt.consultationStartedAt) {
          setStartTime(new Date(apt.consultationStartedAt));
          // Load existing data if available (mapping would go here)
          // For now, we assume fresh start or basic mapping
          if (apt.consultationNotes) setFormData(prev => ({ ...prev, finalNotes: apt.consultationNotes }));
          if (apt.consultationDetails) {
            // Merge saved details if they exist
            setFormData(prev => ({ ...prev, ...apt.consultationDetails }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch details:', error);
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
      }
    } catch (error) {
      alert('Failed to start consultation');
    }
  };

  const autoSave = async () => {
    if (!startTime) return;
    setSaving(true);
    try {
      // We'll use a generic update endpoint that handles the JSON blob
      await axios.put(`/consultations/${appointmentId}/comprehensive`, formData);
    } catch (error) {
      console.error('Auto-save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to finalize and sign this record?')) return;

    try {
      const response = await axios.post(`/consultations/${appointmentId}/finalize`, {
        doctorWalletAddress: user?.walletAddress,
        ...formData
      });

      if (response.data.success) {
        alert('Consultation completed successfully!');
        navigate('/appointments');
      }
    } catch (error) {
      alert('Failed to complete consultation');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateField = (section: keyof typeof formData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section] as any,
        [field]: value
      }
    }));
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!appointment) return <div className="p-12 text-center">Appointment not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/appointments')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {appointment.patientDetails?.user?.profileData?.fullName || 'Patient'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{appointment.patientDetails?.user?.profileData?.gender || 'Unknown'}</span>
                <span>•</span>
                <span>{appointment.patientDetails?.user?.profileData?.age || 'Age N/A'}</span>
                <span>•</span>
                <span>{appointment.patientDetails?.bloodType || 'Blood Type N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {startTime && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-mono font-medium">
                <Clock className="w-4 h-4" />
                {formatTime(elapsedTime)}
              </div>
            )}
            {saving && <span className="text-sm text-gray-400 animate-pulse">Saving...</span>}

            {!startTime ? (
              <button
                onClick={handleStartConsultation}
                className="bg-medical-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-medical-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Start Consultation
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Finalize & Sign
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive
                    ? 'bg-medical-50 text-medical-700 border-r-4 border-medical-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-medical-600' : 'text-gray-400'}`} />
                  {tab.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-8 min-h-[600px]">
          {!startTime && (
            <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Consultation Not Started</h3>
                <p className="text-gray-500 mb-4">Click "Start Consultation" to begin documenting.</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Vital Signs & Patient Info</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.bp}
                    onChange={e => updateField('vitalSigns', 'bp', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.pulse}
                    onChange={e => updateField('vitalSigns', 'pulse', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.temp}
                    onChange={e => updateField('vitalSigns', 'temp', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="36.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SpO2 (%)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.spo2}
                    onChange={e => updateField('vitalSigns', 'spo2', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="98"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.weight}
                    onChange={e => updateField('vitalSigns', 'weight', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="text"
                    value={formData.vitalSigns.height}
                    onChange={e => updateField('vitalSigns', 'height', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="175"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">History Taking</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                <textarea
                  value={formData.chiefComplaint}
                  onChange={e => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full p-2 border rounded-lg h-24"
                  placeholder="Patient's main reason for visit..."
                />
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">History of Present Illness (HPI)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Onset"
                    value={formData.hpi.onset}
                    onChange={e => updateField('hpi', 'onset', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Location"
                    value={formData.hpi.location}
                    onChange={e => updateField('hpi', 'location', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Duration"
                    value={formData.hpi.duration}
                    onChange={e => updateField('hpi', 'duration', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Character"
                    value={formData.hpi.character}
                    onChange={e => updateField('hpi', 'character', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Severity (1-10)"
                    value={formData.hpi.severity}
                    onChange={e => updateField('hpi', 'severity', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Aggravating Factors"
                    value={formData.hpi.aggravating}
                    onChange={e => updateField('hpi', 'aggravating', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Review of Systems</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.reviewOfSystems).map(sys => (
                    <div key={sys}>
                      <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{sys}</label>
                      <input
                        value={(formData.reviewOfSystems as any)[sys]}
                        onChange={e => updateField('reviewOfSystems', sys, e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        placeholder="Normal"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exam' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Physical Examination</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.keys(formData.examFindings).map(sys => (
                  <div key={sys}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{sys}</label>
                    <textarea
                      value={(formData.examFindings as any)[sys]}
                      onChange={e => updateField('examFindings', sys, e.target.value)}
                      className="w-full p-2 border rounded-lg h-20"
                      placeholder={`Enter ${sys} findings...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Diagnostic Tests</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-center border border-dashed border-gray-300">
                <p className="text-gray-500">Test ordering and results integration coming soon.</p>
                <button className="mt-2 text-medical-600 font-medium hover:underline">
                  + Add Manual Test Result
                </button>
              </div>
            </div>
          )}

          {activeTab === 'diagnosis' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Diagnosis</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Diagnosis (ICD-10)</label>
                <input
                  value={formData.diagnosis.primary}
                  onChange={e => updateField('diagnosis', 'primary', e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Search ICD-10 codes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Impression</label>
                <textarea
                  value={formData.diagnosis.clinicalImpression}
                  onChange={e => updateField('diagnosis', 'clinicalImpression', e.target.value)}
                  className="w-full p-2 border rounded-lg h-32"
                  placeholder="Summary of clinical findings..."
                />
              </div>
            </div>
          )}

          {activeTab === 'treatment' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Treatment Plan</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Immediate Management</label>
                <textarea
                  value={formData.treatment.immediate}
                  onChange={e => updateField('treatment', 'immediate', e.target.value)}
                  className="w-full p-2 border rounded-lg h-24"
                  placeholder="Steps taken immediately..."
                />
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Prescriptions</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-center border border-dashed border-gray-300">
                  <p className="text-gray-500">e-Prescribing module integration.</p>
                  <button className="mt-2 text-medical-600 font-medium hover:underline">
                    + Add Medication
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admission' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Admission & Referral</h2>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={formData.admission.required}
                  onChange={e => updateField('admission', 'required', e.target.checked)}
                  className="w-4 h-4 text-medical-600"
                />
                <label className="text-sm font-medium text-gray-700">Admission Required</label>
              </div>

              {formData.admission.required && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Unit/Ward"
                    value={formData.admission.unit}
                    onChange={e => updateField('admission', 'unit', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    placeholder="Priority"
                    value={formData.admission.priority}
                    onChange={e => updateField('admission', 'priority', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'followup' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Follow-up Plan</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={formData.followUp.instructions}
                  onChange={e => updateField('followUp', 'instructions', e.target.value)}
                  className="w-full p-2 border rounded-lg h-32"
                  placeholder="Patient instructions..."
                />
              </div>
            </div>
          )}

          {activeTab === 'finalize' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Finalize & Sign</h2>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2">Review Summary</h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Please review all sections before finalizing. Once signed, the record will be locked and stored on the blockchain.
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Diagnosis:</strong> {formData.diagnosis.primary || 'Not set'}</p>
                  <p><strong>Treatment:</strong> {formData.treatment.immediate ? 'Documented' : 'Not documented'}</p>
                  <p><strong>Vitals:</strong> {formData.vitalSigns.bp ? 'Recorded' : 'Missing'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Notes / Disposition</label>
                <textarea
                  value={formData.finalNotes}
                  onChange={e => setFormData(prev => ({ ...prev, finalNotes: e.target.value }))}
                  className="w-full p-2 border rounded-lg h-32"
                  placeholder="Final summary..."
                />
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Sign & Finalize Record
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
