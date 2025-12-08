import React from 'react';
import { Pill, Plus, X } from 'lucide-react';

interface TreatmentPlanPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const TreatmentPlanPhase: React.FC<TreatmentPlanPhaseProps> = ({ data, onUpdate }) => {
  const addMedication = () => {
    const name = prompt('Medication name:');
    const dose = prompt('Dose:');
    const frequency = prompt('Frequency:');
    const duration = prompt('Duration:');
    
    if (name && dose && frequency) {
      const meds = data.prescriptionsIssued || [];
      onUpdate('prescriptionsIssued', [...meds, { name, dose, frequency, duration, date: new Date().toISOString() }]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Immediate Management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Pill className="w-5 h-5 text-medical-600" />
          Immediate Management
        </h2>
        <textarea
          value={(data.immediateManagement || []).join('\n')}
          onChange={(e) => onUpdate('immediateManagement', e.target.value.split('\n').filter(Boolean))}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter immediate management steps (one per line)&#10;1. Admit to CCU&#10;2. Start dual antiplatelet therapy&#10;3. Anticoagulation as per protocol"
        />
      </div>

      {/* Prescriptions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Prescriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Medication</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dose</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(data.prescriptionsIssued || []).map((med: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{med.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{med.dose}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{med.frequency}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{med.duration}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        const meds = data.prescriptionsIssued || [];
                        onUpdate('prescriptionsIssued', meds.filter((_: any, i: number) => i !== index));
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addMedication}
          className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-medical-500 hover:text-medical-600 w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      </div>

      {/* Procedures Planned */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Procedures Planned</h2>
        <textarea
          value={(data.proceduresPlanned || []).join('\n')}
          onChange={(e) => onUpdate('proceduresPlanned', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter planned procedures (one per line)&#10;• Coronary angiography within 24 hours&#10;• Possible PCI"
        />
      </div>

      {/* Treatment Plan Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Treatment Plan Summary</h2>
        <textarea
          value={data.treatmentPlan || ''}
          onChange={(e) => onUpdate('treatmentPlan', e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Comprehensive treatment plan including medications, procedures, lifestyle modifications, and follow-up..."
        />
      </div>
    </div>
  );
};
