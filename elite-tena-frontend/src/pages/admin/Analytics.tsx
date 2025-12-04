import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, Activity, Calendar, 
  FileText, Pill, FlaskConical, BarChart3,
  ArrowUp, ArrowDown, Clock
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Mock data - replace with real API calls
  const metrics = [
    {
      title: 'Total Registrations',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Active Users',
      value: '892',
      change: '+8.2%',
      trend: 'up',
      icon: Activity,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Appointments',
      value: '456',
      change: '-3.1%',
      trend: 'down',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Prescriptions',
      value: '789',
      change: '+15.3%',
      trend: 'up',
      icon: Pill,
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Lab Results',
      value: '234',
      change: '+5.7%',
      trend: 'up',
      icon: FlaskConical,
      color: 'from-indigo-500 to-blue-500'
    },
    {
      title: 'Medical Records',
      value: '1,567',
      change: '+9.4%',
      trend: 'up',
      icon: FileText,
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const roleDistribution = [
    { role: 'Patients', count: 892, percentage: 72, color: 'bg-blue-500' },
    { role: 'Doctors', count: 156, percentage: 13, color: 'bg-green-500' },
    { role: 'Pharmacists', count: 89, percentage: 7, color: 'bg-purple-500' },
    { role: 'Lab Technicians', count: 67, percentage: 5, color: 'bg-orange-500' },
    { role: 'Admins', count: 30, percentage: 3, color: 'bg-red-500' }
  ];

  const recentActivity = [
    { action: 'New patient registered', user: 'john@example.com', time: '2 minutes ago', type: 'success' },
    { action: 'Doctor updated profile', user: 'dr.smith@hospital.com', time: '15 minutes ago', type: 'info' },
    { action: 'Lab result uploaded', user: 'lab@hospital.com', time: '1 hour ago', type: 'success' },
    { action: 'Prescription issued', user: 'dr.jones@hospital.com', time: '2 hours ago', type: 'success' },
    { action: 'User account deactivated', user: 'admin@hospital.com', time: '3 hours ago', type: 'warning' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">System performance and usage statistics</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg"
        >
          <BarChart3 className="w-8 h-8 text-white" />
        </motion.div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm w-fit">
        {(['7d', '30d', '90d', '1y'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === range
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {range === '7d' && 'Last 7 Days'}
            {range === '30d' && 'Last 30 Days'}
            {range === '90d' && 'Last 90 Days'}
            {range === '1y' && 'Last Year'}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {metric.change}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
            <div className="text-sm text-gray-600">{metric.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Role Distribution */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">User Distribution by Role</h2>
        <div className="space-y-4">
          {roleDistribution.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{item.role}</span>
                <span className="text-sm text-gray-600">{item.count} users ({item.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full ${item.color} rounded-full`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === 'success' ? 'bg-green-500' :
                activity.type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{activity.action}</div>
                <div className="text-sm text-gray-600">{activity.user}</div>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Growth Trend</h2>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-600">Chart.js Integration Ready</p>
              <p className="text-sm text-gray-500 mt-2">Run: npm install chart.js react-chartjs-2</p>
            </div>
          </div>
        </div>

        {/* Appointments Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Appointments Overview</h2>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
            <div className="text-center">
              <Calendar className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600">Appointment Analytics</p>
              <p className="text-sm text-gray-500 mt-2">Monthly trends and patterns</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-8 h-8" />
          <h2 className="text-xl font-bold">System Performance</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold">99.9%</div>
            <div className="text-green-100">Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-bold">45ms</div>
            <div className="text-green-100">Response Time</div>
          </div>
          <div>
            <div className="text-3xl font-bold">0</div>
            <div className="text-green-100">Critical Issues</div>
          </div>
          <div>
            <div className="text-3xl font-bold">1.2GB</div>
            <div className="text-green-100">Memory Usage</div>
          </div>
        </div>
      </div>
    </div>
  );
};
