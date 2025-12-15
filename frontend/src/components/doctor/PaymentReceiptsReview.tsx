import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, DollarSign, Clock, User, CheckCircle, XCircle, Eye, X, ExternalLink } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../services/modalService';

export const PaymentReceiptsReview: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingReceipts();
  }, [user]);

  const fetchPendingReceipts = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      // Fetch appointments with uploaded receipts (paymentStatus = 'paid')
      const response = await axios.get('/appointments', {
        params: {
          userRole: 'doctor',
          userId: user.walletAddress
        }
      });

      if (response.data.success) {
        // Filter for appointments with uploaded receipts awaiting confirmation
        const pendingReceipts = (response.data.data || []).filter(
          (apt: any) => apt.paymentStatus === 'paid' && apt.paymentReceiptUrl
        );
        setReceipts(pendingReceipts);
        console.log(`✅ Found ${pendingReceipts.length} receipts to review`);
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (appointmentId: string) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`/appointments/${appointmentId}/confirm-payment`, {
        doctorWallet: user?.walletAddress
      });

      if (response.data.success) {
        Modal.error('Payment confirmed! Patient can now chat with you.', 'Alert');
        fetchPendingReceipts(); // Refresh list
        setShowReceiptModal(false);
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      Modal.error('Failed to confirm payment', 'Alert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (appointmentId: string) => {
    const reason = prompt('Please provide a reason for rejecting this payment:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const response = await axios.post(`/appointments/${appointmentId}/reject-payment`, {
        doctorWallet: user?.walletAddress,
        reason
      });

      if (response.data.success) {
        Modal.error('Payment rejected. Patient has been notified.', 'Alert');
        fetchPendingReceipts(); // Refresh list
        setShowReceiptModal(false);
      }
    } catch (error) {
      console.error('Failed to reject payment:', error);
      Modal.error('Failed to reject payment', 'Alert');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full mx-auto"
        />
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Receipt className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Payment Receipts</h2>
          <p className="text-sm text-gray-600">
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} awaiting verification
          </p>
        </div>
      </div>

      {receipts.length > 0 ? (
        <div className="space-y-3">
          {receipts.slice(0, 3).map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-green-50 border-2 border-green-200 p-4 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <h4 className="font-semibold text-gray-900">
                        {appointment.patientDetails?.user?.profileData?.fullName || 'Patient'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                      </div>
                      <span className="font-semibold text-green-600">{appointment.fee} Birr</span>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowReceiptModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Receipt
                </motion.button>
              </div>
            </motion.div>
          ))}

          {receipts.length > 3 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              +{receipts.length - 3} more receipt{receipts.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No receipts to review</p>
          <p className="text-sm mt-1">Payment receipts will appear here for verification</p>
        </div>
      )}

      {/* Receipt Review Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Payment Receipt Review</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Appointment Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Patient</p>
                      <p className="font-semibold">
                        {selectedAppointment.patientDetails?.user?.profileData?.fullName || 'Patient'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date & Time</p>
                      <p className="font-semibold">
                        {new Date(selectedAppointment.appointmentDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Service Type</p>
                      <p className="font-semibold capitalize">
                        {selectedAppointment.serviceType?.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Amount</p>
                      <p className="font-semibold text-green-600">{selectedAppointment.fee} Birr</p>
                    </div>
                  </div>
                </div>

                {/* Payment Receipt */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Payment Receipt</h3>
                  {selectedAppointment.paymentReceiptUrl ? (
                    <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
                      <img
                        src={
                          selectedAppointment.paymentReceiptUrl.startsWith('ipfs://')
                            ? `https://gateway.pinata.cloud/ipfs/${selectedAppointment.paymentReceiptUrl.replace('ipfs://', '')}`
                            : selectedAppointment.paymentReceiptUrl.startsWith('Qm')
                            ? `https://gateway.pinata.cloud/ipfs/${selectedAppointment.paymentReceiptUrl}`
                            : selectedAppointment.paymentReceiptUrl
                        }
                        alt="Payment Receipt"
                        className="w-full h-auto"
                        onError={(e) => {
                          console.error('Failed to load receipt image');
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EReceipt Not Available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No receipt uploaded</p>
                    </div>
                  )}

                  {selectedAppointment.paymentReceiptUrl && (
                    <a
                      href={
                        selectedAppointment.paymentReceiptUrl.startsWith('ipfs://')
                          ? `https://gateway.pinata.cloud/ipfs/${selectedAppointment.paymentReceiptUrl.replace('ipfs://', '')}`
                          : selectedAppointment.paymentReceiptUrl.startsWith('Qm')
                          ? `https://gateway.pinata.cloud/ipfs/${selectedAppointment.paymentReceiptUrl}`
                          : selectedAppointment.paymentReceiptUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in new tab
                    </a>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleConfirmPayment(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirm Payment
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRejectPayment(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Payment
                  </motion.button>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  After confirming payment, the patient will be able to chat with you.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
