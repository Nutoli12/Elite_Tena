import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabTest } from '../../services/labWorkflowApi';
import PatientSelector from './PatientSelector';
import { 
  UserIcon, 
  BeakerIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Patient {
  walletAddress: string;
  email: string;
  fullName: string;
  phone?: string;
  displayName: string;
  searchText: string;
}

interface CreateLabOrderProps {
  onOrderCreated?: () => void;
}

const CreateLabOrder: React.FC<CreateLabOrderProps> = ({ onOrderCreated }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    testCodes: [] as string[],
    priority: 'routine',
    sampleType: 'blood',
    specialInstructions: '',
    collectionDate: ''
  });
  const [testDetails, setTestDetails] = useState<any>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadTestCatalog();
  }, []);

  useEffect(() => {
    if (formData.testCodes.length > 0) {
      calculateTestDetails();
    } else {
      setTestDetails(null);
    }
  }, [formData.testCodes]);

  const loadTestCatalog = async () => {
    try {
      const response = await labWorkflowAPI.getLabTestCatalog();
      setTests(response.data.tests);
    } catch (error) {
      console.error('Error loading test catalog:', error);
      toast.error('Failed to load test catalog');
    }
  };

  const calculateTestDetails = async () => {
    try {
      const response = await labWorkflowAPI.getTestDetails(formData.testCodes);
      setTestDetails(response.data);
    } catch (error) {
      console.error('Error calculating test details:', error);
    }
  };

  const handleTestSelection = (testCode: string) => {
    setFormData(prev => ({
      ...prev,
      testCodes: prev.testCodes.includes(testCode)
        ? prev.testCodes.filter(code => code !== testCode)
        : [...prev.testCodes, testCode]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    if (formData.testCodes.length === 0) {
      toast.error('Please select at least one test');
      return;
    }

    try {
      setLoading(true);
      
      const orderData = {
        patientWalletAddress: selectedPatient.walletAddress,
        ...formData,
        collectionDate: formData.collectionDate || undefined
      };

      const response = await labWorkflowAPI.createLabOrder(orderData);
      
      toast.success(`Lab order created successfully! Order #${response.data.labOrder.orderNumber}`);
      
      // Reset form
      setSelectedPatient(null);
      setFormData({
        testCodes: [],
        priority: 'routine',
        sampleType: 'blood',
        specialInstructions: '',
        collectionDate: ''
      });
      setStep(1);
      
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error: any) {
      console.error('Error creating lab order:', error);
      toast.error(error.response?.data?.message || 'Failed to create lab order');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTests = () => {
    return tests.filter(test => formData.testCodes.includes(test.testCode));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Step 1: Patient Information
      </h3>
      
      <PatientSelector
        selectedPatient={selectedPatient}
        onPatientSelect={setSelectedPatient}
        placeholder="Search and select a patient..."
        required={true}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">STAT</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Sample Type
          </label>
          <select
            value={formData.sampleType}
            onChange={(e) => setFormData(prev => ({ ...prev, sampleType: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="blood">Blood</option>
            <option value="urine">Urine</option>
            <option value="stool">Stool</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Collection Date (Optional)
        </label>
        <input
          type="datetime-local"
          value={formData.collectionDate}
          onChange={(e) => setFormData(prev => ({ ...prev, collectionDate: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!selectedPatient}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Select Tests
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Step 2: Select Tests
        </h3>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
        >
          ← Back to Patient Info
        </button>
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {tests.map((test) => (
          <div
            key={test.id}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              formData.testCodes.includes(test.testCode)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : theme === 'dark'
                ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
            onClick={() => handleTestSelection(test.testCode)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.testCodes.includes(test.testCode)}
                  onChange={() => {}}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {test.testName} ({test.testCode})
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {test.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ${test.standardPrice}
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {test.turnaroundTimeHours}h
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Selected: {formData.testCodes.length} test{formData.testCodes.length !== 1 ? 's' : ''}
        </div>
        <button
          type="button"
          onClick={() => setStep(3)}
          disabled={formData.testCodes.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Review Order
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Step 3: Review & Submit
        </h3>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
        >
          ← Back to Tests
        </button>
      </div>

      {/* Order Summary */}
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Order Summary
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Patient:</span>
            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              {selectedPatient?.fullName || 'No patient selected'}
            </span>
          </div>
          {selectedPatient && (
            <div className="flex justify-between">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Wallet:</span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedPatient.walletAddress.slice(0, 10)}...{selectedPatient.walletAddress.slice(-6)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Priority:</span>
            <span className={`font-medium ${
              formData.priority === 'stat' ? 'text-red-600' :
              formData.priority === 'urgent' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {formData.priority.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Sample Type:</span>
            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              {formData.sampleType}
            </span>
          </div>
          {testDetails && (
            <>
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Total Cost:</span>
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ${testDetails.totalPrice}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Estimated Time:</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  {testDetails.estimatedTime} hours
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Tests */}
      <div>
        <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Selected Tests ({formData.testCodes.length})
        </h4>
        <div className="space-y-2">
          {getSelectedTests().map((test) => (
            <div
              key={test.id}
              className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {test.testName} ({test.testCode})
                  </span>
                  {test.fastingRequired && (
                    <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                      Fasting Required
                    </span>
                  )}
                </div>
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ${test.standardPrice}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Special Instructions (Optional)
        </label>
        <textarea
          value={formData.specialInstructions}
          onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
          rows={3}
          placeholder="Any special instructions for the lab technician..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Order...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Create Lab Order
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Create Lab Order
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Order laboratory tests for your patients
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3].map((stepNumber) => (
            <React.Fragment key={stepNumber}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= stepNumber
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-600 text-gray-300'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step > stepNumber
                    ? 'bg-blue-600'
                    : theme === 'dark'
                    ? 'bg-gray-600'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Patient Info</span>
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Select Tests</span>
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Review & Submit</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </form>
    </div>
  );
};

export default CreateLabOrder;