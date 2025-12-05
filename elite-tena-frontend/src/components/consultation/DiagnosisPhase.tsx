import React, { useState } from 'react';
import { Heart, Plus, X, Search } from 'lucide-react';

// Common ICD-10 codes for quick selection
const COMMON_ICD10 = [
  { code: 'I20.0', description: 'Unstable angina' },
  { code: 'I10', description: 'Essential hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus' },
  { code: 'J18.9', description: 'Pneumonia, unspecified' },
  { code: 'K21.9', description: 'Gastro-esophageal reflux disease' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'J44.9', description: 'COPD, unspecified' },
  { code: 'N39.0', description: 'Urinary tract infection' }
];

interface DiagnosisPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const DiagnosisPhase: React.FC<DiagnosisPhaseProps> = ({ data, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const addDiagnosis = (code: string, description: string, isPrimary: boolean = false) => {
    const diagnosis = { code, description, date: new Date().toISOString() };
    
    if (isPrimary) {
      onUpdate('primaryDiagnosis', diagnosis);
    } else {
      const current = data.secondaryDiagnoses || [];
      onUpdate('secondaryDiagnoses', [...current, diagnosis]);
    }

    // Add to ICD-10 codes list
    const codes = data.icd10Codes || [];
    if (!codes.find((c: any) => c.code === code)) {
      onUpdate('icd10Codes', [...codes, { code, description }]);
    }
  };

  const filteredCodes = COMMON_ICD10.filter(icd =>
    icd.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    icd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Primary Diagnosis */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-medical-600" />
          Primary Diagnosis
        </h2>
        
        {data.primaryDiagnosis?.code ? (
          <div className="p-4 bg-medical-50 border-l-4 border-medical-500 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-medical-900">{data.primaryDiagnosis.code}</div>
                <div className="text-medical-700 mt-1">{data.primaryDiagnosis.description}</div>
              </div>
              <button
                onClick={() => onUpdate('primaryDiagnosis', {})}
                className="p-1 hover:bg-red-100 rounded text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No primary diagnosis selected</div>
        )}
      </div>

      {/* ICD-10 Code Search */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Search ICD-10 Codes</h2>
        <div className="relative mb-4">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
            placeholder="Search by code or description..."
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredCodes.map((icd) => (
            <div
              key={icd.code}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{icd.code}</div>
                  <div className="text-sm text-gray-600">{icd.description}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addDiagnosis(icd.code, icd.description, true)}
                    className="px-3 py-1 text-xs bg-medical-500 text-white rounded hover:bg-medical-600"
                  >
                    Primary
                  </button>
                  <button
                    onClick={() => addDiagnosis(icd.code, icd.description, false)}
                    className="px-3 py-1 text-xs border border-medical-500 text-medical-600 rounded hover:bg-medical-50"
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary Diagnoses */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Secondary Diagnoses</h2>
        <div className="space-y-2">
          {(data.secondaryDiagnoses || []).map((diagnosis: any, index: number) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{diagnosis.code}</span>
                <span className="text-gray-600 ml-2">- {diagnosis.description}</span>
              </div>
              <button
                onClick={() => {
                  const current = data.secondaryDiagnoses || [];
                  onUpdate('secondaryDiagnoses', current.filter((_: any, i: number) => i !== index));
                }}
                className="p-1 hover:bg-red-100 rounded text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Differential Diagnoses */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Differential Diagnoses</h2>
        <textarea
          value={(data.differentialDiagnoses || []).join('\n')}
          onChange={(e) => onUpdate('differentialDiagnoses', e.target.value.split('\n').filter(Boolean))}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter differential diagnoses (one per line)&#10;• Acute myocardial infarction&#10;• Pulmonary embolism&#10;• Aortic dissection"
        />
      </div>

      {/* Clinical Impression */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Clinical Impression</h2>
        <textarea
          value={data.clinicalImpression || ''}
          onChange={(e) => onUpdate('clinicalImpression', e.target.value)}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Summarize your clinical impression based on history, examination, and test results..."
        />
      </div>
    </div>
  );
};
