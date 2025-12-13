import React from 'react';
import { Calendar } from 'lucide-react';

interface FollowUpEducationPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const FollowUpEducationPhase: React.FC<FollowUpEducationPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-medical-600" />
          Follow-up & Education
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Education</label>
            <textarea
              value={data.patientEducation?.join('\n') || ''}
              onChange={(e) => onUpdate('patientEducation', e.target.value.split('\n').filter(Boolean))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={4}
              placeholder="Patient education points (one per line)..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};