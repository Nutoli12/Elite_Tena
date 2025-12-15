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
  ClockIcon,
  EyeIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LabResultCreationProps {
  selectedOrder: LabOrder;
  onResultCreated?: (orderId: number) => void;
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

interface QualityCheck {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  criticalValues: TestResult[];
  requiresReview: boolean;
}

const RESULT_STATUS_FLOW = {
  'draft': { next: ['submitted', 'cancelled'], label: 'Draft', color: 'gray' },
  'submitted': { next: ['validated', 'rejected'], label: 'Submitted for Validation', color: 'blue' },
  'validated': { next: ['reviewed', 'correction_requested'], label: 'Validated', color: 'green' },
  'reviewed': { next: ['released'], label: 'Under Review', color: 'purple' },
  'released': { next: ['completed'], label: 'Released to Doctor', color: 'indigo' },
  'completed': { next: [], label: 'Completed', color: 'green' }
};

const LabResultCreation: React.FC<LabResultCreationProps> = ({ 
  selectedOrder, 
  onResultCreated, 
  onCancel 
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // Core state
  const [currentStep, setCurrentStep] = useState<'create' | 'entry' | 'validation' | 'review'>('create');
  const [resultRecord, setResultRecord] = useState<any>(null);
  const [resultStatus, setResultStatus] = useState<keyof typeof RESULT_STATUS_FLOW>('draft');
  
  // Test results
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  
  // Quality control
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([
    { id: 'sample_integrity', label: 'Sample not hemolyzed', checked: false, required: true },
    { id: 'sample_clotted', label: 'Sample not clotted', checked: false, required: true },
    { id: 'instrument_qc', label: 'Instrument QC passed', checked: false, required: true },
    { id: 'calibration_valid', label: 'Calibration valid', checked: false, required: true },
    { id: 'controls_acceptable', label: 'Quality controls acceptable', checked: false, required: true }
  ]);
  
  // File uploads
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [rawDataFiles, setRawDataFiles] = useState<File[]>([]);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    initializeTestResults();
  }, [selectedOrder]);

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

  // STEP 1: CREATE RESULT RECORD
  const createLabResultRecord = async () => {
    try {
      setProcessing(true);
      
      const response = await labWorkflowAPI.createLabResultRecord({
        labOrderId: selectedOrder.id,
        technicianId: user?.id,
        testCodes: selectedOrder.testCodes
      });

      if (response.success) {
        setResultRecord(response.data.resultRecord);
        setResultStatus('draft');
        setCurrentStep('entry');
        
        // Update order status to processing
        await labWorkflowAPI.updateLabOrderStatus(selectedOrder.id, 'processing');
        
        toast.success('Result record created. Begin entering data.');
      }
    } catch (error: any) {
      console.error('Error creating result record:', error);
      toast.error(error.response?.data?.message || 'Failed to create result record');
    } finally {
      setProcessing(false);
    }
  };

  // STEP 2: VALIDATE RESULTS
  const validateLabResults = async (): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalValues: TestResult[] = [];

    // Check 1: Required fields
    const emptyResults = testResults.filter(result => !result.value.trim());
    if (emptyResults.length > 0) {
      errors.push(`Missing values for: ${emptyResults.map(r => r.testName).join(', ')}`);
    }

    if (!interpretation.trim()) {
      errors.push('Clinical interpretation is required');
    }

    // Check 2: Quality control
    const failedQC = qualityChecks.filter(qc => qc.required && !qc.checked);
    if (failedQC.length > 0) {
      errors.push(`Quality checks failed: ${failedQC.map(qc => qc.label).join(', ')}`);
    }

    // Check 3: Critical values
    const criticalResults = testResults.filter(r => r.status === 'critical');
    criticalValues.push(...criticalResults);

    // Check 4: Value ranges (warnings)
    testResults.forEach(result => {
      if (result.value && result.status === 'abnormal') {
        warnings.push(`${result.testName}: ${result.value} ${result.unit} is outside normal range`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      criticalValues,
      requiresReview: criticalValues.length > 0 || warnings.length > 0
    };
  };

  // STEP 3: SUBMIT FOR VALIDATION
  const submitForValidation = async () => {
    try {
      setProcessing(true);
      
      const validation = await validateLabResults();
      setValidationResult(validation);

      if (!validation.valid) {
        setCurrentStep('validation');
        return;
      }

      // Save results as submitted
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

      const response = await labWorkflowAPI.submitLabResults({
        resultRecordId: resultRecord.id,
        resultData,
        interpretation,
        technicianNotes,
        qualityChecks: qualityChecks.reduce((acc, qc) => ({ ...acc, [qc.id]: qc.checked }), {}),
        reportFiles: [], // File upload would be implemented here
        rawDataFiles: []
      });

      if (response.success) {
        setResultStatus('submitted');
        setCurrentStep('review');
        toast.success('Results submitted for validation');
      }
    } catch (error: any) {
      console.error('Error submitting results:', error);
      toast.error(error.response?.data?.message || 'Failed to submit results');
    } finally {
      setProcessing(false);
    }
  };

  // STEP 4: RELEASE TO DOCTOR
  const releaseToDoctor = async () => {
    try {
      setProcessing(true);

      const response = await labWorkflowAPI.releaseResultsToDoctor({
        resultRecordId: resultRecord.id,
        finalValidation: true
      });

      if (response.success) {
        setResultStatus('released');
        
        // Update order status
        await labWorkflowAPI.updateLabOrderStatus(selectedOrder.id, 'results_released');
        
        toast.success(
          `Results released to Dr. ${selectedOrder.doctor?.firstName} ${selectedOrder.doctor?.lastName}!`,
          { duration: 6000 }
        );

        // Show critical value alert if needed
        if (validationResult?.criticalValues.length) {
          toast.error(
            `⚠️ CRITICAL VALUES RELEASED: Doctor notified immediately!`,
            { duration: 10000 }
          );
        }

        onResultCreated?.(selectedOrder.id);
      }
    } catch (error: any) {
      console.error('Error releasing results:', error);
      toast.error(error.response?.data?.message || 'Failed to release results');
    } finally {
      setProcessing(false);
    }
  };

  const updateTestResult = (index: number, field: keyof TestResult, value: string) => {
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, [field]: value } : result
    ));
  };

  const handleValueChange = (index: number, value: string) => {
    const result = testResults[index];
    const status = determineResultStatus(result.testCode, value);
    
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, value, status } : result
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

  const toggleQualityCheck = (id: string) => {
    setQualityChecks(prev => prev.map(qc => 
      qc.id === id ? { ...qc, checked: !qc.checked } : qc
    ));
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

  const renderStepIndicator = () => {
    const steps = [
      { id: 'create', label: 'Create Record', icon: DocumentTextIcon },
      { id: 'entry', label: 'Enter Results', icon: BeakerIcon },
      { id: 'validation', label: 'Validation', icon: ShieldCheckIcon },
      { id: 'review', label: 'Release', icon: DocumentArrowUpIcon }
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive ? 'border-blue-500 bg-blue-500 text-white' :
                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 bg-white text-gray-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <ArrowRightIcon className="h-4 w-4 text-gray-400 mx-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // STEP 1: CREATE RECORD VIEW
  if (currentStep === 'create') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🧪 Create Lab Result Entry
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            MEDICAL LAB WORKFLOW: Results must be CREATED before processing
          </p>
        </div>

        {renderStepIndicator()}

        {/* Order Information */}
        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Order Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
              <p><strong>Patient:</strong> {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</p>
              <p><strong>Tests:</strong> {selectedOrder.testCodes.join(', ')}</p>
            </div>
            <div>
              <p><strong>Sample Type:</strong> {selectedOrder.sampleType}</p>
              <p><strong>Priority:</strong> {selectedOrder.priority}</p>
              <p><strong>Doctor:</strong> Dr. {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}</p>
            </div>
          </div>
        </div>

        {/* Workflow Explanation */}
        <div className={`p-4 rounded-lg mb-6 border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700`}>
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            📋 CORRECT LAB WORKFLOW
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>1. <strong>CREATE RESULT ENTRY</strong> → Creates database record</li>
            <li>2. <strong>PROCESS SAMPLE</strong> → Enter test results and data</li>
            <li>3. <strong>VALIDATE RESULTS</strong> → System checks ranges and critical values</li>
            <li>4. <strong>REVIEW & VERIFY</strong> → Technician confirms accuracy</li>
            <li>5. <strong>RELEASE TO DOCTOR</strong> → Results sent for doctor review</li>
            <li>6. <strong>DOCTOR COMPLETES</strong> → Doctor reviews and accepts</li>
          </ol>
        </div>

        <div className="flex gap-4">
          <button
            onClick={createLabResultRecord}
            disabled={processing}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              processing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {processing ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                Creating Record...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5" />
                🧪 CREATE RESULT ENTRY
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: RESULT ENTRY VIEW
  if (currentStep === 'entry') {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📊 RESULT ENTRY FORM for Order #{selectedOrder.orderNumber}
          </h2>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Status: <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${RESULT_STATUS_FLOW[resultStatus].color}-100 text-${RESULT_STATUS_FLOW[resultStatus].color}-800`}>
              {RESULT_STATUS_FLOW[resultStatus].label}
            </span>
          </div>
        </div>

        {renderStepIndicator()}

        {/* Quality Control Checks */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ✅ QUALITY CHECKS
          </h3>
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qualityChecks.map(qc => (
                <label key={qc.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qc.checked}
                    onChange={() => toggleQualityCheck(qc.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${qc.required ? 'font-medium' : ''} ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {qc.label} {qc.required && <span className="text-red-500">*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Test Results Entry */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🧪 ENTER RESULTS
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
                      readOnly
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-100 ${
                        theme === 'dark' 
                          ? 'bg-gray-600 border-gray-600 text-gray-300' 
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Auto Status</label>
                    <div className={`px-3 py-2 border rounded-lg ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Test Notes</label>
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

        {/* Clinical Interpretation */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📋 INTERPRETATION *
          </h3>
          <textarea
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            rows={4}
            placeholder="Enter clinical interpretation..."
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
            📝 TECHNICIAN NOTES
          </h3>
          <textarea
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            rows={3}
            placeholder="Processing details, observations..."
            className={`w-full px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setResultStatus('draft')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            💾 SAVE AS DRAFT
          </button>
          
          <button
            onClick={submitForValidation}
            disabled={processing}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              processing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {processing ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <ShieldCheckIcon className="h-5 w-5" />
                🔍 REQUEST VALIDATION
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: VALIDATION VIEW
  if (currentStep === 'validation' && validationResult) {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🔍 VALIDATION RESULTS
          </h2>
        </div>

        {renderStepIndicator()}

        {/* Validation Errors */}
        {validationResult.errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              ❌ VALIDATION ERRORS
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Critical Values */}
        {validationResult.criticalValues.length > 0 && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              🚨 CRITICAL VALUES DETECTED
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {validationResult.criticalValues.map((result, index) => (
                <li key={index}>
                  <strong>{result.testName}:</strong> {result.value} {result.unit} (Ref: {result.referenceRange})
                </li>
              ))}
            </ul>
            <p className="mt-2 font-medium text-red-800 dark:text-red-200">
              ⚠️ These values require immediate doctor notification!
            </p>
          </div>
        )}

        {/* Warnings */}
        {validationResult.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ WARNINGS
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              {validationResult.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setCurrentStep('entry')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← BACK TO ENTRY
          </button>
          
          {validationResult.valid && (
            <button
              onClick={() => setCurrentStep('review')}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ PROCEED TO REVIEW
            </button>
          )}
        </div>
      </div>
    );
  }

  // STEP 4: REVIEW & RELEASE VIEW
  if (currentStep === 'review') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📤 RELEASE TO DOCTOR
          </h2>
        </div>

        {renderStepIndicator()}

        {/* Release Summary */}
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📋 RELEASE SUMMARY
          </h3>
          <div className="text-sm space-y-1">
            <p><strong>Order:</strong> #{selectedOrder.orderNumber}</p>
            <p><strong>Patient:</strong> {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</p>
            <p><strong>Tests:</strong> {testResults.length} test(s) completed</p>
            <p><strong>Technician:</strong> {user?.firstName} {user?.lastName}</p>
            <p><strong>Will notify:</strong> Dr. {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}</p>
            <p><strong>Critical values:</strong> {validationResult?.criticalValues.length || 0}</p>
          </div>
        </div>

        {/* Critical Values Final Warning */}
        {validationResult?.criticalValues.length > 0 && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              🚨 FINAL CRITICAL VALUE CONFIRMATION
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              You are about to release results with critical values. The doctor will be notified immediately.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {validationResult.criticalValues.map((result, index) => (
                <li key={index}>
                  <strong>{result.testName}:</strong> {result.value} {result.unit}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setCurrentStep('entry')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← BACK TO EDIT
          </button>
          
          <button
            onClick={releaseToDoctor}
            disabled={processing}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              processing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : validationResult?.criticalValues.length 
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {processing ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-5 w-5" />
                🚀 RELEASE TO DOCTOR
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default LabResultCreation;