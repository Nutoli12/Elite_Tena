import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Pill, 
  Clock,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Shield
} from 'lucide-react';
import axios from '../../lib/axios';
import { QRCodeScanner } from '../../components/pharmacist/QRCodeScanner';
import { AccessiblePrescriptions } from '../../components/pharmacist/AccessiblePrescriptions';

export const PharmacyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingPrescriptions: 0,
    dispensedToday: 0,
    totalDispensed: 0,
    lowStockItems: 0
  });
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showAccessible, setShowAccessible] = useState(false);

  useEffect(() => {
    fetchPharmacyData();
  }, []);

  const fetchPharmacyData = async () => {
    try {
      console.log('🔍 Fetching pharmacy data...');
      
      // Fetch prescriptions
      const prescriptionsResponse = await axios.get('/prescriptions');
      if (prescriptionsResponse.data.success) {
        const allPrescriptions = prescriptionsResponse.data.data || [];
        console.log(`Found ${allPrescriptions.length} prescriptions`);
        setPrescriptions(allPrescriptions.slice(0, 5)); // Show latest 5
        
        const today = new Date().toDateString();
        setStats({
          pendingPrescriptions: allPrescriptions.filter((p: any) => p.status === 'active').length,
          dispensedToday: allPrescriptions.filter((p: any) => 
            p.status === 'dispensed' && new Date(p.updatedAt || p.createdAt).toDateString() === today
          ).length,
          totalDispensed: allPrescriptions.filter((p: any) => p.status === 'dispensed').length,
          lowStockItems: 0 // Will be implemented with inventory system
        });
      }
    } catch (error) {
      console.error('Failed to fetch pharmacy data:', error);
      setPrescriptions([]);
      setStats({
        pendingPrescriptions: 0,
        dispensedToday: 0,
        totalDispensed: 0,
        lowStockItems: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      name: 'Pending Prescriptions', 
      value: stats.pendingPrescriptions, 
      icon: Clock, 
      color: 'yellow',
      description: 'Awaiting dispensing'
    },
    { 
      name: 'Dispensed Today', 
      value: stats.dispensedToday, 
      icon: CheckCircle, 
      color: 'green',
      description: 'Medications dispensed'
    },
    { 
      name: 'Total Dispensed', 
      value: stats.totalDispensed, 
      icon: Pill, 
      color: 'blue',
      description: 'All time dispensed'
    },
    { 
      name: 'Low Stock Items', 
      value: stats.lowStockItems, 
      icon: AlertTriangle, 
      color: 'red',
      description: 'Need restocking'
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600'
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
            Welcome, {(user as any)?.profileData?.fullName || user?.name || 'Pharmacist'}!
          </motion.h1>
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-blue-100 text-lg"
          >
            Manage prescriptions, dispense medications, and track inventory from your pharmacy dashboard.
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

      {/* Recent Prescriptions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="medical-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Prescriptions</h2>
          <a href="/prescriptions" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
            View All →
          </a>
        </div>

        {prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription: any, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ x: 5 }}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center">
                  <Pill className="w-6 h-6 text-medical-600" />
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{prescription.medication}</h4>
                  <p className="text-sm text-gray-600">Patient: {prescription.patientId}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>{new Date(prescription.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' :
                      prescription.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {prescription.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {prescription.status === 'active' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                      title="Dispense"
                    >
                      Dispense
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Pill className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No prescriptions found</p>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.button
            onClick={() => setShowScanner(!showScanner)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:border-purple-500 hover:bg-purple-100 transition-all"
          >
            <QrCode className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Scan QR Code</span>
          </motion.button>

          <motion.button
            onClick={() => setShowAccessible(!showAccessible)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:border-blue-500 hover:bg-blue-100 transition-all"
          >
            <Shield className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Accessible Rx</span>
          </motion.button>

          {[
            { name: 'Check Inventory', icon: '📦', href: '/prescriptions' },
            { name: 'Reports', icon: '📊', href: '/prescriptions' },
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

      {/* QR Code Scanner Section */}
      {showScanner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <QRCodeScanner
            onSuccess={(prescription) => {
              console.log('Access granted to prescription:', prescription);
              fetchPharmacyData();
              setShowScanner(false);
              setShowAccessible(true);
            }}
          />
        </motion.div>
      )}

      {/* Accessible Prescriptions Section */}
      {showAccessible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <AccessiblePrescriptions />
        </motion.div>
      )}
    </motion.div>
  );
};