import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface QCMetrics {
  date: string;
  technician: string;
  totalOrdersProcessed: number;
  averageTurnaroundTime: string;
  rejectionRate: string;
  criticalValueReportingTime: string;
  patientIdentificationErrors: number;
  resultAmendmentRate: string;
}

interface EquipmentStatus {
  name: string;
  status: 'operational' | 'maintenance' | 'down';
  lastCalibration: string;
  nextCalibration: string;
  qcPassRate: string;
  maintenanceLog?: string;
}

interface QCIncident {
  id: string;
  type: string;
  orderId: string;
  reason: string;
  actionTaken: string;
  resolved: boolean;
  timestamp: string;
}

const QualityControlDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<QCMetrics | null>(null);
  const [equipment, setEquipment] = useState<EquipmentStatus[]>([]);
  const [incidents, setIncidents] = useState<QCIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQCData();
  }, []);

  const loadQCData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockMetrics: QCMetrics = {
        date: new Date().toISOString().split('T')[0],
        technician: user?.fullName || 'Technician',
        totalOrdersProcessed: 15,
        averageTurnaroundTime: '3.2 hours',
        rejectionRate: '2.1%',
        criticalValueReportingTime: '8.7 minutes',
        patientIdentificationErrors: 0,
        resultAmendmentRate: '0.3%'
      };

      const mockEquipment: EquipmentStatus[] = [
        {
          name: 'Abbott Architect ci4100',
          status: 'operational',
          lastCalibration: '2024-01-14',
          nextCalibration: '2024-01-21',
          qcPassRate: '99.8%'
        },
        {
          name: 'Sysmex XN-1000',
          status: 'operational',
          lastCalibration: '2024-01-13',
          nextCalibration: '2024-01-20',
          qcPassRate: '99.5%'
        },
        {
          name: 'Olympus CX43 Microscope',
          status: 'maintenance',
          lastCalibration: '2024-01-10',
          nextCalibration: '2024-01-17',
          qcPassRate: '98.9%',
          maintenanceLog: 'Weekly cleaning in progress'
        },
        {
          name: 'Siemens Clinitek Novus',
          status: 'operational',
          lastCalibration: '2024-01-12',
          nextCalibration: '2024-01-19',
          qcPassRate: '99.2%'
        }
      ];

      const mockIncidents: QCIncident[] = [
        {
          id: 'INC-2024-001',
          type: 'SAMPLE_REJECTION',
          orderId: 'LAB-244-008',
          reason: 'HEMOLYZED_SAMPLE',
          actionTaken: 'REQUESTED_RECOLLECTION',
          resolved: true,
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: 'INC-2024-002',
          type: 'DELTA_FLAG',
          orderId: 'LAB-244-012',
          reason: 'SIGNIFICANT_CHANGE_FROM_PREVIOUS',
          actionTaken: 'SUPERVISOR_REVIEW_PENDING',
          resolved: false,
          timestamp: '2024-01-15T14:15:00Z'
        }
      ];

      setMetrics(mockMetrics);
      setEquipment(mockEquipment);
      setIncidents(mockIncidents);
    } catch (error) {
      console.error('Error loading QC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMetricTrend = (value: string) => {
    // Mock trend calculation - in real app, compare with historical data
    const numValue = parseFloat(value);
    if (value.includes('%')) {
      return numValue < 5 ? 'good' : numValue < 10 ? 'warning' : 'bad';
    }
    return 'neutral';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'good':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-600" />;
      case 'bad':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowTrendingUpIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📊 Quality Control Dashboard
        </h2>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Daily QC Report - {metrics?.date} | Technician: {metrics?.technician}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Orders Processed
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.totalOrdersProcessed}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Avg Turnaround
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.averageTurnaroundTime}
              </p>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600" />
              {getTrendIcon('good')}
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Rejection Rate
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.rejectionRate}
              </p>
            </div>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              {getTrendIcon(getMetricTrend(metrics?.rejectionRate || '0%'))}
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Critical Alert Time
              </p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.criticalValueReportingTime}
              </p>
            </div>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              {getTrendIcon('good')}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Status */}
      <div className={`rounded-lg shadow mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🔧 Equipment Status
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.map((item, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {item.name}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      Last Calibration:
                    </span>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {item.lastCalibration}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      Next Calibration:
                    </span>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {item.nextCalibration}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      QC Pass Rate:
                    </span>
                    <span className="text-green-600 font-medium">
                      {item.qcPassRate}
                    </span>
                  </div>
                  {item.maintenanceLog && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                      <strong>Maintenance:</strong> {item.maintenanceLog}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className={`rounded-lg shadow mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ⚠️ Recent Incidents & Actions
          </h3>
        </div>
        <div className="p-4">
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No incidents reported today
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 border-l-4 rounded-r-lg ${
                    incident.resolved 
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
                      : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {incident.id}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          incident.resolved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {incident.resolved ? 'RESOLVED' : 'PENDING'}
                        </span>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Type:</strong> {incident.type.replace(/_/g, ' ')} | 
                        <strong> Order:</strong> {incident.orderId}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Reason:</strong> {incident.reason.replace(/_/g, ' ')}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Action:</strong> {incident.actionTaken.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {new Date(incident.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📈 Performance Metrics
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Patient ID Errors
              </span>
              <span className={`font-bold ${
                metrics?.patientIdentificationErrors === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics?.patientIdentificationErrors}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Result Amendment Rate
              </span>
              <span className="font-bold text-blue-600">
                {metrics?.resultAmendmentRate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                QC Compliance
              </span>
              <span className="font-bold text-green-600">
                100%
              </span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              📋 Pending Actions
            </h3>
          </div>
          <div className="p-4">
            {incidents.filter(i => !i.resolved).length === 0 ? (
              <div className="text-center py-4">
                <CheckCircleIcon className="mx-auto h-8 w-8 text-green-400" />
                <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No pending actions
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.filter(i => !i.resolved).map((incident) => (
                  <div
                    key={incident.id}
                    className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {incident.type.replace(/_/g, ' ')}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Order: {incident.orderId}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityControlDashboard;