import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import axios from '../../lib/axios';

interface PatientNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onNoteSubmitted: () => void;
}

export const PatientNoteModal: React.FC<PatientNoteModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onNoteSubmitted
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setError('Please provide a reason for not attending');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`/appointments/${appointment.id}/leave-note`, {
        note: note.trim(),
        patientWallet: appointment.patientId || appointment.patientWalletAddress
      });

      if (response.data.success) {
        onNoteSubmitted();
        onClose();
        setNote('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Leave a Note</h2>
              <p className="text-sm text-gray-600">Let your doctor know you can't attend</p>
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
          {/* Appointment Info */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Appointment Details</span>
            </div>
            <p className="text-sm text-blue-800">
              {new Date(appointment.appointmentDate).toLocaleString()}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Dr. {appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor'}
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Important Notice</h3>
                <p className="text-sm text-yellow-800">
                  • You cannot cancel this appointment
                </p>
                <p className="text-sm text-yellow-800">
                  • Payment will not be refunded
                </p>
                <p className="text-sm text-yellow-800">
                  • Doctor will be notified of your note
                </p>
                <p className="text-sm text-yellow-800">
                  • This helps protect doctor's time
                </p>
              </div>
            </div>
          </div>

          {/* Note Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for not attending *
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Please explain why you cannot attend this appointment..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Be specific to help your doctor understand your situation
              </p>
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
                disabled={loading || !note.trim()}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Leave Note'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};