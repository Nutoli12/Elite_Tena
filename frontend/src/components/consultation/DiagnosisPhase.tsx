import React from 'react';
import { Heart } from 'lucide-react';

interface DiagnosisPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const DiagnosisPhase: React.FC<DiagnosisPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-medical-600" />
          Diagnosis
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Impression</label>
            <textarea
              value={data.clinicalImpression || ''}
              onChange={(e) => onUpdate('clinicalImpression', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={4}
              placeholder="Clinical assessment and impression..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};