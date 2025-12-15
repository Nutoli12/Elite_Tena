import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder } from '../../services/labWorkflowApi';
import { 
  ClipboardDocumentListIcon,
  BeakerIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  QrCodeIcon,
  PrinterIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LabWorksheetProps {
  selectedOrder: LabOrder;
  onWorksheetCreated?: (worksheetId: number) => void;
  onCancel?: () => void;
}

interface LabWorksheet {
  id?: number;
  accessionNumber: string;
  labOrderId: number;
  technicianId: string;
  sampleCollectionStatus: 'pending' | 'collected' | 'rejected';
  processingStatus: 'queued' | 'in_progress' | 'completed';
  collectionDateTime?: Date;
  processingDateTime?: Date;
  instrumentUsed?: string;
  storageLocation?: string;
  specialHandling?: string;
  chainOfCustody: CustodyRecord[];
}

interface CustodyRecord {
  timestamp: Date;
  action: string;
  performedBy: string;
  location: string;
  notes?: string;
}

interface SampleCollection {
  sampleType: string;
  collectionMethod: string;
  sampleVolume: number;
  containerType: string;
  storageLocation: string;
  expiryDateTime?: Date;
  specialHandling?: string;
  collectedBy: string;
}

const LabWorksheet: React.FC<LabWorksheetProps> = ({ 
  selectedOrder, 
  onWorksheetCreated, 
  onCancel 
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<'create' | 'collection' | 'processing' | 'complete'>('create');
  const [worksheet, setWorksheet] = useState<LabWorksheet | null>(null);
  const [sampleCollection, setSampleCollection] = useState<SampleCollection>({
    sampleType: selectedOrder.sampleType || 'blood',
    collectionMethod: 'venipuncture',
    sampleVolume: 5.0,
    containerType: 'lavender_top',
    storageLocation: 'refrigerator_a1',
    collectedBy: user?.firstName + ' ' + user?.lastName || 'Lab Technician'
  });
  
  const [processing, setProcessing] = useState(false);
  const [accessionNumber, setAccessionNumber] = useState('');

  useEffect(() => {
    generateAccessionNumber();
  }, []);

  const generateAccessionNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    const accession = `LAB-${year}${month}${day}-${timestamp}`;
    setAccessionNumber(accession);
  };

  const createWorksheet = async () => {
    try {
      setProcessing(true);
      
      const worksheetData = {
        labOrderId: selectedOrder.id,
        accessionNumber,
        technicianId: user?.walletAddress,
        sampleCollectionStatus: 'pending',
        processingStatus: 'queued',
        chainOfCustody: [
          {
            timestamp: new Date(),
            action: 'worksheet_created',
            performedBy: user?.firstName + ' ' + user?.lastName || 'Lab Technician',
            location: 'Lab Reception',
            notes: 'Lab worksheet created and assigned accession number'
          }
        ]
      };

      // This would be a new API endpoint
      const response = await labWorkflowAPI.createLabWorksheet(worksheetData);
      
      if (response.success) {
        setWorksheet(response.data.worksheet);
        setCurrentStep('collection');
        toast.success(`Worksheet created with accession #${accessionNumber}`);
      }
    } catch (error: any) {
      console.error('Error creating worksheet:', error);
      toast.error(error.response?.data?.message || 'Failed to create worksheet');
    } finally {
      setProcessing(false);
    }
  };

  const collectSample = async () => {
    try {
      setProcessing(true);
      
      const collectionData = {
        worksheetId: worksheet?.id,
        ...sampleCollection,
        collectionDateTime: new Date(),
        barcode: `${accessionNumber}-SAMPLE`
      };

      const response = await labWorkflowAPI.recordSampleCollection(collectionData);
      
      if (response.success) {
        setWorksheet(prev => prev ? {
          ...prev,
          sampleCollectionStatus: 'collected',
          collectionDateTime: new Date(),
          chainOfCustody: [
            ...prev.chainOfCustody,
            {
              timestamp: new Date(),
              action: 'sample_collected',
              performedBy: sampleCollection.collectedBy,
              location: 'Collection Station',
              notes: `${sampleCollection.sampleVolume}mL ${sampleCollection.sampleType} collected`
            }
          ]
        } : null);
        
        setCurrentStep('processing');
        toast.success('Sample collected and logged');
      }
    } catch (error: any) {
      console.error('Error recording sample collection:', error);
      toast.error(error.response?.data?.message || 'Failed to record sample collection');
    } finally {
      setProcessing(false);
    }
  };

  const startProcessing = async () => {
    try {
      setProcessing(true);
      
      const processingData = {
        worksheetId: worksheet?.id,
        instrumentUsed: worksheet?.instrumentUsed || 'AUTO_ANALYZER_1',
        operatorId: user?.walletAddress,
        startTime: new Date()
      };

      const response = await labWorkflowAPI.startProcessing(processingData);
      
      if (response.success) {
        setWorksheet(prev => prev ? {
          ...prev,
          processingStatus: 'in_progress',
          processingDateTime: new Date(),
          chainOfCustody: [
            ...prev.chainOfCustody,
            {
              timestamp: new Date(),
              action: 'processing_started',
              performedBy: user?.firstName + ' ' + user?.lastName || 'Lab Technician',
              location: 'Processing Lab',
              notes: `Processing started on ${processingData.instrumentUsed}`
            }
          ]
        } : null);
        
        setCurrentStep('complete');
        toast.success('Processing started - ready for result entry');
        
        // Now redirect to result creation
        onWorksheetCreated?.(worksheet?.id || 0);
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
      toast.error(error.response?.data?.message || 'Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  const getContainerTypeDisplay = (type: string) => {
    const containers = {
      'lavender_top': 'Lavender Top (EDTA)',
      'red_top': 'Red Top (No Additive)',
      'gold_top': 'Gold Top (SST)',
      'blue_top': 'Blue Top (Citrate)',
      'green_top': 'Green Top (Heparin)',
      'gray_top': 'Gray Top (Fluoride)',
      'urine_cup': 'Sterile Urine Cup',
      'culture_bottle': 'Culture Bottle'
    };
    return containers[type as keyof typeof containers] || type;
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'create', label: 'Create Worksheet', icon: ClipboardDocumentListIcon },
      { id: 'collection', label: 'Sample Collection', icon: BeakerIcon },
      { id: 'processing', label: 'Start Processing', icon: ClockIcon },
      { id: 'complete', label: 'Ready for Results', icon: CheckCircleIcon }
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
                <div className={`w-12 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // STEP 1: CREATE WORKSHEET
  if (currentStep === 'create') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📋 Create Lab Worksheet
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Create a lab worksheet with accession number for proper sample tracking
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
              <p><strong>Tests Ordered:</strong> {selectedOrder.testCodes.join(', ')}</p>
            </div>
            <div>
              <p><strong>Priority:</strong> <span className={`px-2 py-1 rounded text-xs ${
                selectedOrder.priority === 'stat' ? 'bg-red-100 text-red-800' :
                selectedOrder.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>{selectedOrder.priority.toUpperCase()}</span></p>
              <p><strong>Sample Type:</strong> {selectedOrder.sampleType}</p>
              <p><strong>Doctor:</strong> Dr. {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}</p>
            </div>
          </div>
        </div>

        {/* Accession Number */}
        <div className={`p-4 rounded-lg mb-6 border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700`}>
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            🏷️ Generated Accession Number
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <QrCodeIcon className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-300">
                {accessionNumber}
              </span>
            </div>
            <button
              onClick={generateAccessionNumber}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Regenerate
            </button>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
            This unique number will track the sample through the entire process
          </p>
        </div>

        {/* Special Instructions */}
        {selectedOrder.specialInstructions && (
          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📝 Special Instructions
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {selectedOrder.specialInstructions}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={createWorksheet}
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
                Creating Worksheet...
              </>
            ) : (
              <>
                <ClipboardDocumentListIcon className="h-5 w-5" />
                📋 CREATE WORKSHEET
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

  // STEP 2: SAMPLE COLLECTION
  if (currentStep === 'collection') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            💉 Sample Collection
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Record sample collection details for accession #{accessionNumber}
          </p>
        </div>

        {renderStepIndicator()}

        {/* Collection Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Sample Type</label>
              <select
                value={sampleCollection.sampleType}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, sampleType: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="blood">Blood</option>
                <option value="urine">Urine</option>
                <option value="serum">Serum</option>
                <option value="plasma">Plasma</option>
                <option value="tissue">Tissue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Collection Method</label>
              <select
                value={sampleCollection.collectionMethod}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, collectionMethod: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="venipuncture">Venipuncture</option>
                <option value="fingerstick">Fingerstick</option>
                <option value="midstream_urine">Midstream Urine</option>
                <option value="catheter">Catheter</option>
                <option value="biopsy">Biopsy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sample Volume (mL)</label>
              <input
                type="number"
                step="0.1"
                value={sampleCollection.sampleVolume}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, sampleVolume: parseFloat(e.target.value) }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Container Type</label>
              <select
                value={sampleCollection.containerType}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, containerType: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="lavender_top">Lavender Top (EDTA)</option>
                <option value="red_top">Red Top (No Additive)</option>
                <option value="gold_top">Gold Top (SST)</option>
                <option value="blue_top">Blue Top (Citrate)</option>
                <option value="green_top">Green Top (Heparin)</option>
                <option value="gray_top">Gray Top (Fluoride)</option>
                <option value="urine_cup">Sterile Urine Cup</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Storage Location</label>
              <select
                value={sampleCollection.storageLocation}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, storageLocation: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="refrigerator_a1">Refrigerator A1 (2-8°C)</option>
                <option value="freezer_b2">Freezer B2 (-20°C)</option>
                <option value="room_temp_c3">Room Temperature C3</option>
                <option value="incubator_d4">Incubator D4 (37°C)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Collected By</label>
              <input
                type="text"
                value={sampleCollection.collectedBy}
                onChange={(e) => setSampleCollection(prev => ({ ...prev, collectedBy: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Special Handling Instructions</label>
            <textarea
              value={sampleCollection.specialHandling || ''}
              onChange={(e) => setSampleCollection(prev => ({ ...prev, specialHandling: e.target.value }))}
              rows={3}
              placeholder="Any special handling requirements..."
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={collectSample}
            disabled={processing}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              processing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {processing ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                Recording Collection...
              </>
            ) : (
              <>
                <BeakerIcon className="h-5 w-5" />
                💉 RECORD SAMPLE COLLECTION
              </>
            )}
          </button>
          
          <button
            onClick={() => setCurrentStep('create')}
            disabled={processing}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // STEP 3: START PROCESSING
  if (currentStep === 'processing') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🔬 Start Processing
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Begin laboratory processing for accession #{accessionNumber}
          </p>
        </div>

        {renderStepIndicator()}

        {/* Processing Setup */}
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Sample Collection Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Sample Type:</strong> {sampleCollection.sampleType}</p>
                <p><strong>Volume:</strong> {sampleCollection.sampleVolume} mL</p>
                <p><strong>Container:</strong> {getContainerTypeDisplay(sampleCollection.containerType)}</p>
              </div>
              <div>
                <p><strong>Collection Method:</strong> {sampleCollection.collectionMethod}</p>
                <p><strong>Storage:</strong> {sampleCollection.storageLocation}</p>
                <p><strong>Collected By:</strong> {sampleCollection.collectedBy}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Instrument Assignment</label>
            <select
              value={worksheet?.instrumentUsed || 'AUTO_ANALYZER_1'}
              onChange={(e) => setWorksheet(prev => prev ? { ...prev, instrumentUsed: e.target.value } : null)}
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="AUTO_ANALYZER_1">Auto Analyzer 1 (Chemistry)</option>
              <option value="HEMATOLOGY_ANALYZER">Hematology Analyzer</option>
              <option value="IMMUNOASSAY_ANALYZER">Immunoassay Analyzer</option>
              <option value="MICROSCOPE_STATION_1">Microscope Station 1</option>
              <option value="PCR_MACHINE">PCR Machine</option>
            </select>
          </div>

          <div className={`p-4 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700`}>
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
              ✅ Ready to Process
            </h3>
            <p className="text-sm text-green-800 dark:text-green-300">
              Sample has been collected and is ready for processing. Starting processing will:
            </p>
            <ul className="text-sm text-green-800 dark:text-green-300 mt-2 list-disc list-inside">
              <li>Assign the sample to the selected instrument</li>
              <li>Begin the processing timeline</li>
              <li>Enable result entry once processing is complete</li>
              <li>Update the chain of custody</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={startProcessing}
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
                Starting Processing...
              </>
            ) : (
              <>
                <ClockIcon className="h-5 w-5" />
                🔬 START PROCESSING
              </>
            )}
          </button>
          
          <button
            onClick={() => setCurrentStep('collection')}
            disabled={processing}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // STEP 4: COMPLETE - READY FOR RESULTS
  if (currentStep === 'complete') {
    return (
      <div className={`max-w-4xl mx-auto p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ✅ Worksheet Complete
          </h2>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Lab worksheet created successfully - ready for result entry
          </p>
        </div>

        {renderStepIndicator()}

        {/* Success Summary */}
        <div className={`p-6 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700 mb-6`}>
          <div className="flex items-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-200">
              Lab Worksheet Created Successfully!
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Accession Number:</strong> {accessionNumber}</p>
              <p><strong>Sample Status:</strong> Collected & Ready</p>
              <p><strong>Processing Status:</strong> In Progress</p>
            </div>
            <div>
              <p><strong>Instrument:</strong> {worksheet?.instrumentUsed}</p>
              <p><strong>Technician:</strong> {user?.firstName} {user?.lastName}</p>
              <p><strong>Started:</strong> {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Chain of Custody */}
        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📋 Chain of Custody
          </h3>
          <div className="space-y-2">
            {worksheet?.chainOfCustody.map((record, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">{record.action.replace('_', ' ').toUpperCase()}</span>
                <span className="mx-2">•</span>
                <span>{record.performedBy}</span>
                <span className="mx-2">•</span>
                <span>{record.timestamp.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onWorksheetCreated?.(worksheet?.id || 0)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5" />
            📊 PROCEED TO RESULT ENTRY
          </button>
          
          <button
            onClick={() => {
              // Print worksheet functionality
              window.print();
            }}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <PrinterIcon className="h-5 w-5 inline mr-2" />
            Print Worksheet
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default LabWorksheet;