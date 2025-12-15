import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder, type LabResult } from '../../services/labWorkflowApi';
import { 
  ClipboardDocumentListIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserIcon,
  BeakerIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DoctorStats {
  pendingOrders: number;
  completedResults: number;
  criticalResultsCount: number;
}

const DoctorLabOverview: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<LabOrder[]>([]);
  const [criticalResults, setCriticalResults] = useState<LabResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const [overviewResponse, ordersResponse, criticalResponse] = await Promise.all([
        labWorkflowAPI.getDoctorOverview(),
        labWorkflowAPI.getLabOrders({ limit: 10 }),
        labWorkflowAPI.getCriticalResults()
      ]);

      setStats(overviewResponse.data.statistics);
      setRecentOrders(ordersResponse.data.labOrders);
      setCriticalResults(criticalResponse.data.criticalResults);
    } catch (error) {
      console.error('Error loading overview data:', error);
      toast.error('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  const addToMedicalRecord = async (resultId: number) => {
    const interpretation = prompt('Enter your clinical interpretation:');
    const clinicalNotes = prompt('Enter clinical notes (optional):');
    
    if (!interpretation) return;

    try {
      await labWorkflowAPI.addResultToMedicalRecord(resultId, interpretation, clinicalNotes || undefined);
      toast.success('Result added to medical record successfully');
      loadOverviewData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to medical record');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'text-red-600';
      case 'urgent': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Lab Overview
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Welcome back, Dr. {user?.lastName}! Here's your lab activity summary.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 text-yellow-600">
                <ClipboardDocumentListIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Pending Orders
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.pendingOrders}
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
                  {stats.completedResults}
                </p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-red-100 text-red-600">
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Critical Results
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.criticalResultsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Results Alert */}
      {criticalResults.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Critical Results Requiring Immediate Attention
              </h3>
            </div>
            <span className="text-sm text-red-600 dark:text-red-400">
              {criticalResults.length} result{criticalResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {criticalResults.slice(0, 3).map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {result.labOrder?.patient?.firstName} {result.labOrder?.patient?.lastName}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Order #{result.labOrder?.orderNumber} - {result.labOrder?.testCodes.join(', ')}
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    Result Date: {new Date(result.resultDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedResult(result)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => addToMedicalRecord(result.id)}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Add to Record
                  </button>
                </div>
              </div>
            ))}
            {criticalResults.length > 3 && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                +{criticalResults.length - 3} more critical results - View all in Results tab
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Recent Lab Orders
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Your latest lab test orders
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No recent orders
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Order #{order.orderNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(order.priority)}`}>
                          {order.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        <UserIcon className="h-4 w-4 inline mr-1" />
                        {order.patient?.firstName} {order.patient?.lastName}
                      </p>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        <BeakerIcon className="h-4 w-4 inline mr-1" />
                        {order.testCodes.join(', ')}
                      </p>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        <ClockIcon className="h-4 w-4 inline mr-1" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Quick Actions
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Common lab workflow tasks
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <button
                onClick={() => {
                  // This would typically navigate to create order tab
                  toast.info('Navigate to Create Order tab to order new tests');
                }}
                className={`w-full p-4 text-left rounded-lg border-2 border-dashed transition-colors ${
                  theme === 'dark' 
                    ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700' 
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Create New Lab Order
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Order lab tests for your patients
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  toast.info('Navigate to Results tab to review completed results');
                }}
                className={`w-full p-4 text-left rounded-lg border-2 border-dashed transition-colors ${
                  theme === 'dark' 
                    ? 'border-gray-600 hover:border-green-500 hover:bg-gray-700' 
                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Review Lab Results
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Review and interpret completed results
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  toast.info('Navigate to Test Catalog to browse available tests');
                }}
                className={`w-full p-4 text-left rounded-lg border-2 border-dashed transition-colors ${
                  theme === 'dark' 
                    ? 'border-gray-600 hover:border-purple-500 hover:bg-gray-700' 
                    : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center">
                  <BeakerIcon className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Browse Test Catalog
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      View available tests and pricing
                    </p>
                  </div>
                </div>
              </button>

              {stats && stats.criticalResultsCount > 0 && (
                <button
                  onClick={() => {
                    toast.info('Navigate to Results tab and filter by Critical Values');
                  }}
                  className="w-full p-4 text-left rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">
                        Review Critical Results
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {stats.criticalResultsCount} critical result{stats.criticalResultsCount !== 1 ? 's' : ''} need attention
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Critical Result - Order #{selectedResult.labOrder?.orderNumber}
                </h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Patient Info */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Name:</strong> {selectedResult.labOrder?.patient?.firstName} {selectedResult.labOrder?.patient?.lastName}</p>
                      <p><strong>Email:</strong> {selectedResult.labOrder?.patient?.email}</p>
                    </div>
                    <div>
                      <p><strong>Tests:</strong> {selectedResult.labOrder?.testCodes.join(', ')}</p>
                      <p><strong>Result Date:</strong> {new Date(selectedResult.resultDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Critical Values */}
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold mb-2 text-red-800 dark:text-red-200 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Critical Values
                  </h4>
                  <div className="space-y-2">
                    {selectedResult.criticalValues.map((critical: any, index: number) => (
                      <div key={index} className="p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
                        <p className="font-medium text-red-800 dark:text-red-200">
                          {critical.test}: {critical.value} {critical.unit}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Critical threshold: {critical.threshold} | Reference: {critical.reference}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result Data */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Complete Results
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(selectedResult.resultData).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {key}:
                        </span>
                        <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interpretation */}
                {selectedResult.interpretation && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Lab Interpretation
                    </h4>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {selectedResult.interpretation}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      addToMedicalRecord(selectedResult.id);
                      setSelectedResult(null);
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Add to Medical Record
                  </button>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className={`px-6 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabOverview;