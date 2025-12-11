import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Beaker, 
  Upload, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import axios from '../../lib/axios';
import { QuickActions } from '../../components/common/QuickActions';
import { useNavigationService } from '../../services/navigationService';

export const LabDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigationService = useNavigationService(navigate);
  const [stats, setStats] = useState({
    pendingTests: 0,
    completedTests: 0,
    todayTests: 0,
    totalPatients: 0
  });
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabData();
  }, []);

  const fetchLabData = async () => {
    try {
      console.log('🔍 Fetching lab data...');
      
      // Fetch lab results
      const labResponse = await axios.get('/lab-results');
      if (labResponse.data.success) {
        const results = labResponse.data.data || [];
        console.log(`Found ${results.length} lab results`);
        setLabResults(results.slice(0, 5)); // Show latest 5
        
        const today = new Date().toDateString();
        setStats({
          pendingTests: results.filter((r: any) => r.status === 'pending').length,
          completedTests: results.filter((r: any) => r.status === 'completed').length,
          todayTests: results.filter((r: any) => 
            new Date(r.createdAt).toDateString() === today
          ).length,
          totalPatients: new Set(results.map((r: any) => r.patientWalletAddress || r.patientId)).size
        });
      }
    } catch (error) {
      console.error('Failed to fetch lab data:', error);
      setLabResults([]);
      setStats({
        pendingTests: 0,
        completedTests: 0,
        todayTests: 0,
        totalPatients: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      name: 'Pending Tests', 
      value: stats.pendingTests, 
      icon: Clock, 
      color: 'yellow',
      description: 'Awaiting processing'
    },
    { 
      name: 'Completed Today', 
      value: stats.todayTests, 
      icon: CheckCircle, 
      color: 'green',
      description: 'Tests completed today'
    },
    { 
      name: 'Total Completed', 
      value: stats.completedTests, 
      icon: Beaker, 
      color: 'blue',
      description: 'All time completed'
    },
    { 
      name: 'Patients Served', 
      value: stats.totalPatients, 
      icon: Users, 
      color: 'purple',
      description: 'Unique patients'
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="healthcare-gradient rounded-2xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white bg-opacity-10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white bg-opacity-10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-3xl font-bold mb-2"
          >
            Welcome, {user?.profileData?.fullName || 'Lab Technician'}!
          </motion.h1>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100 text-lg"
          >
            Manage lab tests, upload results, and track patient samples from your lab dashboard.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.1,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-6 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { duration: 2, repeat: Infinity }
                }}
                className={`w-12 h-12 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </motion.div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                className="text-3xl font-bold text-gray-900"
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Lab Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="medical-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Lab Tests</h2>
          <a href="/lab-results" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
            View All →
          </a>
        </div>

        {labResults.length > 0 ? (
          <div className="space-y-4">
            {labResults.map((result: any, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ x: 5 }}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center">
                  <Beaker className="w-6 h-6 text-medical-600" />
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{result.testName}</h4>
                  <p className="text-sm text-gray-600">Patient: {result.patientId}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.status === 'completed' ? 'bg-green-100 text-green-800' :
                      result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-gray-400 hover:text-medical-600 transition-colors"
                    title="View Details"
                  >
                    <FileText className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Beaker className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No lab tests found</p>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <QuickActions
        actions={navigationService.getLabQuickActions()}
        delay={0.7}
      />
    </motion.div>
  );
};