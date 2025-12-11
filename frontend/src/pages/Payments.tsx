import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, CheckCircle, XCircle, Clock, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import axios from '../lib/axios';
import { PaymentModal } from '../components/modals/PaymentModal';

interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    
    // Set up auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing payments...');
      fetchPayments();
    }, 10000);

    return () => clearInterval(interval);
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
        // No payments found
        setPayments([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error);
      // Set empty array on error
      setPayments([]);
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
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInitiatePayment = () => {
    // Open payment modal instead of directly creating payment
    setShowPaymentModal(true);
  };

  const handleCompletePayment = async (payment: Payment) => {
    setActionLoading(payment.id);
    try {
      console.log('✅ Completing payment:', payment.id);
      
      // First, try to verify the payment with the provider
      console.log('🔍 Verifying with provider:', payment.paymentMethod, payment.transactionId);
      
      const verifyResponse = await axios.get(`/payments/verify?txRef=${payment.transactionId}&provider=${payment.paymentMethod}`);
      
      console.log('📊 Verification response:', verifyResponse.data);
      
      if (verifyResponse.data.success && verifyResponse.data.status === 'completed') {
        console.log('✅ Payment verified and completed with provider');
        alert('✅ Payment verified and completed successfully!');
        fetchPayments(); // Refresh the list
      } else {
        // Ask user if they want to manually mark as completed
        const manualConfirm = confirm(
          'Payment verification with provider failed or is still pending.\n\n' +
          'Do you want to manually mark this payment as completed?\n\n' +
          'Only do this if you have confirmed the payment was successful.'
        );
        
        if (manualConfirm) {
          const updateResponse = await axios.patch(`/payments/${payment.id}/status`, {
            status: 'completed'
          });
          
          if (updateResponse.data.success) {
            console.log('✅ Payment manually marked as completed');
            alert('✅ Payment manually marked as completed!');
            fetchPayments(); // Refresh the list
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to complete payment:', error);
      
      // More detailed error handling
      if (error.response?.status === 404) {
        alert('❌ Payment not found. It may have been already processed.');
      } else if (error.response?.status === 400) {
        alert('❌ Payment verification failed: ' + (error.response?.data?.message || 'Invalid payment data'));
      } else {
        alert('❌ Failed to complete payment. Please check your connection and try again.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to cancel this payment?')) {
      return;
    }

    setActionLoading(paymentId);
    try {
      console.log('❌ Cancelling payment:', paymentId);
      
      const response = await axios.patch(`/payments/${paymentId}/status`, {
        status: 'cancelled'
      });

      if (response.data.success) {
        console.log('✅ Payment cancelled successfully');
        alert('Payment cancelled successfully!');
        fetchPayments(); // Refresh the list
      }
    } catch (error) {
      console.error('❌ Failed to cancel payment:', error);
      alert('Failed to cancel payment. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryPayment = async (payment: Payment) => {
    setActionLoading(payment.id);
    try {
      console.log('🔄 Retrying payment:', payment.id);
      
      // Create a new payment with the same details
      const response = await axios.post('/payments/initialize', {
        patientWallet: user?.walletAddress,
        appointmentId: payment.appointmentId,
        amount: payment.amount,
        provider: payment.paymentMethod,
        email: user?.email || 'patient@elitetena.com',
        firstName: user?.fullName?.split(' ')[0] || 'Patient',
        lastName: user?.fullName?.split(' ')[1] || user?.profileData?.lastName || 'User',
        phoneNumber: '+251911000000',
        description: `Retry payment for ${payment.appointment?.reason || 'Healthcare Service'}`
      });

      if (response.data.success) {
        console.log('✅ Payment retry initialized successfully');
        
        // Open the payment window
        const { checkoutUrl } = response.data.data;
        if (checkoutUrl) {
          window.open(checkoutUrl, 'payment', 'width=600,height=700,scrollbars=yes,resizable=yes');
        }
        
        alert('Payment retry initialized! Please complete the payment in the opened window.');
        
        // Cancel the old failed payment (without loading state to avoid conflict)
        await axios.patch(`/payments/${payment.id}/status`, { status: 'cancelled' });
        
        // Refresh payments to show the new payment
        fetchPayments();
      }
    } catch (error) {
      console.error('❌ Failed to retry payment:', error);
      alert('Failed to retry payment. Please try again.');
    } finally {
      setActionLoading(null);
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

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchPayments();
            }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </motion.button>
          
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Auto-refreshing every 10s</span>
          </div>
        </div>
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

                {/* Action buttons based on payment status */}
                {payment.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCompletePayment(payment)}
                      disabled={actionLoading === payment.id}
                      className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Complete Payment
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCancelPayment(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Cancel
                    </motion.button>
                  </div>
                )}

                {payment.status === 'failed' && (
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRetryPayment(payment)}
                      disabled={actionLoading === payment.id}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                      Retry Payment
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCancelPayment(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === payment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Cancel
                    </motion.button>
                  </div>
                )}

                {payment.status === 'completed' && (
                  <div className="mt-4">
                    <span className="text-sm text-green-600 font-medium">✅ Payment completed successfully</span>
                  </div>
                )}

                {payment.status === 'cancelled' && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-600 font-medium">❌ Payment was cancelled</span>
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

      {/* Payment Modal for new payments */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        appointmentId="" // Direct payment, no appointment
        amount={500} // Default amount, user can change in modal
        description="Direct Healthcare Payment"
        onPaymentSuccess={(paymentData) => {
          console.log('✅ Payment successful:', paymentData);
          setShowPaymentModal(false);
          fetchPayments(); // Refresh payments list
        }}
      />
    </motion.div>
  );
};