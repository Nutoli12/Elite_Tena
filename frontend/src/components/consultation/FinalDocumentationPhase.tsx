import React from 'react';
import { Award } from 'lucide-react';

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
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-medical-600" />
          Final Documentation
        </h2>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Consultation Summary</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Duration:</strong> {formatTime(elapsedTime)}</p>
              <p><strong>Patient:</strong> {appointment.patientDetails?.user?.profileData?.fullName || 'N/A'}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Summary</label>
            <textarea
              value={data.assessmentSummary || ''}
              onChange={(e) => onUpdate('assessmentSummary', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={4}
              placeholder="Final assessment and summary..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disposition</label>
            <select
              value={data.disposition || ''}
              onChange={(e) => onUpdate('disposition', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
            >
              <option value="">Select disposition...</option>
              <option value="discharged_home">Discharged Home</option>
              <option value="admitted">Admitted</option>
              <option value="referred">Referred to Specialist</option>
              <option value="follow_up">Follow-up Required</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              value={data.additionalNotes || ''}
              onChange={(e) => onUpdate('additionalNotes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={3}
              placeholder="Any additional notes or observations..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};