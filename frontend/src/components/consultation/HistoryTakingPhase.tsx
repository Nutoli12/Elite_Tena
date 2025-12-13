import React from 'react';
import { BookOpen } from 'lucide-react';

interface HistoryTakingPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const HistoryTakingPhase: React.FC<HistoryTakingPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-medical-600" />
          History Taking
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
            <textarea
              value={data.chiefComplaint || ''}
              onChange={(e) => onUpdate('chiefComplaint', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={3}
              placeholder="What brings the patient in today?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">History of Present Illness</label>
            <textarea
              value={data.historyPresentIllness || ''}
              onChange={(e) => onUpdate('historyPresentIllness', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              rows={5}
              placeholder="Detailed description of the current illness..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};