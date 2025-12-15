import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { labWorkflowAPI } from '../services/labWorkflowApi';
import { 
  BeakerIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Components
import LabTestCatalog from '../components/lab/LabTestCatalog';
import CreateLabOrder from '../components/lab/CreateLabOrder';
import LabOrdersList from '../components/lab/LabOrdersList';
import LabResultsList from '../components/lab/LabResultsList';
import TechnicianDashboard from '../components/lab/TechnicianDashboard';
import DoctorLabOverview from '../components/lab/DoctorLabOverview';
import PatientLabHistory from '../components/lab/PatientLabHistory';
import OrderReceptionDashboard from '../components/lab/OrderReceptionDashboard';
import SampleProcessingWorkflow from '../components/lab/SampleProcessingWorkflow';
import QualityControlDashboard from '../components/lab/QualityControlDashboard';
import AuditTrailViewer from '../components/lab/AuditTrailViewer';

const LabWorkflow: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load role-specific data
      if (user?.role === 'doctor') {
        const overview = await labWorkflowAPI.getDoctorOverview();
        setStats(overview.data.statistics);
      } else if (user?.role === 'lab_technician') {
        const dashboard = await labWorkflowAPI.getTechnicianDashboard();
        setStats(dashboard.data.statistics);
      } else if (user?.role === 'patient') {
        const history = await labWorkflowAPI.getPatientHistory();
        setStats(history.data.summary);
      }
    } catch (error) {
      console.error('Error loading lab workflow data:', error);
      toast.error('Failed to load lab workflow data');
    } finally {
      setLoading(false);
    }
  };

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'doctor':
        return [
          { id: 'overview', name: 'Overview', icon: ChartBarIcon },
          { id: 'create-order', name: 'Create Order', icon: ClipboardDocumentListIcon },
          { id: 'orders', name: 'Lab Orders', icon: BeakerIcon },
          { id: 'results', name: 'Results', icon: CheckCircleIcon },
          { id: 'catalog', name: 'Test Catalog', icon: UserGroupIcon }
        ];
      case 'lab_technician':
        return [
          { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
          { id: 'reception', name: 'Order Reception', icon: ClipboardDocumentListIcon },
          { id: 'processing', name: 'Sample Processing', icon: BeakerIcon },
          { id: 'results', name: 'Results', icon: CheckCircleIcon },
          { id: 'qc', name: 'Quality Control', icon: ExclamationTriangleIcon },
          { id: 'audit', name: 'Audit Trail', icon: ClockIcon },
          { id: 'catalog', name: 'Test Catalog', icon: UserGroupIcon }
        ];
      case 'patient':
        return [
          { id: 'history', name: 'My Results', icon: CheckCircleIcon },
          { id: 'orders', name: 'My Orders', icon: BeakerIcon }
        ];
      default:
        return [
          { id: 'catalog', name: 'Test Catalog', icon: UserGroupIcon }
        ];
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return user?.role === 'doctor' ? <DoctorLabOverview /> : null;
      case 'dashboard':
        return user?.role === 'lab_technician' ? <TechnicianDashboard /> : null;
      case 'reception':
        return user?.role === 'lab_technician' ? <OrderReceptionDashboard /> : null;
      case 'processing':
        return user?.role === 'lab_technician' ? <SampleProcessingWorkflow /> : null;
      case 'qc':
        return user?.role === 'lab_technician' ? <QualityControlDashboard /> : null;
      case 'audit':
        return user?.role === 'lab_technician' ? <AuditTrailViewer /> : null;
      case 'create-order':
        return user?.role === 'doctor' ? <CreateLabOrder onOrderCreated={loadInitialData} /> : null;
      case 'orders':
        return <LabOrdersList />;
      case 'results':
        return <LabResultsList />;
      case 'catalog':
        return <LabTestCatalog />;
      case 'history':
        return user?.role === 'patient' ? <PatientLabHistory /> : null;
      default:
        return <LabTestCatalog />;
    }
  };

  const getStatsCards = () => {
    if (!stats) return [];

    switch (user?.role) {
      case 'doctor':
        return [
          { title: 'Pending Orders', value: stats.pendingOrders, color: 'yellow' },
          { title: 'Completed Results', value: stats.completedResults, color: 'green' },
          { title: 'Critical Results', value: stats.criticalResultsCount, color: 'red' }
        ];
      case 'lab_technician':
        return [
          { title: 'Completed Today', value: stats.completedToday, color: 'green' },
          { title: 'Critical Results', value: stats.criticalResultsCount, color: 'red' }
        ];
      case 'patient':
        return [
          { title: 'Total Orders', value: stats.totalOrders, color: 'blue' },
          { title: 'Completed Results', value: stats.completedResults, color: 'green' },
          { title: 'Pending Orders', value: stats.pendingOrders, color: 'yellow' }
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const tabs = getTabsForRole();
  const statsCards = getStatsCards();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🧪 Lab Workflow System
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {user?.role === 'doctor' && 'Manage lab orders and review results'}
            {user?.role === 'lab_technician' && 'Process samples and upload results'}
            {user?.role === 'patient' && 'View your lab results and history'}
            {!user?.role && 'Browse available lab tests'}
          </p>
        </div>

        {/* Stats Cards */}
        {statsCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-full ${
                    stat.color === 'green' ? 'bg-green-100 text-green-600' :
                    stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                    stat.color === 'red' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {stat.color === 'red' ? <ExclamationTriangleIcon className="h-6 w-6" /> :
                     stat.color === 'green' ? <CheckCircleIcon className="h-6 w-6" /> :
                     <ChartBarIcon className="h-6 w-6" />}
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? theme === 'dark'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-blue-100 text-blue-700'
                      : theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default LabWorkflow;