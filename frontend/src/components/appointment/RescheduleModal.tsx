import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from '../../lib/axios';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onRescheduled: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onRescheduled
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    if (isOpen && appointment) {
      checkRescheduleEligibility();
    }
  }, [isOpen, appointment]);

  const checkRescheduleEligibility = async () => {
    try {
      setCheckingEligibility(true);
      const response = await axios.get(`/appointments/${appointment.id}/reschedule-check`);
      setEligibility(response.data.data);
    } catch (err: any) {
      setError('Failed to check reschedule eligibility');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDate || !newTime) {
      setError('Please select a new date and time');
      return;
    }

    const newDateTime = new Date(`${newDate}T${newTime}`);
    
    // Check if new date is in the future
    if (newDateTime <= new Date()) {
      setError('New appointment date must be in the future');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.patch(`/appointments/${appointment.id}/reschedule`, {
        newDate: newDateTime.toISOString(),
        reason: reason.trim() || 'Patient requested reschedule',
        patientWallet: appointment.patientId || appointment.patientWalletAddress
      });

      if (response.data.success) {
        onRescheduled();
        onClose();
        resetForm();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewDate('');
    setNewTime('');
    setReason('');
    setError('');
  };

  if (!isOpen) return null;

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reschedule Appointment</h2>
              <p className="text-sm text-gray-600">Choose a new date and time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {checkingEligibility ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking reschedule eligibility...</p>
            </div>
          ) : !eligibility?.canReschedule ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cannot Reschedule</h3>
              <p className="text-gray-600 mb-4">
                {eligibility?.message || 'Reschedule deadline has passed (24 hours before appointment)'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You can leave a note instead to inform your doctor.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Current Appointment Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Current Appointment</span>
                </div>
                <p className="text-sm text-gray-700">
                  {new Date(appointment.appointmentDate).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Dr. {appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor'}
                </p>
              </div>

              {/* Eligibility Status */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Reschedule Available</h3>
                    <p className="text-sm text-green-800">
                      You have {eligibility.hoursUntilAppointment.toFixed(1)} hours remaining
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Deadline: {new Date(eligibility.rescheduleDeadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reschedule Form */}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      min={minDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Time *
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rescheduling (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why do you need to reschedule?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newDate || !newTime}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Rescheduling...' : 'Reschedule'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};