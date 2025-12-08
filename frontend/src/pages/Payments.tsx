import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import axios from '../lib/axios';

interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  appointment?: {
    id: string;
    appointmentDate: string;
    reason: string;
  };
}

export const Payments: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching payments for:', user.walletAddress);
      const response = await axios.get(`/payments?patientWallet=${user.walletAddress}`);
      
      if (response.data.success) {
        setPayments(response.data.data);
        console.log('✅ Loaded', response.data.data.length, 'payments');
      } else {
        // Demo data fallback
        setPayments([
          {
            id: 'demo-1',
            appointmentId: 'apt-1',
            amount: 500,
            currency: 'ETB',
            status: 'completed',
            paymentMethod: 'chapa',
            transactionId: 'TXN-123456',
            createdAt: '2024-01-15T10:00:00Z',
            appointment: {
              id: 'apt-1',
              appointmentDate: '2024-01-20T10:00:00Z',
              reason: 'General Checkup'
            }
          },
          {
            id: 'demo-2',
            appointmentId: 'apt-2',
            amount: 750,
            currency: 'ETB',
            status: 'pending',
            paymentMethod: 'telebirr',
            transactionId: 'TXN-789012',
            createdAt: '2024-01-18T14:30:00Z',
            appointment: {
              id: 'apt-2',
              appointmentDate: '2024-01-22T14:30:00Z',
              reason: 'Consultation'
            }
          }
        ]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error);
      // Demo data fallback
      setPayments([
        {
          id: 'demo-1',
          appointmentId: 'apt-1',
          amount: 500,
          currency: 'ETB',
          status: 'completed',
          paymentMethod: 'chapa',
          transactionId: 'TXN-123456',
          createdAt: '2024-01-15T10:00:00Z',
          appointment: {
            id: 'apt-1',
            appointmentDate: '2024-01-20T10:00:00Z',
            reason: 'General Checkup'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInitiatePayment = async () => {
    try {
      console.log('💳 Initiating payment for user:', user?.walletAddress);
      
      const response = await axios.post('/payments/initialize', {
        patientWallet: user?.walletAddress,
        doctorWallet: '0xDOCTOR12345678901234567890123456789012345',
        amount: 500,
        provider: 'chapa',
        email: user?.email || 'patient@elitetena.com',
        firstName: user?.fullName?.split(' ')[0] || 'Patient',
        lastName: user?.fullName?.split(' ')[1] || 'User',
        phoneNumber: '+251911000000'
      });

      if (response.data.success) {
        console.log('✅ Payment initialized successfully');
        alert('Payment initialized successfully! (Demo mode - auto-completing in 5 seconds)');
        
        // For demo - refresh payments after 6 seconds
        setTimeout(() => {
          fetchPayments();
        }, 6000);
      }
    } catch (error) {
      console.error('❌ Failed to initiate payment:', error);
      alert('Failed to initiate payment. Please try again.');
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Manage your healthcare payments</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleInitiatePayment}
          className="healthcare-button flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Make Payment
        </motion.button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="medical-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)} ETB
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="medical-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)} ETB
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="medical-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-medical-600">{payments.length}</p>
            </div>
            <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-medical-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
        <div className="space-y-4">
          <AnimatePresence>
            {payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 5 }}
                className="medical-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center"
                    >
                      <CreditCard className="w-6 h-6 text-medical-600" />
                    </motion.div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          Payment for {payment.appointment?.reason || 'Healthcare Service'}
                        </h4>
                        {getStatusIcon(payment.status)}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Transaction ID: {payment.transactionId}</p>
                        <p>Payment Method: {payment.paymentMethod.toUpperCase()}</p>
                        <p>Date: {new Date(payment.createdAt).toLocaleDateString()}</p>
                        {payment.appointment && (
                          <p>Appointment: {new Date(payment.appointment.appointmentDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {payment.amount} {payment.currency}
                    </p>
                  </div>
                </div>

                {payment.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Complete Payment
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Empty State */}
      {payments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600 mb-4">You haven't made any payments yet</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleInitiatePayment}
            className="healthcare-button"
          >
            Make Your First Payment
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};