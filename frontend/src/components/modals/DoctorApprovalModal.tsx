import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Clock, DollarSign, User, Calendar } from 'lucide-react';
import axios from '../../lib/axios';

interface DoctorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onApproved: () => void;
}

export const DoctorApprovalModal: React.FC<DoctorApprovalModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onApproved
}) => {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`/appointments/${appointment.id}/approve`, {
        doctorWallet: appointment.doctorWalletAddress,
        paymentDetails: {
          method: 'telebirr',
          accountNumber: '0912345678',
          accountName: 'Dr. ' + appointment.doctorDetails?.profileData?.name || appointment.doctorDetails?.profileData?.fullName || (appointment.doctorDetails?.profileData?.firstName && appointment.doctorDetails?.profileData?.lastName ? `${appointment.doctorDetails.profileData.firstName} ${appointment.doctorDetails.profileData.lastName}` : appointment.doctorDetails?.user?.name || appointment.doctorDetails?.name || 'Doctor'),
          amount: appointment.fee
        }
      });

      if (response.data.success) {
        alert('Appointment approved! Patient will receive payment details.');
        onApproved();
        onClose();
      }
    } catch (error) {
      console.error('Failed to approve appointment:', error);
      alert('Failed to approve appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/appointments/${appointment.id}/reject`, {
        doctorWallet: appointment.doctorWalletAddress,
        reason: rejectionReason
      });

      if (response.data.success) {
        alert('Appointment rejected. Patient has been notified.');
        onApproved();
        onClose();
      }
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      alert('Failed to reject appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Appointment Approval</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Appointment Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold text-gray-900">
                    {appointment.patientDetails?.user?.profileData?.fullName || 'Patient'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(appointment.appointmentDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Service Type</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {appointment.serviceType?.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="font-semibold text-gray-900">{appointment.fee} ETB</p>
                </div>
              </div>

              {appointment.reason && (
                <div>
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="text-gray-900">{appointment.reason}</p>
                </div>
              )}
            </div>

            {/* Rejection Form */}
            {showRejectForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <label className="block text-sm font-medium text-gray-700">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason..."
                />
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!showRejectForm ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Appointment
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Appointment
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Rejection
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
