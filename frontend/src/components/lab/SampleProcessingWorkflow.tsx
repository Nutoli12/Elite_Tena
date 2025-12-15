import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { LabOrder } from '../../services/labWorkflowApi';
import { 
  QrCodeIcon,
  CheckCircleIcon,
  XMarkIcon,
  BeakerIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface SampleProcessingWorkflowProps {
  selectedOrder?: LabOrder | null;
  onOrderComplete?: (orderId: number) => void;
}

interface SampleInfo {
  id: string;
  type: string;
  volume: string;
  container: string;
  status: 'pending' | 'collected' | 'verified' | 'rejected';
  barcode?: string;
  collectionTime?: string;
  rejectionReason?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'paused';
  progress: number;
  startTime?: string;
  estimatedCompletion?: string;
  instrument?: string;
  qcStatus?: 'pass' | 'fail' | 'pending';
}

const REJECTION_REASONS = {
  'HEMOLYZED': {
    code: 'RQ-001',
    severity: 'HIGH',
    label: 'Sample Hemolyzed',
    action: 'REQUEST_NEW_SAMPLE',
    autoReschedule: true
  },
  'INSUFFICIENT_VOLUME': {
    code: 'RQ-002',
    severity: 'MEDIUM',
    label: 'Insufficient Volume',
    action: 'REQUEST_ADDITIONAL_SAMPLE',
    autoReschedule: true
  },
  'WRONG_CONTAINER': {
    code: 'RQ-003',
    severity: 'HIGH',
    label: 'Wrong Container Type',
    action: 'REJECT_AND_EDUCATE',
    requiresDocumentation: true
  },
  'PATIENT_MISMATCH': {
    code: 'RQ-004',
    severity: 'CRITICAL',
    label: 'Patient ID Mismatch',
    action: 'QUARANTINE_AND_INVESTIGATE',
    requiresIncidentReport: true
  },
  'SAMPLE_AGE_EXCEEDED': {
    code: 'RQ-005',
    severity: 'MEDIUM',
    label: 'Sample Age Exceeded',
    action: 'REJECT_WITH_EXPLANATION',
    autoReschedule: true
  },
  'TEST_NOT_AVAILABLE': {
    code: 'RQ-006',
    severity: 'MEDIUM',
    label: 'Test Not Available',
    action: 'SUGGEST_ALTERNATIVE_OR_REFER',
    suggestAlternatives: true
  }
};

const SampleProcessingWorkflow: React.FC<SampleProcessingWorkflowProps> = ({ 
  selectedOrder
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'collection' | 'processing' | 'verification'>('collection');
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleInfo | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      initializeSamples();
      initializeProcessingSteps();
    }
  }, [selectedOrder]);

  const initializeSamples = () => {
    if (!selectedOrder) return;
    
    // Generate sample requirements based on test codes
    const sampleRequirements: SampleInfo[] = selectedOrder.testCodes.map((testCode, index) => ({
      id: `${selectedOrder.orderNumber}-${index + 1}`,
      type: getSampleTypeForTest(testCode),
      volume: getVolumeForTest(testCode),
      container: getContainerForTest(testCode),
      status: 'pending'
    }));
    
    setSamples(sampleRequirements);
  };

  const initializeProcessingSteps = () => {
    if (!selectedOrder) return;
    
    const steps: ProcessingStep[] = selectedOrder.testCodes.map((testCode, index) => ({
      id: `step-${index}`,
      name: getTestDisplayName(testCode),
      status: 'pending',
      progress: 0,
      instrument: getInstrumentForTest(testCode),
      qcStatus: 'pending'
    }));
    
    setProcessingSteps(steps);
  };

  const getSampleTypeForTest = (testCode: string): string => {
    const sampleTypes: Record<string, string> = {
      'CBC': 'Whole Blood',
      'CHEM': 'Serum',
      'LIPID': 'Serum',
      'GLUCOSE': 'Plasma',
      'TROPONIN': 'Serum',
      'MALARIA': 'Whole Blood',
      'URINALYSIS': 'Urine'
    };
    return sampleTypes[testCode] || 'Whole Blood';
  };

  const getVolumeForTest = (testCode: string): string => {
    const volumes: Record<string, string> = {
      'CBC': '5.0 mL',
      'CHEM': '3.0 mL',
      'LIPID': '3.0 mL',
      'GLUCOSE': '2.0 mL',
      'TROPONIN': '3.0 mL',
      'MALARIA': '2.0 mL',
      'URINALYSIS': '10.0 mL'
    };
    return volumes[testCode] || '5.0 mL';
  };

  const getContainerForTest = (testCode: string): string => {
    const containers: Record<string, string> = {
      'CBC': 'Lavender Top',
      'CHEM': 'Red Top',
      'LIPID': 'Red Top',
      'GLUCOSE': 'Gray Top',
      'TROPONIN': 'Red Top',
      'MALARIA': 'Lavender Top',
      'URINALYSIS': 'Sterile Cup'
    };
    return containers[testCode] || 'Lavender Top';
  };

  const getTestDisplayName = (testCode: string): string => {
    const names: Record<string, string> = {
      'CBC': 'Complete Blood Count',
      'CHEM': 'Basic Metabolic Panel',
      'LIPID': 'Lipid Profile',
      'GLUCOSE': 'Glucose Level',
      'TROPONIN': 'Troponin I Quantitative',
      'MALARIA': 'Malaria Parasite (Microscopy)',
      'URINALYSIS': 'Urinalysis Complete'
    };
    return names[testCode] || testCode;
  };

  const getInstrumentForTest = (testCode: string): string => {
    const instruments: Record<string, string> = {
      'CBC': 'Sysmex XN-1000',
      'CHEM': 'Abbott Architect ci4100',
      'LIPID': 'Abbott Architect ci4100',
      'GLUCOSE': 'Abbott Architect ci4100',
      'TROPONIN': 'Abbott Architect ci4100',
      'MALARIA': 'Olympus CX43 Microscope',
      'URINALYSIS': 'Siemens Clinitek Novus'
    };
    return instruments[testCode] || 'Manual Processing';
  };

  const handleBarcodeScanning = (sampleId: string) => {
    if (!scannedBarcode.trim()) {
      toast.error('Please enter or scan a barcode');
      return;
    }

    setSamples(prev => prev.map(sample => 
      sample.id === sampleId 
        ? { 
            ...sample, 
            barcode: scannedBarcode,
            status: 'collected',
            collectionTime: new Date().toISOString()
          }
        : sample
    ));
    
    setScannedBarcode('');
    toast.success('Sample barcode verified successfully');
  };

  const handleSampleRejection = async () => {
    if (!selectedSample || !rejectionReason) {
      toast.error('Please select a rejection reason');
      return;
    }

    try {
      setLoading(true);
      
      // Update sample status
      setSamples(prev => prev.map(sample => 
        sample.id === selectedSample.id 
          ? { 
              ...sample, 
              status: 'rejected',
              rejectionReason: rejectionReason
            }
          : sample
      ));

      // Log rejection and notify appropriate parties
      const reason = REJECTION_REASONS[rejectionReason as keyof typeof REJECTION_REASONS];
      
      toast.error(`Sample rejected: ${reason.label}`);
      
      // Close modal
      setShowRejectionModal(false);
      setSelectedSample(null);
      setRejectionReason('');
      setRejectionNotes('');
      
    } catch (error) {
      toast.error('Failed to reject sample');
    } finally {
      setLoading(false);
    }
  };

  const startProcessing = async (stepId: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status: 'running',
            startTime: new Date().toISOString(),
            estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min estimate
          }
        : step
    ));

    // Simulate processing progress
    const interval = setInterval(() => {
      setProcessingSteps(prev => prev.map(step => {
        if (step.id === stepId && step.status === 'running') {
          const newProgress = Math.min(step.progress + 10, 100);
          return {
            ...step,
            progress: newProgress,
            ...(newProgress === 100 && { 
              status: 'completed',
              qcStatus: 'pass'
            })
          };
        }
        return step;
      }));
    }, 2000);

    // Clear interval after completion
    setTimeout(() => clearInterval(interval), 20000);
  };

  const pauseProcessing = (stepId: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'paused' }
        : step
    ));
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'stat':
        return { color: 'text-red-600 bg-red-100 border-red-200', icon: '🚨', label: 'CRITICAL' };
      case 'urgent':
        return { color: 'text-orange-600 bg-orange-100 border-orange-200', icon: '⚠️', label: 'URGENT' };
      default:
        return { color: 'text-green-600 bg-green-100 border-green-200', icon: '✅', label: 'ROUTINE' };
    }
  };

  if (!selectedOrder) {
    return (
      <div className={`p-6 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        <BeakerIcon className="mx-auto h-12 w-12 mb-4" />
        <p>Select an order to begin sample processing</p>
      </div>
    );
  }

  const priorityConfig = getPriorityConfig(selectedOrder.priority);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🔬 Sample Processing Workflow
          </h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig.color}`}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>
          </div>
        </div>
        
        {/* Order Info */}
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Order: #{selectedOrder.orderNumber}
              </p>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Patient: {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}
              </p>
            </div>
            <div>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Tests: {selectedOrder.testCodes.join(', ')}
              </p>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Doctor: {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}
              </p>
            </div>
            <div>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                MRN: {selectedOrder.patientWalletAddress.slice(-8).toUpperCase()}
              </p>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Collection: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1">
          {[
            { key: 'collection', label: 'Sample Collection', icon: QrCodeIcon },
            { key: 'processing', label: 'Processing', icon: BeakerIcon },
            { key: 'verification', label: 'Verification', icon: CheckCircleIcon }
          ].map((step) => (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                currentStep === step.key
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <step.icon className="h-4 w-4" />
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'collection' && (
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📋 Sample Collection Verification
            </h3>
          </div>
          <div className="p-4">
            {/* Required Samples Table */}
            <div className="mb-6">
              <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Required Samples
              </h4>
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Sample Type</th>
                      <th className="text-left py-2">Volume</th>
                      <th className="text-left py-2">Container</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((sample, sampleIndex) => (
                      <tr key={sample.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                            sample.status === 'collected' ? 'bg-green-100 text-green-800' :
                            sample.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sampleIndex + 1}
                          </span>
                        </td>
                        <td className="py-3">{sample.type}</td>
                        <td className="py-3">{sample.volume}</td>
                        <td className="py-3">{sample.container}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sample.status === 'collected' ? 'bg-green-100 text-green-800' :
                            sample.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sample.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {sample.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleBarcodeScanning(sample.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Scan
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSample(sample);
                                    setShowRejectionModal(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {sample.status === 'collected' && (
                              <span className="text-green-600 text-xs">✓ Verified</span>
                            )}
                            {sample.status === 'rejected' && (
                              <span className="text-red-600 text-xs">✗ {sample.rejectionReason}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Barcode Scanning */}
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📱 Scan Sample Barcode
              </h4>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className={`flex-1 px-3 py-2 border rounded-lg ${
                    theme === 'dark' 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <QrCodeIcon className="h-4 w-4" />
                  Scan
                </button>
              </div>
            </div>

            {/* Patient Verification */}
            <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ✅ Patient Verification
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Scan Patient Wristband</span>
                  <button className="ml-auto px-3 py-1 bg-gray-600 text-white rounded text-xs">
                    SCAN
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Verify Patient Photo</span>
                  <button className="ml-auto px-3 py-1 bg-gray-600 text-white rounded text-xs">
                    VIEW PHOTO
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Confirm Test Requisition</span>
                  <button className="ml-auto px-3 py-1 bg-gray-600 text-white rounded text-xs">
                    MATCH TESTS
                  </button>
                </div>
              </div>
            </div>

            {/* Collection Timestamp */}
            <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    🕒 Collection Timestamp: {new Date().toLocaleString()}
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    👤 Collected By: {user?.fullName || 'Tech. User'} (ID: {user?.walletAddress?.slice(-6).toUpperCase()})
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Confirm Collection
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                    Request Re-Collection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'processing' && (
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              🔬 Active Processing Queue
            </h3>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              TECH: {user?.fullName || 'Technician'} | SHIFT: 07:00-15:00 | STATS: {processingSteps.filter(s => s.status === 'completed').length}/{processingSteps.length} complete
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {processingSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 border-2 rounded-lg ${
                    step.status === 'completed' ? 'border-green-200 bg-green-50' :
                    step.status === 'running' ? 'border-blue-200 bg-blue-50' :
                    step.status === 'paused' ? 'border-yellow-200 bg-yellow-50' :
                    theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">
                          {step.status === 'completed' ? '✅' :
                           step.status === 'running' ? '⏳' :
                           step.status === 'paused' ? '⏸️' : '🔄'}
                        </span>
                        <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {step.name}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            Order: #{selectedOrder.orderNumber} | Patient: {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}
                          </p>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            Instrument: {step.instrument}
                          </p>
                        </div>
                        <div>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            Status: {step.status.toUpperCase()} | Progress: {step.progress}%
                          </p>
                          {step.startTime && (
                            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                              Started: {new Date(step.startTime).toLocaleTimeString()} | ETA: {step.estimatedCompletion ? new Date(step.estimatedCompletion).toLocaleTimeString() : 'Calculating...'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {step.status === 'running' && (
                        <div className="mb-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${step.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* QC Status */}
                      {step.qcStatus && (
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          step.qcStatus === 'pass' ? 'bg-green-100 text-green-800' :
                          step.qcStatus === 'fail' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          QC: {step.qcStatus.toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      {step.status === 'pending' && (
                        <button
                          onClick={() => startProcessing(step.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                        >
                          <PlayIcon className="h-4 w-4" />
                          Start Processing
                        </button>
                      )}
                      {step.status === 'running' && (
                        <button
                          onClick={() => pauseProcessing(step.id)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm flex items-center gap-1"
                        >
                          <PauseIcon className="h-4 w-4" />
                          Pause
                        </button>
                      )}
                      {step.status === 'completed' && (
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                          View Results
                        </button>
                      )}
                      <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
                        Add Note
                      </button>
                      <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
                        View QC
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'verification' && (
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ✅ Result Verification & Release
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-6">
              {/* Results Summary */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Test Results Summary
                </h4>
                <div className="space-y-2">
                  {selectedOrder.testCodes.map((testCode, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
                      <span className="font-medium">{getTestDisplayName(testCode)}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">✓ COMPLETED</span>
                        <button className="text-blue-600 hover:underline">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Control */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Quality Control
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span>Positive Control: PASSED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span>Negative Control: PASSED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span>Instrument Calibration: CURRENT</span>
                  </div>
                </div>
              </div>

              {/* Technician Verification */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Technician Verification
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">I have reviewed all results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">I confirm quality controls passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">I verify patient identification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Results are ready for release</span>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Digital Signature:</label>
                    <input
                      type="text"
                      placeholder="Enter your digital signature..."
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark' 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Release Options */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Release Options
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="radio" name="release" value="doctor_only" className="rounded" />
                    <span className="text-sm">Release to Doctor Only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="release" value="doctor_patient" className="rounded" />
                    <span className="text-sm">Release to Doctor & Patient Portal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="release" value="hold_review" className="rounded" />
                    <span className="text-sm">Hold for Supervisor Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="release" value="cumulative" className="rounded" />
                    <span className="text-sm">Add to Cumulative Report</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Sign & Verify
                </button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Release to Dr. {selectedOrder.doctor?.firstName}
                </button>
                <button className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">
                  Hold for Review
                </button>
                <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium">
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full mx-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Sample Rejection
                </h3>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason:</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select a reason...</option>
                    {Object.entries(REJECTION_REASONS).map(([key, reason]) => (
                      <option key={key} value={key}>
                        {reason.code} - {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes:</label>
                  <textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter additional details about the rejection..."
                  />
                </div>
                
                {rejectionReason && (
                  <div className={`p-3 rounded-lg ${
                    REJECTION_REASONS[rejectionReason as keyof typeof REJECTION_REASONS].severity === 'CRITICAL' 
                      ? 'bg-red-100 text-red-800' 
                      : REJECTION_REASONS[rejectionReason as keyof typeof REJECTION_REASONS].severity === 'HIGH'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <p className="text-sm">
                      <strong>Action Required:</strong> {REJECTION_REASONS[rejectionReason as keyof typeof REJECTION_REASONS].action.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSampleRejection}
                  disabled={!rejectionReason || loading}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleProcessingWorkflow;
