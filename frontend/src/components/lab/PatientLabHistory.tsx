import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder, type LabResult } from '../../services/labWorkflowApi';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PatientSummary {
  totalOrders: number;
  completedResults: number;
  pendingOrders: number;
}

const PatientLabHistory: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [filter, setFilter] = useState({
    timeRange: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadPatientHistory();
  }, [filter]);

  const loadPatientHistory = async () => {
    try {
      setLoading(true);
      const response = await labWorkflowAPI.getPatientHistory();
      
      setOrders(response.data.orders);
      setResults(response.data.results);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error loading patient history:', error);
      toast.error('Failed to load lab history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const filterOrdersByTimeRange = (orders: LabOrder[]) => {
    if (filter.timeRange === 'all') return orders;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filter.timeRange) {
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return orders;
    }
    
    return orders.filter(order => new Date(order.createdAt) >= cutoffDate);
  };

  const filterOrdersByStatus = (orders: LabOrder[]) => {
    if (filter.status === 'all') return orders;
    return orders.filter(order => order.status === filter.status);
  };

  const filteredOrders = filterOrdersByStatus(filterOrdersByTimeRange(orders));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          My Lab History
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          View your lab test orders and results
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 text-blue-600">
                <BeakerIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Total Orders
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {summary.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Completed Results
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {summary.completedResults}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 text-yellow-600">
                <ClockIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Pending Orders
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {summary.pendingOrders}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <select
          value={filter.timeRange}
          onChange={(e) => setFilter(prev => ({ ...prev, timeRange: e.target.value }))}
          className={`px-3 py-2 border rounded-lg ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Time</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
        
        <select
          value={filter.status}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
          className={`px-3 py-2 border rounded-lg ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="collected">Collected</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Lab Orders and Results */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
            No lab history found
          </h3>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Try adjusting your filter criteria or contact your doctor to order lab tests.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const orderResults = results.filter(result => result.labOrderId === order.id);
            
            return (
              <div
                key={order.id}
                className={`border rounded-lg shadow ${
                  theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                {/* Order Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Order #{order.orderNumber}
                      </h3>
                      <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="h-4 w-4 inline mr-1" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <UserIcon className="h-4 w-4 inline mr-1" />
                        Doctor: {order.doctor?.firstName} {order.doctor?.lastName}
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <BeakerIcon className="h-4 w-4 inline mr-1" />
                        Tests: {order.testCodes.join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Priority: <span className={`font-medium ${
                          order.priority === 'stat' ? 'text-red-600' :
                          order.priority === 'urgent' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>{order.priority.toUpperCase()}</span>
                      </p>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Sample: {order.sampleType}
                      </p>
                    </div>
                  </div>

                  {order.specialInstructions && (
                    <div className="mt-3">
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <strong>Instructions:</strong> {order.specialInstructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Results Section */}
                {orderResults.length > 0 && (
                  <div className="p-4">
                    <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Test Results ({orderResults.length})
                    </h4>
                    <div className="space-y-3">
                      {orderResults.map((result) => (
                        <div
                          key={result.id}
                          className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                            result.hasCriticalValues 
                              ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                              : theme === 'dark' 
                              ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                              : 'border-gray-200 bg-gray-50 hover:bg-white'
                          }`}
                          onClick={() => setSelectedResult(result)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Result #{result.id}
                              </span>
                              <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getVerificationStatusColor(result.verificationStatus)}`}>
                                {result.verificationStatus}
                              </span>
                              {result.hasCriticalValues && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center">
                                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                  Critical
                                </span>
                              )}
                            </div>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(result.resultDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              Technician: {result.technician?.firstName} {result.technician?.lastName}
                            </p>
                            {result.interpretation && (
                              <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                <strong>Interpretation:</strong> {result.interpretation.substring(0, 100)}
                                {result.interpretation.length > 100 && '...'}
                              </p>
                            )}
                          </div>
                          
                          <div className="mt-2">
                            <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                              Click to view detailed results →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {orderResults.length === 0 && order.status !== 'completed' && (
                  <div className="p-4 text-center">
                    <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Results pending - Your samples are being processed
                    </p>
                  </div>
                )}
              </div>
            );
          })}
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
                  Lab Result Details
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Result Info */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Result Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Result Date:</strong> {new Date(selectedResult.resultDate).toLocaleDateString()}</p>
                      <p><strong>Verification:</strong> {selectedResult.verificationStatus}</p>
                    </div>
                    <div>
                      <p><strong>Technician:</strong> {selectedResult.technician?.firstName} {selectedResult.technician?.lastName}</p>
                      <p><strong>Order:</strong> #{selectedResult.labOrder?.orderNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Test Results */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Test Results
                  </h4>
                  <div className="space-y-2">
                    {formatResultData(selectedResult.resultData)}
                  </div>
                </div>

                {/* Critical Values Alert */}
                {selectedResult.hasCriticalValues && selectedResult.criticalValues.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold mb-2 text-red-800 dark:text-red-200 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                      Critical Values - Contact Your Doctor
                    </h4>
                    <div className="space-y-1">
                      {selectedResult.criticalValues.map((critical: any, index: number) => (
                        <p key={index} className="text-red-700 dark:text-red-300 text-sm">
                          <strong>{critical.test}:</strong> {critical.value} (Critical threshold: {critical.threshold})
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      ⚠️ These values require immediate medical attention. Please contact your doctor as soon as possible.
                    </p>
                  </div>
                )}

                {/* Interpretation */}
                {selectedResult.interpretation && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Lab Technician Interpretation
                    </h4>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {selectedResult.interpretation}
                    </p>
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

                {/* Reference Ranges */}
                {selectedResult.referenceRanges && Object.keys(selectedResult.referenceRanges).length > 0 && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Reference Ranges
                    </h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedResult.referenceRanges).map(([test, range]) => (
                        <p key={test} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                          <strong>{test}:</strong> {JSON.stringify(range)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <strong>Important:</strong> These results are for informational purposes only. 
                    Please consult with your healthcare provider for proper interpretation and medical advice. 
                    Do not make medical decisions based solely on these results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientLabHistory;