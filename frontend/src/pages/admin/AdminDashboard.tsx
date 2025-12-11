import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserPlus, Activity, 
  Shield, Stethoscope, Pill,
  AlertCircle, CheckCircle
} from 'lucide-react';
import axios from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { QuickActions } from '../../components/common/QuickActions';
import { useNavigationService } from '../../services/navigationService';

interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  roles: {
    patients: number;
    doctors: number;
    pharmacists: number;
  };
  recentUsers: Array<{
    walletAddress: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const navigationService = useNavigationService(navigate);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('🔍 Fetching admin stats...');
      const response = await axios.get('/admin/stats');
      if (response.data.success) {
        console.log('✅ Admin stats loaded:', response.data.data);
        setStats(response.data.data);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        users: {
          total: 0,
          active: 0,
          inactive: 0
        },
        roles: {
          patients: 0,
          doctors: 0,
          pharmacists: 0
        },
        recentUsers: []
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: stats?.users.active || 0,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Patients',
      value: stats?.roles.patients || 0,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Doctors',
      value: stats?.roles.doctors || 0,
      icon: Stethoscope,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      title: 'Pharmacists',
      value: stats?.roles.pharmacists || 0,
      icon: Pill,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Inactive Users',
      value: stats?.users.inactive || 0,
      icon: AlertCircle,
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600'
    }
  ];



  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and management</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-16 h-16 bg-gradient-to-br from-medical-500 to-medical-600 rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Shield className="w-8 h-8 text-white" />
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${stat.color} text-white`}>
                Live
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stat.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">{stat.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions
        actions={navigationService.getAdminQuickActions()}
        columns={4}
        delay={0.6}
      />

      {/* Recent Users */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
          <button
            onClick={() => navigate('/admin/users')}
            className="text-medical-600 hover:text-medical-700 font-semibold text-sm"
          >
            View All →
          </button>
        </div>
        <div className="space-y-4">
          {stats?.recentUsers.slice(0, 5).map((user, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-medical-500 to-medical-600 flex items-center justify-center text-white font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-600">{user.walletAddress.substring(0, 10)}...</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'patient' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'pharmacist' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {user.role}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8" />
            <h3 className="text-xl font-bold">Custom Admin Panel</h3>
          </div>
          <p className="text-blue-100 mb-4">
            User-friendly interface for daily operations. Register staff, manage users, and view analytics.
          </p>
          <div className="text-sm text-blue-100">
            Current Location: /admin/dashboard
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8" />
            <h3 className="text-xl font-bold">AdminJS Panel</h3>
          </div>
          <p className="text-orange-100 mb-4">
            Technical database management tool. Direct access to all tables and data.
          </p>
          <button
            onClick={() => window.open('http://localhost:5000/admin', '_blank')}
            className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
          >
            Open AdminJS →
          </button>
        </div>
      </div>
    </div>
  );
};
