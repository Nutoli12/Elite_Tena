import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder } from '../../services/labWorkflowApi';
import { 
  BeakerIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LabResultUploadProps {
  selectedOrder: LabOrder;
  onResultUploaded?: (orderId: number) => void;
  onCancel?: () => void;
}

interface TestResult {
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}

const LabResultUpload: React.FC<LabResultUploadProps> = ({ 
  selectedOrder, 
  onResultUploaded, 
  onCancel 
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [testCatalog, setTestCatalog] = useState<any[]>([]);

  useEffect(() => {
    initializeTestResults();
    loadTestCatalog();
  }, [selectedOrder]);

  const loadTestCatalog = async () => {
    try {
      const response = await labWorkflowAPI.getTestDetails(selectedOrder.testCodes);
      setTestCatalog(response.data.tests || []);
    } catch (error) {
      console.error('Error loading test catalog:', error);
    }
  };
  const initializeTestResults = () => {
    const initialResults: TestResult[] = selectedOrder.testCodes.map(testCode => ({
      testCode,
      testName: getTestDisplayName(testCode),
      value: '',
      unit: getDefaultUnit(testCode),
      referenceRange: getReferenceRange(testCode),
      status: 'normal',
      notes: ''
    }));
    setTestResults(initialResults);
  };

  const getTestDisplayName = (testCode: string): string => {
    const names: Record<string, string> = {
      'CBC': 'Complete Blood Count',
      'CHEM': 'Basic Metabolic Panel',
      'LIPID': 'Lipid Profile',
      'GLUCOSE': 'Glucose Level',
      'TROPONIN': 'Troponin I Quantitative',
      'MALARIA': 'Malaria Parasite (Microscopy)',
      'URINALYSIS': 'Urinalysis Complete',
      'HBA1C': 'Hemoglobin A1c',
      'TSH': 'Thyroid Stimulating Hormone',
      'CREATININE': 'Serum Creatinine'
    };
    return names[testCode] || testCode;
  };

  const getDefaultUnit = (testCode: string): string => {
    const units: Record<string, string> = {
      'CBC': 'cells/μL',
      'GLUCOSE': 'mg/dL',
      'TROPONIN': 'ng/mL',
      'CREATININE': 'mg/dL',
      'HBA1C': '%',
      'TSH': 'mIU/L',
      'LIPID': 'mg/dL'
    };
    return units[testCode] || 'units';
  };

  const getReferenceRange = (testCode: string): string => {
    const ranges: Record<string, string> = {
      'GLUCOSE': '70-100 mg/dL',
      'TROPONIN': '<0.04 ng/mL',
      'CREATININE': '0.6-1.2 mg/dL',
      'HBA1C': '<5.7%',
      'TSH': '0.4-4.0 mIU/L',
      'CBC': 'Variable by component'
    };
    return ranges[testCode] || 'See reference guide';
  };

  const updateTestResult = (index: number, field: keyof TestResult, value: string) => {
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, [field]: value } : result
    ));
  };

  const determineResultStatus = (testCode: string, value: string): 'normal' | 'abnormal' | 'critical' => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    // Critical value thresholds
    const criticalRanges: Record<string, { low: number; high: number }> = {
      'GLUCOSE': { low: 40, high: 400 },
      'TROPONIN': { low: 0, high: 0.4 },
      'CREATININE': { low: 0, high: 5.0 }
    };

    // Normal ranges
    const normalRanges: Record<string, { low: number; high: number }> = {
      'GLUCOSE': { low: 70, high: 100 },
      'TROPONIN': { low: 0, high: 0.04 },
      'CREATININE': { low: 0.6, high: 1.2 }
    };

    if (criticalRanges[testCode]) {
      const critical = criticalRanges[testCode];
      if (numValue <= critical.low || numValue >= critical.high) {
        return 'critical';
      }
    }

    if (normalRanges[testCode]) {
      const normal = normalRanges[testCode];
      if (numValue < normal.low || numValue > normal.high) {
        return 'abnormal';
      }
    }

    return 'normal';
  };

  const handleValueChange = (index: number, value: string) => {
    const result = testResults[index];
    const status = determineResultStatus(result.testCode, value);
    
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, value, status } : result
    ));
  };

  const validateResults = (): boolean => {
    const emptyResults = testResults.filter(result => !result.value.trim());
    if (emptyResults.length > 0) {
      toast.error(`Please enter values for all tests: ${emptyResults.map(r => r.testName).join(', ')}`);
      return false;
    }

    if (!interpretation.trim()) {
      toast.error('Please provide an interpretation of the results');
      return false;
    }

    return true;
  };
  const uploadResults = async () => {
    if (!validateResults()) return;

    try {
      setUploading(true);

      // Format result data for API
      const resultData: Record<string, any> = {};
      testResults.forEach(result => {
        resultData[result.testCode] = {
          value: result.value,
          unit: result.unit,
          status: result.status,
          referenceRange: result.referenceRange,
          notes: result.notes || undefined
        };
      });

      // Check for critical values
      const criticalResults = testResults.filter(r => r.status === 'critical');
      const hasCriticalValues = criticalResults.length > 0;

      // Upload results
      const response = await labWorkflowAPI.uploadLabResult({
        labOrderId: selectedOrder.id,
        resultData,
        interpretation,
        technicianNotes,
        reportFiles: [], // Could be enhanced to handle file uploads
        rawDataFiles: []
      });

      if (response.success) {
        // Show success message with doctor notification info
        toast.success(
          `Results uploaded successfully! ${hasCriticalValues ? 'CRITICAL VALUES DETECTED - Doctor notified immediately!' : `Dr. ${selectedOrder.doctor?.firstName} ${selectedOrder.doctor?.lastName} has been notified.`}`,
          { duration: 6000 }
        );

        // Show critical value alert if needed
        if (hasCriticalValues) {
          toast.error(
            `⚠️ CRITICAL VALUES: ${criticalResults.map(r => `${r.testName}: ${r.value} ${r.unit}`).join(', ')}`,
            { duration: 10000 }
          );
        }

        onResultUploaded?.(selectedOrder.id);
      }
    } catch (error: any) {
      console.error('Error uploading results:', error);
      toast.error(error.response?.data?.message || 'Failed to upload results');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'abnormal':
        return 'text-orange-600 bg-orange-100 border-orange-300';
      default:
        return 'text-green-600 bg-green-100 border-green-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'abnormal':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <CheckCircleIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📊 Upload Lab Results
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Order & Doctor Information */}
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Order Information
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
                <p><strong>Patient:</strong> {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</p>
                <p><strong>Tests:</strong> {selectedOrder.testCodes.join(', ')}</p>
                <p><strong>Priority:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedOrder.priority === 'stat' ? 'bg-red-100 text-red-800' :
                    selectedOrder.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedOrder.priority.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🩺 Ordering Doctor
              </h3>
              <div className={`p-3 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700`}>
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-200">
                    Dr. {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📧 {selectedOrder.doctor?.email}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Results will be sent directly to this doctor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Test Results Entry */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          🧪 Test Results
        </h3>
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={result.testCode}
              className={`p-4 border-2 rounded-lg ${
                result.status === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                result.status === 'abnormal' ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                'border-green-300 bg-green-50 dark:bg-green-900/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {result.testName} ({result.testCode})
                </h4>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                  {getStatusIcon(result.status)}
                  {result.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Result Value *</label>
                  <input
                    type="text"
                    value={result.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    placeholder="Enter result..."
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={result.unit}
                    onChange={(e) => updateTestResult(index, 'unit', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference Range</label>
                  <input
                    type="text"
                    value={result.referenceRange}
                    onChange={(e) => updateTestResult(index, 'referenceRange', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={result.status}
                    onChange={(e) => updateTestResult(index, 'status', e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="normal">Normal</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Test-specific Notes</label>
                <textarea
                  value={result.notes || ''}
                  onChange={(e) => updateTestResult(index, 'notes', e.target.value)}
                  rows={2}
                  placeholder="Additional notes for this test..."
                  className={`w-full px-3 py-2 border rounded-lg ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Interpretation */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📋 Overall Interpretation *
        </h3>
        <textarea
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
          rows={4}
          placeholder="Provide your professional interpretation of the results..."
          className={`w-full px-3 py-2 border rounded-lg ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>

      {/* Technician Notes */}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📝 Technician Notes
        </h3>
        <textarea
          value={technicianNotes}
          onChange={(e) => setTechnicianNotes(e.target.value)}
          rows={3}
          placeholder="Any additional technical notes, processing details, or observations..."
          className={`w-full px-3 py-2 border rounded-lg ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>
      {/* Critical Values Warning */}
      {testResults.some(r => r.status === 'critical') && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              ⚠️ CRITICAL VALUES DETECTED
            </h3>
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="mb-2">The following results have critical values:</p>
            <ul className="list-disc list-inside space-y-1">
              {testResults
                .filter(r => r.status === 'critical')
                .map(r => (
                  <li key={r.testCode}>
                    <strong>{r.testName}:</strong> {r.value} {r.unit} (Reference: {r.referenceRange})
                  </li>
                ))}
            </ul>
            <p className="mt-2 font-medium">
              🚨 The ordering doctor will be notified immediately upon upload!
            </p>
          </div>
        </div>
      )}

      {/* Upload Summary */}
      <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📤 Upload Summary
        </h3>
        <div className="text-sm space-y-1">
          <p><strong>Technician:</strong> {user?.fullName}</p>
          <p><strong>Upload Time:</strong> {new Date().toLocaleString()}</p>
          <p><strong>Results for:</strong> {testResults.length} test(s)</p>
          <p><strong>Will notify:</strong> Dr. {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}</p>
          <div className="flex items-center gap-2 mt-2">
            <ArrowRightIcon className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600 dark:text-blue-400">
              Results will be immediately available in doctor's dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={uploadResults}
          disabled={uploading}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            uploading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {uploading ? (
            <>
              <ClockIcon className="h-5 w-5 animate-spin" />
              Uploading Results...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              Upload Results & Notify Doctor
            </>
          )}
        </button>
        
        <button
          onClick={onCancel}
          disabled={uploading}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Help Text */}
      <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Tip:</strong> Critical values will trigger immediate notifications to the doctor. 
          Normal and abnormal results will be sent via standard notification channels.
        </p>
      </div>
    </div>
  );
};

export default LabResultUpload;