import React from 'react';
import { BookOpen, Plus, X } from 'lucide-react';

interface HistoryTakingPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const HistoryTakingPhase: React.FC<HistoryTakingPhaseProps> = ({ data, onUpdate }) => {
  const addItem = (field: string, item: any) => {
    const current = data[field] || [];
    onUpdate(field, [...current, item]);
  };

  const removeItem = (field: string, index: number) => {
    const current = data[field] || [];
    onUpdate(field, current.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Chief Complaint */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-medical-600" />
          Chief Complaint
        </h2>
        <textarea
          value={data.chiefComplaint}
          onChange={(e) => onUpdate('chiefComplaint', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
          placeholder="e.g., 45-year-old male presents with chest pain and shortness of breath for 2 days"
        />
      </div>

      {/* History of Present Illness */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">History of Present Illness</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Onset</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder="e.g., Sudden, while watching TV"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
                placeholder="e.g., 2 days continuous"
              />
            </div>
          </div>

          <textarea
            value={data.historyPresentIllness}
            onChange={(e) => onUpdate('historyPresentIllness', e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
            placeholder="Detailed history of present illness including: Location, Character, Aggravating factors, Relieving factors, Associated symptoms, Severity..."
          />
        </div>
      </div>

      {/* Past Medical History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Past Medical History</h2>
        <div className="space-y-3">
          {['Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Kidney Disease', 'Liver Disease'].map((condition) => (
            <label key={condition} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={(data.pastMedicalHistory || []).includes(condition)}
                onChange={(e) => {
                  if (e.target.checked) {
                    addItem('pastMedicalHistory', condition);
                  } else {
                    const index = (data.pastMedicalHistory || []).indexOf(condition);
                    if (index > -1) removeItem('pastMedicalHistory', index);
                  }
                }}
                className="w-4 h-4 text-medical-600 rounded focus:ring-medical-500"
              />
              <span className="text-gray-700">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Surgeries */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Surgical History</h2>
        <div className="space-y-3">
          {(data.surgeries || []).map((surgery: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{surgery.procedure}</div>
                <div className="text-sm text-gray-600">{surgery.year}</div>
              </div>
              <button
                onClick={() => removeItem('surgeries', index)}
                className="p-2 hover:bg-red-100 rounded-lg text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const procedure = prompt('Enter procedure name:');
              const year = prompt('Enter year:');
              if (procedure && year) {
                addItem('surgeries', { procedure, year });
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-medical-500 hover:text-medical-600 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Surgery
          </button>
        </div>
      </div>

      {/* Family History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Family History</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Father</label>
            <textarea
              value={data.familyHistory?.father || ''}
              onChange={(e) => onUpdate('familyHistory', { ...data.familyHistory, father: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., Heart attack at age 55"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mother</label>
            <textarea
              value={data.familyHistory?.mother || ''}
              onChange={(e) => onUpdate('familyHistory', { ...data.familyHistory, mother: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., Hypertension"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Siblings</label>
            <textarea
              value={data.familyHistory?.siblings || ''}
              onChange={(e) => onUpdate('familyHistory', { ...data.familyHistory, siblings: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., No significant history"
            />
          </div>
        </div>
      </div>

      {/* Review of Systems */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Review of Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { system: 'Constitutional', symptoms: ['Fever', 'Weight loss', 'Fatigue', 'Night sweats'] },
            { system: 'Cardiovascular', symptoms: ['Chest pain', 'Palpitations', 'Edema', 'Syncope'] },
            { system: 'Respiratory', symptoms: ['Shortness of breath', 'Cough', 'Wheezing', 'Hemoptysis'] },
            { system: 'Gastrointestinal', symptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Abdominal pain'] },
            { system: 'Neurological', symptoms: ['Headache', 'Dizziness', 'Weakness', 'Numbness'] },
            { system: 'Musculoskeletal', symptoms: ['Joint pain', 'Muscle pain', 'Stiffness', 'Swelling'] }
          ].map((category) => (
            <div key={category.system} className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">{category.system}</h3>
              <div className="space-y-2">
                {category.symptoms.map((symptom) => (
                  <label key={symptom} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.reviewOfSystems?.[category.system]?.includes(symptom)}
                      onChange={(e) => {
                        const current = data.reviewOfSystems || {};
                        const systemSymptoms = current[category.system] || [];
                        if (e.target.checked) {
                          onUpdate('reviewOfSystems', {
                            ...current,
                            [category.system]: [...systemSymptoms, symptom]
                          });
                        } else {
                          onUpdate('reviewOfSystems', {
                            ...current,
                            [category.system]: systemSymptoms.filter((s: string) => s !== symptom)
                          });
                        }
                      }}
                      className="w-4 h-4 text-medical-600 rounded focus:ring-medical-500"
                    />
                    <span className="text-sm text-gray-700">{symptom}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
