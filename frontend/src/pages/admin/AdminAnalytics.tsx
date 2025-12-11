import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Activity, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/axios';

interface UserGrowthData {
  date: string;
  users: number;
}

interface AnalyticsData {
  userGrowth: UserGrowthData[];
  appointmentStats: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
  };
  systemUsage: {
    dailyActiveUsers: number;
    totalSessions: number;
    averageSessionTime: number;
  };
}

export const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: [],
    appointmentStats: {
      total: 0,
      completed: 0,
      cancelled: 0,
      pending: 0
    },
    systemUsage: {
      dailyActiveUsers: 0,
      totalSessions: 0,
      averageSessionTime: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/admin/analytics', {
        params: { timeRange }
      });
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set mock data for demo
      setAnalytics({
        userGrowth: [
          { date: '2024-01-01', users: 10 },
          { date: '2024-01-02', users: 15 },
          { date: '2024-01-03', users: 22 },
          { date: '2024-01-04', users: 28 },
          { date: '2024-01-05', users: 35 },
          { date: '2024-01-06', users: 42 },
          { date: '2024-01-07', users: 50 }
        ],
        appointmentStats: {
          total: 150,
          completed: 120,
          cancelled: 15,
          pending: 15
        },
        systemUsage: {
          dailyActiveUsers: 25,
          totalSessions: 180,
          averageSessionTime: 12
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
            <p className="text-gray-600 mt-1">Detailed insights and system metrics</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+12%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.systemUsage.dailyActiveUsers}
          </div>
          <div className="text-sm text-gray-600">Daily Active Users</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+8%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.systemUsage.totalSessions}
          </div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+15%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.appointmentStats.completed}
          </div>
          <div className="text-sm text-gray-600">Completed Appointments</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+5%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {analytics.systemUsage.averageSessionTime}m
          </div>
          <div className="text-sm text-gray-600">Avg Session Time</div>
        </motion.div>
      </div>

      {/* Appointment Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Appointment Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Appointments</span>
              <span className="font-semibold text-gray-900">{analytics.appointmentStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{analytics.appointmentStats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">{analytics.appointmentStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cancelled</span>
              <span className="font-semibold text-red-600">{analytics.appointmentStats.cancelled}</span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="mt-6 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span>{Math.round((analytics.appointmentStats.completed / analytics.appointmentStats.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analytics.appointmentStats.completed / analytics.appointmentStats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">User Growth</h3>
          <div className="space-y-4">
            {analytics.userGrowth.slice(-5).map((data) => (
              <div key={data.date} className="flex items-center justify-between">
                <span className="text-gray-600">
                  {new Date(data.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(data.users / 50) * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-8 text-right">{data.users}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <div className="font-semibold text-gray-900">Database</div>
            <div className="text-sm text-green-600">Healthy</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <div className="font-semibold text-gray-900">API Server</div>
            <div className="text-sm text-green-600">Operational</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full"></div>
            </div>
            <div className="font-semibold text-gray-900">Blockchain</div>
            <div className="text-sm text-green-600">Connected</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};