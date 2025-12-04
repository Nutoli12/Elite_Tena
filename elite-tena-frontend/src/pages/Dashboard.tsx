import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Activity, Calendar, FileText, Pill } from 'lucide-react';
import axios from '../lib/axios';
import {
  HealthMetrics,
  MedicalRecordsPreview,
  UpcomingAppointments,
  RecentPrescriptions,
  LabResultsSummary,
  ConsentStatus
} from '../components/patient';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState([
    { name: t('medical_records'), value: '0', icon: FileText, color: 'blue' },
    { name: t('appointments'), value: '0', icon: Calendar, color: 'green' },
    { name: t('prescriptions'), value: '0', icon: Pill, color: 'purple' },
    { name: t('lab_results'), value: '0', icon: Activity, color: 'orange' },
  ]);

  useEffect(() => {
    fetchPatientStats();
  }, [user]);

  const fetchPatientStats = async () => {
    if (!user?.walletAddress) return;

    try {
      // Fetch patient's appointments
      const appointmentsResponse = await axios.get(`/appointments/patient/${user.walletAddress}`);
      const appointmentsCount = appointmentsResponse.data.success ? appointmentsResponse.data.data.length : 0;

      // Fetch patient's medical records
      const recordsResponse = await axios.get(`/medical-records/${user.walletAddress}`);
      const recordsCount = recordsResponse.data.success ? recordsResponse.data.data.length : 0;

      // Update stats
      setStats([
        { name: t('medical_records'), value: recordsCount.toString(), icon: FileText, color: 'blue' },
        { name: t('appointments'), value: appointmentsCount.toString(), icon: Calendar, color: 'green' },
        { name: t('prescriptions'), value: '0', icon: Pill, color: 'purple' },
        { name: t('lab_results'), value: '0', icon: Activity, color: 'orange' },
      ]);
    } catch (error) {
      console.error('Failed to fetch patient stats:', error);
      // Keep default values
    }
  };

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

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
            {t('welcome')}, {user?.fullName || 'User'}!
          </motion.h1>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100 text-lg"
          >
            Your health journey starts here. Access your medical records, book appointments, and manage your care.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
            </div>
          </motion.div>
        ))}
      </div>

      {/* Health Metrics */}
      <HealthMetrics />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <MedicalRecordsPreview />
          <UpcomingAppointments />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <RecentPrescriptions />
          <LabResultsSummary />
          <ConsentStatus />
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Book Appointment', icon: '📅', href: '/appointments' },
            { name: 'View Records', icon: '📁', href: '/medical-records' },
            { name: 'Prescriptions', icon: '💊', href: '/prescriptions' },
            { name: 'Lab Results', icon: '🧪', href: '/lab-results' },
          ].map((action, index) => (
            <motion.a
              key={action.name}
              href={action.href}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-medical-500 hover:bg-medical-50 transition-all"
            >
              <span className="text-3xl mb-2">{action.icon}</span>
              <span className="text-sm font-medium text-gray-700">{action.name}</span>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
