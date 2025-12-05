import React from 'react';
import { Award, FileText, CheckCircle, Clock } from 'lucide-react';

interface FinalDocumentationPhaseProps {
  data: any;
  appointment: any;
  elapsedTime: number;
  onUpdate: (field: string, value: any) => void;
}

export const FinalDocumentationPhase: React.FC<FinalDocumentationPhaseProps> = ({ 
  data, 
  appointment, 
  elapsedTime,
  onUpdate 
}) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const generateSummary = () => {
    const patientName = appointment.patientDetails?.user?.profileData?.fullName || 'Patient';
    const age = appointment.patientDetails?.user?.profileData?.age || 'N/A';
    const gender = appointment.patientDetails?.user?.profileData?.gender || 'N/A';
    
    const summary = `${age}${gender.charAt(0).toUpperCase()} ${patientName} presents with ${data.chiefComplaint || 'chief complaint'}. 

Diagnosis: ${data.primaryDiagnosis?.description || 'Not specified'}

Treatment Plan: ${data.treatmentPlan || 'See detailed treatment plan'}

${data.admissionRequired ? `Patient admitted to ${data.admissionDetails?.unit || 'hospital'}.` : 'Patient discharged home.'}

Follow-up: ${data.followUpSchedule?.postDischarge || 'As needed'}`;

    onUpdate('assessmentSummary', summary);
  };

  return (
    <div className="space-y-6">
      {/* Consultation Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-medical-600" />
            Final Documentation & Sign-off
          </h2>
          <button
            onClick={generateSummary}
            className="px-4 py-2 bg-medical-100 text-medical-700 rounded-lg hover:bg-medical-200 text-sm font-medium"
          >
            Auto-Generate Summary
          </button>
        </div>

        {/* Consultation Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Duration</div>
            <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Diagnosis Codes</div>
            <div className="text-lg font-semibold text-gray-900">
              {(data.icd10Codes || []).length} ICD-10
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Prescriptions</div>
            <div className="text-lg font-semibold text-gray-900">
              {(data.prescriptionsIssued || []).length} Medications
            </div>
          </div>
        </div>

        {/* Assessment Summary */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assessment & Plan Summary</label>
          <textarea
            value={data.assessmentSummary || ''}
            onChange={(e) => onUpdate('assessmentSummary', e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
            placeholder="Comprehensive summary of assessment and plan..."
          />
        </div>

        {/* Disposition */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Disposition</label>
          <select
            value={data.disposition || ''}
            onChange={(e) => onUpdate('disposition', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          >
            <option value="">Select disposition...</option>
            <option value="admitted">Admitted to Hospital</option>
            <option value="discharged_home">Discharged Home</option>
            <option value="transferred">Transferred to Another Facility</option>
            <option value="observation">Observation Unit</option>
            <option value="left_ama">Left Against Medical Advice</option>
          </select>
        </div>

        {/* Prognosis */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Prognosis</label>
          <textarea
            value={data.prognosis || ''}
            onChange={(e) => onUpdate('prognosis', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
            placeholder="Short-term and long-term prognosis..."
          />
        </div>

        {/* Additional Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
          <textarea
            value={data.additionalNotes || ''}
            onChange={(e) => onUpdate('additionalNotes', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
            placeholder="Any additional notes or observations..."
          />
        </div>
      </div>

      {/* Digital Signature */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Digital Signature</h2>
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            By completing this consultation, you are digitally signing this medical record.
          </p>
          <div className="text-sm text-gray-500">
            <p>Doctor: {appointment.doctorDetails?.user?.profileData?.fullName || 'N/A'}</p>
            <p>License: {appointment.doctorDetails?.licenseNumber || 'N/A'}</p>
            <p>Date: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Completion Checklist */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Checklist</h2>
        <div className="space-y-3">
          {[
            { label: 'Chief complaint documented', check: !!data.chiefComplaint },
            { label: 'Physical examination completed', check: Object.keys(data.physicalExamDetailed || {}).length > 0 },
            { label: 'Primary diagnosis assigned', check: !!data.primaryDiagnosis?.code },
            { label: 'Treatment plan documented', check: !!data.treatmentPlan },
            { label: 'Follow-up scheduled', check: Object.keys(data.followUpSchedule || {}).length > 0 },
            { label: 'Assessment summary written', check: !!data.assessmentSummary }
          ].map((item, index) => (
            <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${item.check ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <CheckCircle className={`w-5 h-5 ${item.check ? 'text-green-600' : 'text-yellow-600'}`} />
              <span className={`${item.check ? 'text-green-900' : 'text-yellow-900'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <p className="text-red-800 font-medium">
          ⚠️ Once you click "Complete & Sign", this consultation will be finalized and locked. 
          A complete medical record will be created and distributed to relevant parties.
        </p>
      </div>
    </div>
  );
};
