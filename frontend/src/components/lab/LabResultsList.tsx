import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabResult } from '../../services/labWorkflowApi';
import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LabResultsList: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    verificationStatus: '',
    hasCriticalValues: ''
  });
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  useEffect(() => {
    loadResults();
  }, [filter]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter.verificationStatus) params.verificationStatus = filter.verificationStatus;
      if (filter.hasCriticalValues) params.hasCriticalValues = filter.hasCriticalValues === 'true';

      const response = await labWorkflowAPI.getLabResults(params);
      setResults(response.data.labResults);
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  const verifyResult = async (resultId: number, status: string) => {
    try {
      await labWorkflowAPI.verifyLabResult(resultId, status);
      toast.success('Result verification updated successfully');
      loadResults();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify result');
    }
  };

  const addToMedicalRecord = async (resultId: number, interpretation: string) => {
    try {
      await labWorkflowAPI.addResultToMedicalRecord(resultId, interpretation);
      toast.success('Result added to medical record successfully');
      loadResults();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to medical record');
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatResultData = (resultData: Record<string, any>) => {
    return Object.entries(resultData).map(([key, value]) => (
      <div key={key} className="flex justify-between text-sm">
        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {key}:
        </span>
        <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Lab Results
        </h2>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <select
            value={filter.verificationStatus}
            onChange={(e) => setFilter(prev => ({ ...prev, verificationStatus: e.target.value }))}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Verification Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select
            value={filter.hasCriticalValues}
            onChange={(e) => setFilter(prev => ({ ...prev, hasCriticalValues: e.target.value }))}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Results</option>
            <option value="true">Critical Values Only</option>
            <option value="false">Normal Values Only</option>
          </select>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
            No lab results found
          </h3>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={result.id}
              className={`p-4 border rounded-lg ${
                theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
              } ${result.hasCriticalValues ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Order #{result.labOrder?.orderNumber}
                    </h3>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getVerificationStatusColor(result.verificationStatus)}`}>
                      {result.verificationStatus}
                    </span>
                    {result.hasCriticalValues && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Critical Values
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <UserIcon className="h-4 w-4 inline mr-1" />
                        Patient: {result.labOrder?.patient?.firstName} {result.labOrder?.patient?.lastName}
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <BeakerIcon className="h-4 w-4 inline mr-1" />
                        Tests: {result.labOrder?.testCodes.join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <ClockIcon className="h-4 w-4 inline mr-1" />
                        Result Date: {new Date(result.resultDate).toLocaleDateString()}
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Technician: {result.technician?.firstName} {result.technician?.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Result Data Preview */}
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-50'}`}>
                    <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Results Summary
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {formatResultData(result.resultData)}
                    </div>
                  </div>

                  {result.interpretation && (
                    <div className="mt-3">
                      <h4 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Interpretation
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {result.interpretation}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedResult(result)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                  
                  {user?.role === 'lab_technician' && result.verificationStatus === 'pending' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => verifyResult(result.id, 'verified')}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => verifyResult(result.id, 'rejected')}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  
                  {user?.role === 'doctor' && result.verificationStatus === 'verified' && (
                    <button
                      onClick={() => {
                        const interpretation = prompt('Enter clinical interpretation:');
                        if (interpretation) {
                          addToMedicalRecord(result.id, interpretation);
                        }
                      }}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Add to Record
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Lab Result Details - Order #{selectedResult.labOrder?.orderNumber}
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Patient & Order Info */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Order Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Patient:</strong> {selectedResult.labOrder?.patient?.firstName} {selectedResult.labOrder?.patient?.lastName}</p>
                      <p><strong>Doctor:</strong> {selectedResult.labOrder?.doctor?.firstName} {selectedResult.labOrder?.doctor?.lastName}</p>
                    </div>
                    <div>
                      <p><strong>Tests:</strong> {selectedResult.labOrder?.testCodes.join(', ')}</p>
                      <p><strong>Priority:</strong> {selectedResult.labOrder?.priority}</p>
                    </div>
                  </div>
                </div>

                {/* Result Data */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Test Results
                  </h4>
                  <div className="space-y-2">
                    {formatResultData(selectedResult.resultData)}
                  </div>
                </div>

                {/* Interpretation */}
                {selectedResult.interpretation && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Technician Interpretation
                    </h4>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {selectedResult.interpretation}
                    </p>
                  </div>
                )}

                {/* Critical Values */}
                {selectedResult.hasCriticalValues && selectedResult.criticalValues.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold mb-2 text-red-800 dark:text-red-200 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                      Critical Values Alert
                    </h4>
                    <div className="space-y-1">
                      {selectedResult.criticalValues.map((critical: any, index: number) => (
                        <p key={index} className="text-red-700 dark:text-red-300 text-sm">
                          {critical.test}: {critical.value} (Critical: {critical.threshold})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technician Notes */}
                {selectedResult.technicianNotes && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Technician Notes
                    </h4>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {selectedResult.technicianNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabResultsList;