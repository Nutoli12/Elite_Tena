import React from 'react';
import { Activity, Heart, Wind, Thermometer } from 'lucide-react';

interface PhysicalExamPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const PhysicalExamPhase: React.FC<PhysicalExamPhaseProps> = ({ data, onUpdate }) => {
  const updateVitalSign = (key: string, value: string) => {
    onUpdate('vitalSigns', { ...data.vitalSigns, [key]: value });
  };

  const updateExamFinding = (system: string, value: string) => {
    onUpdate('physicalExamDetailed', { ...data.physicalExamDetailed, [system]: value });
  };

  const calculateBMI = () => {
    const weight = parseFloat(data.vitalSigns?.weight);
    const height = parseFloat(data.vitalSigns?.height) / 100; // cm to m
    if (weight && height) {
      const bmi = (weight / (height * height)).toFixed(1);
      updateVitalSign('bmi', bmi);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vital Signs */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-medical-600" />
          Vital Signs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</label>
            <input
              type="text"
              value={data.vitalSigns?.bloodPressure || ''}
              onChange={(e) => updateVitalSign('bloodPressure', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="120/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm)</label>
            <input
              type="text"
              value={data.vitalSigns?.pulse || ''}
              onChange={(e) => updateVitalSign('pulse', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="72"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
            <input
              type="text"
              value={data.vitalSigns?.temperature || ''}
              onChange={(e) => updateVitalSign('temperature', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="36.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SpO2 (%)</label>
            <input
              type="text"
              value={data.vitalSigns?.oxygenSaturation || ''}
              onChange={(e) => updateVitalSign('oxygenSaturation', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="98"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
            <input
              type="text"
              value={data.vitalSigns?.weight || ''}
              onChange={(e) => updateVitalSign('weight', e.target.value)}
              onBlur={calculateBMI}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
            <input
              type="text"
              value={data.vitalSigns?.height || ''}
              onChange={(e) => updateVitalSign('height', e.target.value)}
              onBlur={calculateBMI}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">BMI</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 font-semibold">
              {data.vitalSigns?.bmi || 'Auto-calc'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resp. Rate</label>
            <input
              type="text"
              value={data.vitalSigns?.respiratoryRate || ''}
              onChange={(e) => updateVitalSign('respiratoryRate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="16"
            />
          </div>
        </div>
      </div>

      {/* Systematic Examination */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Systematic Examination</h2>
        <div className="space-y-4">
          {[
            { system: 'cardiovascular', label: 'Cardiovascular', placeholder: 'Heart: Regular rhythm, S1 S2 normal, No murmurs...' },
            { system: 'respiratory', label: 'Respiratory', placeholder: 'Lungs: Clear to auscultation bilaterally...' },
            { system: 'abdomen', label: 'Abdomen', placeholder: 'Soft, non-tender, non-distended...' },
            { system: 'neurological', label: 'Neurological', placeholder: 'Alert and oriented x3, Cranial nerves intact...' },
            { system: 'musculoskeletal', label: 'Musculoskeletal', placeholder: 'Full range of motion, No deformities...' },
            { system: 'skin', label: 'Skin', placeholder: 'No rashes, lesions, or abnormalities...' }
          ].map((exam) => (
            <div key={exam.system}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{exam.label}</label>
              <textarea
                value={data.physicalExamDetailed?.[exam.system] || ''}
                onChange={(e) => updateExamFinding(exam.system, e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder={exam.placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
