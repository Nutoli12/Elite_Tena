import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, DollarSign, Clock, User } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorApprovalModal } from '../modals/DoctorApprovalModal';

export const PendingApprovals: React.FC = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, [user]);

  const fetchPendingApprovals = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/appointments/pending-approval?doctorWallet=${user.walletAddress}`);
      if (response.data.success) {
        setPendingApprovals(response.data.data || []);
        console.log(`✅ Found ${response.data.count} pending approvals`);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowApprovalModal(true);
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
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-sm text-gray-600">
            {pendingApprovals.length} appointment{pendingApprovals.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      {pendingApprovals.length > 0 ? (
        <div className="space-y-3">
          {pendingApprovals.slice(0, 3).map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <h4 className="font-semibold text-gray-900">
                      {(appointment.patientDetails as any)?.user?.fullName || 'Patient'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                    </div>
                    <span className="font-semibold text-orange-600">{appointment.fee} Birr</span>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReview(appointment)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
              >
                Review
              </motion.button>
            </motion.div>
          ))}

          {pendingApprovals.length > 3 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              +{pendingApprovals.length - 3} more pending approval{pendingApprovals.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No pending approvals</p>
          <p className="text-sm mt-1">Paid appointments will appear here for your review</p>
        </div>
      )}

      {/* Approval Modal */}
      {selectedAppointment && (
        <DoctorApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onApproved={() => {
            fetchPendingApprovals();
          }}
        />
      )}
    </>
  );
};
