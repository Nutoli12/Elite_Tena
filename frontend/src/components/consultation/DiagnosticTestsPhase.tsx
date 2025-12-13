import React from 'react';
import { TestTube } from 'lucide-react';

interface DiagnosticTestsPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const DiagnosticTestsPhase: React.FC<DiagnosticTestsPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TestTube className="w-6 h-6 text-medical-600" />
          Diagnostic Tests
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lab Interpretation</label>
            <textarea
              value={data.labInterpretation || ''}
              onChange={(e) => onUpdate('labInterpretation', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={4}
              placeholder="Interpretation of laboratory results..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};