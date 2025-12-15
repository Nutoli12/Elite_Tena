import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder } from '../../services/labWorkflowApi';
import LabResultCreation from './LabResultCreation';
import LabWorksheet from './LabWorksheet';
import { 
  BeakerIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DashboardStats {
  completedToday: number;
  criticalResultsCount: number;
}

interface WorkQueue {
  pendingOrders: LabOrder[];
  processingOrders: LabOrder[];
  pendingCount: number;
  processingCount: number;
}

const TechnicianDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workQueue, setWorkQueue] = useState<WorkQueue | null>(null);
  const [criticalResults, setCriticalResults] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showResultCreation, setShowResultCreation] = useState(false);
  const [orderForResultCreation, setOrderForResultCreation] = useState<LabOrder | null>(null);
  const [showWorksheetCreation, setShowWorksheetCreation] = useState(false);
  const [orderForWorksheet, setOrderForWorksheet] = useState<LabOrder | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, queueResponse, criticalResponse] = await Promise.all([
        labWorkflowAPI.getTechnicianDashboard(),
        labWorkflowAPI.getTechnicianQueue(),
        labWorkflowAPI.getCriticalResults()
      ]);

      setStats(dashboardResponse.data.statistics);
      setWorkQueue(dashboardResponse.data.workQueue);
      setCriticalResults(criticalResponse.data.criticalResults);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await labWorkflowAPI.updateLabOrderStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const openResultCreation = (order: LabOrder) => {
    setOrderForResultCreation(order);
    setShowResultCreation(true);
  };

  const handleResultCreated = (orderId: number) => {
    setShowResultCreation(false);
    setOrderForResultCreation(null);
    loadDashboardData();
    toast.success('Results processed and released to doctor successfully!');
  };

  const openWorksheetCreation = (order: LabOrder) => {
    setOrderForWorksheet(order);
    setShowWorksheetCreation(true);
  };

  const handleWorksheetCreated = (worksheetId: number) => {
    setShowWorksheetCreation(false);
    setOrderForWorksheet(null);
    loadDashboardData();
    toast.success('Lab worksheet created successfully!');
    
    // After worksheet is created, open result creation
    if (orderForWorksheet) {
      setTimeout(() => {
        openResultCreation(orderForWorksheet);
      }, 500);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'text-red-600 bg-red-100';
      case 'urgent': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Lab Technician Dashboard
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Welcome back, {user?.firstName}! Here's your work queue and daily summary.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Completed Today
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.completedToday}
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
                  Pending Queue
                </p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {workQueue?.pendingCount || 0}
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
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Critical Results Requiring Attention
            </h3>
          </div>
          <div className="space-y-2">
            {criticalResults.slice(0, 3).map((result: any) => (
              <div key={result.id} className="text-sm text-red-700 dark:text-red-300">
                Patient: {result.labOrder?.patient?.firstName} {result.labOrder?.patient?.lastName} - 
                Order #{result.labOrder?.orderNumber}
              </div>
            ))}
            {criticalResults.length > 3 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                +{criticalResults.length - 3} more critical results
              </p>
            )}
          </div>
        </div>
      )}

      {/* Work Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Orders */}
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Pending Orders ({workQueue?.pendingCount || 0})
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Samples ready for processing
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {workQueue?.pendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No pending orders
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workQueue?.pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Order #{order.orderNumber}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
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
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'processing');
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Start Processing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Processing Orders */}
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Processing Orders ({workQueue?.processingCount || 0})
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Currently being processed
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {workQueue?.processingOrders.length === 0 ? (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No orders in processing
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workQueue?.processingOrders.map((order) => (
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
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
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => openWorksheetCreation(order)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        📋 CREATE WORKSHEET
                      </button>
                      <button
                        onClick={() => openResultCreation(order)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        🧪 ENTER RESULTS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Order Details - #{selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Patient Information
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</p>
                    <p><strong>Email:</strong> {selectedOrder.patient?.email}</p>
                    <p><strong>Wallet:</strong> {selectedOrder.patientWalletAddress}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Order Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Tests:</strong> {selectedOrder.testCodes.join(', ')}</p>
                    <p><strong>Priority:</strong> {selectedOrder.priority}</p>
                    <p><strong>Sample Type:</strong> {selectedOrder.sampleType}</p>
                    <p><strong>Status:</strong> {selectedOrder.status}</p>
                    <p><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedOrder.specialInstructions && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Special Instructions
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedOrder.specialInstructions}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedOrder.status === 'collected' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'processing');
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Start Processing
                    </button>
                  )}
                  {selectedOrder.status === 'processing' && (
                    <>
                      <button
                        onClick={() => {
                          openWorksheetCreation(selectedOrder);
                          setSelectedOrder(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mr-2"
                      >
                        📋 CREATE WORKSHEET
                      </button>
                      <button
                        onClick={() => {
                          openResultCreation(selectedOrder);
                          setSelectedOrder(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        🧪 ENTER RESULTS
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Worksheet Creation Modal */}
      {showWorksheetCreation && orderForWorksheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <LabWorksheet
              selectedOrder={orderForWorksheet}
              onWorksheetCreated={handleWorksheetCreated}
              onCancel={() => {
                setShowWorksheetCreation(false);
                setOrderForWorksheet(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Lab Result Creation Modal */}
      {showResultCreation && orderForResultCreation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <LabResultCreation
              selectedOrder={orderForResultCreation}
              onResultCreated={handleResultCreated}
              onCancel={() => {
                setShowResultCreation(false);
                setOrderForResultCreation(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;