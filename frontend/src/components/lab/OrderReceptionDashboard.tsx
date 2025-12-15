import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { labWorkflowAPI, type LabOrder } from '../../services/labWorkflowApi';
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  UserIcon,
  BeakerIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface OrderReceptionDashboardProps {
  onOrderSelect?: (order: LabOrder) => void;
}

const OrderReceptionDashboard: React.FC<OrderReceptionDashboardProps> = ({ onOrderSelect }) => {
  const { theme } = useTheme();
  useAuth(); // Ensure user is authenticated
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    priority: 'all',
    assignment: 'unassigned'
  });
  const [sortBy, setSortBy] = useState('newest');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [acceptingOrder, setAcceptingOrder] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 15 seconds for real-time updates
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [filter, sortBy]);

  // Real-time notification when new orders arrive
  useEffect(() => {
    const checkForNewOrders = async () => {
      try {
        const response = await labWorkflowAPI.getLabOrders({ status: 'pending' });
        const newOrders = response.data.labOrders || [];
        
        // Check if there are new orders since last load
        const currentOrderIds = orders.map(o => o.id);
        const newOrdersCount = newOrders.filter(o => !currentOrderIds.includes(o.id)).length;
        
        if (newOrdersCount > 0) {
          toast.success(`🆕 ${newOrdersCount} new lab order${newOrdersCount > 1 ? 's' : ''} received!`, {
            duration: 5000,
            icon: '🧪'
          });
          loadOrders(); // Refresh the list
        }
      } catch (error) {
        // Silent fail for background checks
      }
    };

    // Check for new orders every 10 seconds
    const newOrderInterval = setInterval(checkForNewOrders, 10000);
    return () => clearInterval(newOrderInterval);
  }, [orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Apply filters
      if (filter.status !== 'all') params.status = filter.status;
      if (filter.priority !== 'all') params.priority = filter.priority;
      
      const response = await labWorkflowAPI.getLabOrders(params);
      let filteredOrders = response.data.labOrders || [];
      
      // Apply assignment filter
      if (filter.assignment === 'unassigned') {
        filteredOrders = filteredOrders.filter((order: LabOrder) => 
          ['pending', 'collected'].includes(order.status)
        );
      } else if (filter.assignment === 'assigned_to_me') {
        // This would need technician assignment tracking
        filteredOrders = filteredOrders.filter((order: LabOrder) => 
          order.status === 'processing'
        );
      }
      
      // Apply sorting
      filteredOrders.sort((a: LabOrder, b: LabOrder) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'priority':
            const priorityOrder = { 'stat': 3, 'urgent': 2, 'routine': 1 };
            return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                   (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
          case 'patient_name':
            const nameA = `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.trim();
            const nameB = `${b.patient?.firstName || ''} ${b.patient?.lastName || ''}`.trim();
            return nameA.localeCompare(nameB);
          default: // newest
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
      
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load lab orders');
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId: number) => {
    try {
      setAcceptingOrder(orderId);
      await labWorkflowAPI.updateLabOrderStatus(orderId, 'processing');
      toast.success('Order accepted and processing started');
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'stat':
        return {
          color: 'text-red-600 bg-red-100 border-red-200',
          icon: '🚨',
          label: 'CRITICAL',
          targetTime: '30 min'
        };
      case 'urgent':
        return {
          color: 'text-orange-600 bg-orange-100 border-orange-200',
          icon: '⚠️',
          label: 'URGENT',
          targetTime: '2 hours'
        };
      default:
        return {
          color: 'text-green-600 bg-green-100 border-green-200',
          icon: '✅',
          label: 'ROUTINE',
          targetTime: '24 hours'
        };
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMinutes / 1440)} days ago`;
    }
  };

  const unassignedOrders = orders.filter(order => ['pending', 'collected'].includes(order.status));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📥 Incoming Lab Orders Queue
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              🔄 Auto-refreshing every 15 seconds • 🆕 New order notifications enabled
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              unassignedOrders.length > 0 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            }`}>
              {unassignedOrders.length} Unassigned
            </div>
            <button
              onClick={loadOrders}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
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
          </select>
          
          <select
            value={filter.priority}
            onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Priority</option>
            <option value="stat">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
          
          <select
            value={filter.assignment}
            onChange={(e) => setFilter(prev => ({ ...prev, assignment: e.target.value }))}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="unassigned">Unassigned</option>
            <option value="assigned_to_me">Assigned to Me</option>
            <option value="all">All Orders</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
            <option value="patient_name">Patient Name</option>
          </select>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center">
            <div className="p-2 bg-red-100 text-red-600 rounded-full">
              🚨
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Critical
              </p>
              <p className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {orders.filter(o => o.priority === 'stat').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
              ⚠️
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Urgent
              </p>
              <p className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {orders.filter(o => o.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 text-green-600 rounded-full">
              ✅
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Routine
              </p>
              <p className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {orders.filter(o => o.priority === 'routine').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
              📊
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                Total Queue
              </p>
              <p className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {orders.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Orders Section */}
      <div className={`rounded-lg shadow mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🆕 UNASSIGNED ({unassignedOrders.length})
          </h3>
        </div>
        <div className="p-4">
          {unassignedOrders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No unassigned orders
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unassignedOrders.map((order) => {
                const priorityConfig = getPriorityConfig(order.priority);
                return (
                  <div
                    key={order.id}
                    className={`p-4 border-2 rounded-lg ${priorityConfig.color} ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                    } hover:shadow-lg transition-all duration-200 ${
                      order.priority === 'stat' ? 'animate-pulse' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{priorityConfig.icon}</span>
                          <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            #{order.orderNumber} | {priorityConfig.label}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              <UserIcon className="h-4 w-4 inline mr-1" />
                              Patient: {order.patient?.firstName} {order.patient?.lastName} 
                              {order.patient?.email && ` (${order.patient.email.split('@')[0]})`}
                            </p>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              <BeakerIcon className="h-4 w-4 inline mr-1" />
                              Tests: {order.testCodes.join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              Received: {getTimeElapsed(order.createdAt)} | ⏱️ Target: {priorityConfig.targetTime}
                            </p>
                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              Doctor: {order.doctor?.firstName} {order.doctor?.lastName}
                            </p>
                          </div>
                        </div>
                        
                        {order.specialInstructions && (
                          <div className={`p-2 rounded text-xs ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`}>
                            <strong>Special Instructions:</strong> {order.specialInstructions}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => acceptOrder(order.id)}
                          disabled={acceptingOrder === order.id}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {acceptingOrder === order.id ? 'Accepting...' : 'Accept & Prioritize'}
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => onOrderSelect?.(order)}
                          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                        >
                          Reassign
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
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
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Priority & Status */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Priority & Status
                      </h4>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityConfig(selectedOrder.priority).color}`}>
                          {getPriorityConfig(selectedOrder.priority).icon} {getPriorityConfig(selectedOrder.priority).label}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          selectedOrder.status === 'collected' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedOrder.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        Target Time: {getPriorityConfig(selectedOrder.priority).targetTime}
                      </p>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                        Elapsed: {getTimeElapsed(selectedOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Information */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Name:</strong> {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</p>
                      <p><strong>Email:</strong> {selectedOrder.patient?.email}</p>
                    </div>
                    <div>
                      <p><strong>Wallet:</strong> {selectedOrder.patientWalletAddress.slice(0, 10)}...{selectedOrder.patientWalletAddress.slice(-8)}</p>
                      <p><strong>MRN:</strong> {selectedOrder.patientWalletAddress.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Test Details */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Required Tests
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.testCodes.map((testCode, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
                        <span className="font-medium">{testCode}</span>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span>Sample: {selectedOrder.sampleType || 'Blood'}</span>
                          <span className="ml-4">Volume: 5.0 mL</span>
                          <span className="ml-4">Container: Lavender Top</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Doctor Information */}
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Ordering Physician
                  </h4>
                  <div className="text-sm">
                    <p><strong>Doctor:</strong> {selectedOrder.doctor?.firstName} {selectedOrder.doctor?.lastName}</p>
                    <p><strong>Email:</strong> {selectedOrder.doctor?.email}</p>
                    <p><strong>Specialty:</strong> Internal Medicine</p>
                  </div>
                </div>

                {/* Special Instructions */}
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

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {selectedOrder.status === 'collected' && (
                    <button
                      onClick={() => {
                        acceptOrder(selectedOrder.id);
                        setSelectedOrder(null);
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Accept & Start Processing
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
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

export default OrderReceptionDashboard;