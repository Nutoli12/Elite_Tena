import React from 'react';
import { Activity } from 'lucide-react';

interface PhysicalExamPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const PhysicalExamPhase: React.FC<PhysicalExamPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-medical-600" />
          Physical Examination
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</label>
            <input
              type="text"
              value={data.vitalSigns?.bloodPressure || ''}
              onChange={(e) => onUpdate('vitalSigns', { ...data.vitalSigns, bloodPressure: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              placeholder="120/80 mmHg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pulse</label>
            <input
              type="text"
              value={data.vitalSigns?.pulse || ''}
              onChange={(e) => onUpdate('vitalSigns', { ...data.vitalSigns, pulse: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              placeholder="72 bpm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
            <input
              type="text"
              value={data.vitalSigns?.temperature || ''}
              onChange={(e) => onUpdate('vitalSigns', { ...data.vitalSigns, temperature: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              placeholder="36.5°C"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Oxygen Saturation</label>
            <input
              type="text"
              value={data.vitalSigns?.oxygenSaturation || ''}
              onChange={(e) => onUpdate('vitalSigns', { ...data.vitalSigns, oxygenSaturation: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              placeholder="98%"
            />
          </div>
        </div>
      </div>
    </div>
  );
};