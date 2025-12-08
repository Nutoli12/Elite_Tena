import React from 'react';
import { TestTube, Plus, X, Upload } from 'lucide-react';

interface DiagnosticTestsPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const DiagnosticTestsPhase: React.FC<DiagnosticTestsPhaseProps> = ({ data, onUpdate }) => {
  const addTest = () => {
    const test = prompt('Enter test name:');
    const result = prompt('Enter result:');
    const normalRange = prompt('Enter normal range (optional):');
    
    if (test && result) {
      const tests = data.testResults || [];
      onUpdate('testResults', [...tests, { test, result, normalRange, date: new Date().toISOString() }]);
    }
  };

  const removeTest = (index: number) => {
    const tests = data.testResults || [];
    onUpdate('testResults', tests.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-medical-600" />
          Diagnostic Test Results
        </h2>

        {/* Test Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Test</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Result</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Normal Range</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(data.testResults || []).map((test: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900">{test.test}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{test.result}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{test.normalRange || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                      ✓
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeTest(index)}
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
          onClick={addTest}
          className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-medical-500 hover:text-medical-600 w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Test Result
        </button>
      </div>

      {/* Imaging Results */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Imaging Results</h2>
        <div className="space-y-3">
          {(data.imagingResults || []).map((imaging: any, index: number) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{imaging.type}</div>
                  <div className="text-sm text-gray-600 mt-1">{imaging.findings}</div>
                </div>
                <button
                  onClick={() => {
                    const results = data.imagingResults || [];
                    onUpdate('imagingResults', results.filter((_: any, i: number) => i !== index));
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              const type = prompt('Enter imaging type (e.g., X-Ray, CT, MRI):');
              const findings = prompt('Enter findings:');
              if (type && findings) {
                const results = data.imagingResults || [];
                onUpdate('imagingResults', [...results, { type, findings, date: new Date().toISOString() }]);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-medical-500 hover:text-medical-600 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Imaging Result
          </button>
        </div>
      </div>

      {/* Lab Interpretation */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Clinical Interpretation</h2>
        <textarea
          value={data.labInterpretation || ''}
          onChange={(e) => onUpdate('labInterpretation', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Interpret the test results and imaging findings..."
        />
      </div>
    </div>
  );
};
