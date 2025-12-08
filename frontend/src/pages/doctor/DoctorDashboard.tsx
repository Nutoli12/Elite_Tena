import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import axios from '../../lib/axios';
import { PendingApprovals } from '../../components/doctor/PendingApprovals';
import { PaymentReceiptsReview } from '../../components/doctor/PaymentReceiptsReview';
import { PatientQueue } from '../../components/doctor/PatientQueue';
import { UpcomingAppointments } from '../../components/doctor/UpcomingAppointments';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayTotal: 0,
    completedToday: 0,
    pendingApprovals: 0,
    checkedInPatients: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorStats();
  }, [user]);

  const fetchDoctorStats = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching doctor stats for:', user.walletAddress);
      
      // Fetch doctor's appointments (not patient appointments!)
      const appointmentsResponse = await axios.get(`/appointments`, {
        params: {
          userRole: 'doctor',
          userId: user.walletAddress
        }
      });

      // Fetch pending approvals for premium services
      let pendingApprovals = 0;
      try {
        const approvalsResponse = await axios.get(`/premium-services/doctor/${user.walletAddress}/pending-approvals`);
        pendingApprovals = approvalsResponse.data.count || 0;
      } catch (error) {
        console.log('No pending approvals endpoint yet');
      }

      if (appointmentsResponse.data.success) {
        const appointments = appointmentsResponse.data.data;
        const today = new Date().toISOString().split('T')[0];
        
        const todayAppointments = appointments.filter((apt: any) => 
          apt.appointmentDate.startsWith(today)
        );
        
        const completedToday = todayAppointments.filter((apt: any) => 
          apt.status === 'completed'
        ).length;
        
        const checkedIn = todayAppointments.filter((apt: any) => 
          apt.checkInStatus === 'checked_in' || apt.checkInStatus === 'waiting'
        ).length;

        setStats({
          todayTotal: todayAppointments.length,
          completedToday: completedToday,
          pendingApprovals: pendingApprovals,
          checkedInPatients: checkedIn
        });
        
        console.log('✅ Doctor stats loaded:', {
          todayTotal: todayAppointments.length,
          completedToday,
          pendingApprovals,
          checkedInPatients: checkedIn
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch doctor stats:', error);
      setStats({
        todayTotal: 0,
        completedToday: 0,
        pendingApprovals: 0,
        checkedInPatients: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      name: 'Today\'s Appointments',
      value: stats.todayTotal,
      icon: Calendar,
      color: 'blue',
      description: 'Total scheduled today'
    },
    {
      name: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'green',
      description: 'Consultations finished'
    },
    {
      name: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'orange',
      description: 'Awaiting your review'
    },
    {
      name: 'Checked-In Patients',
      value: stats.checkedInPatients,
      icon: Users,
      color: 'purple',
      description: 'Waiting for consultation'
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
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
            Welcome, Dr. {user?.fullName || 'Doctor'}!
          </motion.h1>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100 text-lg"
          >
            Manage your patients, appointments, and consultations from your dashboard.
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

      {/* Main Content Grid - Pending Approvals, Payment Receipts & Patient Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="medical-card p-6"
        >
          <PendingApprovals />
        </motion.div>

        {/* Payment Receipts to Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="medical-card p-6"
        >
          <PaymentReceiptsReview />
        </motion.div>

        {/* Patient Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="medical-card p-6 lg:col-span-2"
        >
          <PatientQueue />
        </motion.div>
      </div>

      {/* Upcoming Appointments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mb-8"
      >
        <UpcomingAppointments />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'View Appointments', icon: '📅', href: '/appointments' },
            { name: 'Medical Records', icon: '📁', href: '/medical-records' },
            { name: 'Patient Access', icon: '🛡️', href: '/doctor/consent' },
            { name: 'Issue Prescription', icon: '💊', href: '/prescriptions' },
          ].map((action, index) => (
            <motion.a
              key={action.name}
              href={action.href}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + index * 0.1 }}
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