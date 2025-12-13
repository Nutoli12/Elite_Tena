import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, MapPin, Clock, Video, MoreVertical, DollarSign, Upload, QrCode, MessageSquare, Shield } from 'lucide-react';
import axios from '../lib/axios';
import type { Appointment } from '../types/healthcare';
import { BookAppointmentModal } from '../components/modals/BookAppointmentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { UploadReceiptModal } from '../components/modals/UploadReceiptModal';
import { PaymentModal } from '../components/modals/PaymentModal';
import { PaymentStatus } from '../components/payment/PaymentStatus';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { PatientNoteModal } from '../components/appointment/PatientNoteModal';
import { RescheduleModal } from '../components/appointment/RescheduleModal';
import { ConsentReviewModal } from '../components/appointment/ConsentReviewModal';
import { appointmentConsentAPI } from '../services/appointmentConsentAPI';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showPatientNoteModal, setShowPatientNoteModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentStatus, setConsentStatus] = useState<{[key: string]: any}>({});
  const [actionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleBookAppointment = async (appointmentData: any) => {
    try {
      console.log('📅 Booking appointment callback:', appointmentData);

      // If this is a payment completion callback, just refresh the list
      if (appointmentData.paymentCompleted) {
        console.log('✅ Payment completed, refreshing appointments list...');
        await fetchAppointments(); // Refresh the list
        setShowBookModal(false);
        return;
      }

      // Otherwise, create a new appointment (legacy flow)
      const response = await axios.post('/appointments', {
        patientWalletAddress: user?.walletAddress,
        doctorWalletAddress: appointmentData.doctorId,
        appointmentDate: `${appointmentData.date}T${appointmentData.time}:00`,
        reason: appointmentData.reason,
        notes: appointmentData.notes,
        duration: 30,
        serviceType: appointmentData.serviceType,
        fee: appointmentData.fee || 0,
        requiresApproval: appointmentData.requiresApproval || false,
        paymentRequired: appointmentData.paymentRequired || false
      });

      if (response.data.success) {
        console.log('✅ Appointment booked successfully');
        alert('Appointment booked successfully!');
        fetchAppointments(); // Refresh the list
        setShowBookModal(false);
      }
    } catch (error) {
      console.error('❌ Failed to book appointment:', error);
      // Don't show error for payment completion callbacks
      if (!appointmentData.paymentCompleted) {
        alert('Failed to book appointment. Please try again.');
      }
    }
  };

  const handlePaymentRequired = (appointmentId: string, amount: number) => {
    // Prevent opening multiple payment modals
    if (showPaymentModal) {
      return;
    }
    
    setSelectedAppointment({ id: appointmentId });
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('✅ Payment successful:', paymentData);
    setShowPaymentModal(false);
    fetchAppointments(); // Refresh to show updated payment status
    alert('Payment completed successfully!');
  };

  // Leave patient note handler (replaces cancel)
  const handleLeaveNote = () => {
    setShowPatientNoteModal(true);
  };

  const handleNoteSubmitted = () => {
    fetchAppointments();
    setShowPatientNoteModal(false);
    setSelectedAppointment(null);
    alert('Note saved successfully. Doctor has been notified.');
  };

  // Reschedule appointment handler (with 24-hour check)
  const handleRescheduleClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleRescheduled = () => {
    fetchAppointments();
    setShowRescheduleModal(false);
    setSelectedAppointment(null);
    alert('Appointment rescheduled successfully');
  };

  // Check consent status for appointments
  const checkConsentStatus = async (appointmentId: string) => {
    try {
      const result = await appointmentConsentAPI.checkConsent(appointmentId);
      setConsentStatus(prev => ({
        ...prev,
        [appointmentId]: result
      }));
    } catch (error) {
      console.error('Failed to check consent status:', error);
    }
  };

  const handleConsentDecision = () => {
    fetchAppointments();
    setShowConsentModal(false);
    setSelectedAppointment(null);
  };

  const fetchAppointments = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching patient appointments for:', user.walletAddress);

      // Fetch ONLY this patient's appointments (not doctor appointments!)
      const response = await axios.get('/appointments', {
        params: {
          userRole: 'patient',
          userId: user.walletAddress
        }
      });

      if (response.data.success) {
        const backendAppointments = response.data.data.map((apt: any) => ({
          id: apt.id.toString(),
          patientId: apt.patientWalletAddress,
          doctorId: apt.doctorWalletAddress, // Keep wallet for backend calls
          doctorName: apt.appointedWith?.name || apt.displayDoctor?.split(' (')[0] || 'Unknown Doctor', // Extract name from displayDoctor
          doctorSpecialization: apt.appointedWith?.specialization || apt.displayDoctor?.match(/\(([^)]+)\)/)?.[1] || 'General', // Extract specialty from displayDoctor
          displayDoctor: apt.displayDoctor || 'Unknown Doctor (General)', // Use the formatted displayDoctor from API
          date: apt.appointmentDate.split('T')[0],
          time: new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: apt.serviceType || 'in-person',
          location: apt.serviceType === 'videoCall' ? 'Video Call' : 'Elite-Tena Healthcare',
          status: apt.status,
          reason: apt.reason || 'Consultation',
          notes: apt.notes,
          requiresApproval: apt.requiresApproval,
          approvalStatus: apt.approvalStatus,
          paymentStatus: apt.paymentStatus,
          fee: apt.fee
        }));

        setAppointments(backendAppointments);
        console.log('✅ Loaded', backendAppointments.length, 'patient appointments');
        
        // Check consent status for each appointment
        backendAppointments.forEach(apt => {
          if (apt.paymentStatus === 'confirmed' || apt.paymentStatus === 'paid') {
            checkConsentStatus(apt.id);
          }
        });
      } else {
        console.log('📝 No appointments found');
        setAppointments([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch patient appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">{t('appointments')}</h1>
          <p className="text-gray-600 mt-1">Manage your healthcare appointments</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowBookModal(true)}
          className="healthcare-button flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </motion.button>
      </div>

      {/* Calendar View Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="medical-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">January 2024</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Calendar view coming soon</p>
        </div>
      </motion.div>

      {/* Upcoming Appointments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
        <div className="space-y-4">
          <AnimatePresence>
            {appointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 5 }}
                className="medical-card p-6"
              >
                <div className="flex items-start space-x-4">
                  {/* Date Badge */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex-shrink-0 w-14 h-14 bg-medical-50 rounded-lg flex flex-col items-center justify-center border border-medical-200"
                  >
                    <span className="text-sm font-bold text-medical-600">
                      {new Date(appointment.date).getDate()}
                    </span>
                    <span className="text-xs text-medical-500">
                      {new Date(appointment.date).toLocaleString('en', { month: 'short' })}
                    </span>
                  </motion.div>

                  {/* Appointment Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.displayDoctor}</h4>
                        <p className="text-sm text-gray-600">{appointment.reason}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {appointment.type === 'telemedicine' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                        <span>{appointment.location}</span>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <strong>Note:</strong> {appointment.notes}
                      </div>
                    )}

                    {/* Enhanced Payment Status */}
                    <div className="mt-3">
                      <PaymentStatus
                        appointmentId={appointment.id}
                        onPaymentRequired={(amount) => handlePaymentRequired(appointment.id, amount)}
                      />
                    </div>

                    {/* Consent Status */}
                    {(appointment.paymentStatus === 'confirmed' || appointment.paymentStatus === 'paid') && (
                      <div className="mt-3">
                        {consentStatus[appointment.id] ? (
                          <div className={`p-3 rounded-lg border ${
                            consentStatus[appointment.id].hasConsent 
                              ? 'bg-green-50 border-green-200' 
                              : consentStatus[appointment.id].status === 'requested'
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  {consentStatus[appointment.id].hasConsent 
                                    ? '✅ Consent Granted' 
                                    : consentStatus[appointment.id].status === 'requested'
                                    ? '⏳ Consent Requested'
                                    : '🔒 Consent Required'}
                                </span>
                              </div>
                              {consentStatus[appointment.id].status === 'requested' && (
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowConsentModal(true);
                                  }}
                                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                                >
                                  Review
                                </button>
                              )}
                            </div>
                            {consentStatus[appointment.id].reason && (
                              <p className="text-xs text-gray-600 mt-1">
                                {consentStatus[appointment.id].reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Shield className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">Checking consent status...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Payment Actions */}
                      {appointment.approvalStatus === 'approved' && appointment.paymentStatus === 'pending' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (!showPaymentModal) {
                                setSelectedAppointment(appointment);
                                setPaymentAmount(appointment.fee || 0);
                                setShowPaymentModal(true);
                              }
                            }}
                            disabled={showPaymentModal}
                            className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <DollarSign className="w-4 h-4" />
                            Pay Now ({appointment.fee} ETB)
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowUploadModal(true);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Receipt
                          </motion.button>
                        </>
                      )}

                      {/* QR Code for confirmed appointments */}
                      {(appointment.paymentStatus === 'confirmed' || appointment.fee === 0) && appointment.status === 'scheduled' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowQRCode(appointment.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <QrCode className="w-4 h-4" />
                          Show QR Code
                        </motion.button>
                      )}

                      {/* Chat Button - Available after payment confirmed */}
                      {(appointment.paymentStatus === 'confirmed' || (appointment.serviceType === 'chat' && appointment.approvalStatus === 'approved')) && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.location.href = `/messages?userId=${appointment.doctorId}`}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chat with Doctor
                        </motion.button>
                      )}

                      {/* Video Call Button - For video appointments after payment confirmed */}
                      {appointment.serviceType === 'videoCall' && appointment.paymentStatus === 'confirmed' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.location.href = `/messages?userId=${appointment.doctorId}&startCall=true`}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </motion.button>
                      )}

                      {/* Legacy Video Call (for old telemedicine appointments) */}
                      {appointment.type === 'telemedicine' && appointment.status === 'confirmed' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.location.href = `/messages?userId=${appointment.doctorId}&startCall=true`}
                          className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </motion.button>
                      )}

                      {/* New No-Cancel System Actions */}
                      {appointment.status !== 'cancelled' && appointment.status !== 'completed' && !appointment.notes?.includes('patient_noted') && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRescheduleClick(appointment)}
                            disabled={actionLoading === appointment.id}
                            className="border border-blue-300 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            Reschedule
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              handleLeaveNote();
                            }}
                            disabled={actionLoading === appointment.id}
                            className="border border-orange-300 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 disabled:opacity-50 flex items-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Leave Note
                          </motion.button>
                        </>
                      )}
                      
                      {/* Show status for appointments with notes */}
                      {appointment.notes?.includes('patient_noted') && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm font-medium">Note sent to doctor</span>
                        </div>
                      )}
                      {appointment.status === 'cancelled' && (
                        <span className="text-gray-400 text-sm italic">Cancelled</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Empty State */}
      {appointments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments scheduled</h3>
          <p className="text-gray-600 mb-4">Book your first appointment to get started</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBookModal(true)}
            className="healthcare-button"
          >
            Book Appointment
          </motion.button>
        </motion.div>
      )}

      {/* Modals */}
      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSubmit={handleBookAppointment}
      />

      {selectedAppointment && (
        <>
          <PaymentDetailsModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedAppointment(null);
            }}
            appointmentId={selectedAppointment.id}
            onUploadReceipt={() => {
              setShowPaymentModal(false);
              setShowUploadModal(true);
            }}
          />

          <UploadReceiptModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setSelectedAppointment(null);
            }}
            appointmentId={selectedAppointment.id}
            onUploaded={() => {
              fetchAppointments();
            }}
          />
        </>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRCode(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeDisplay appointmentId={showQRCode} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQRCode(null)}
              className="mt-4 w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* New Reschedule Modal with 24-hour check */}
      {selectedAppointment && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onRescheduled={handleRescheduled}
        />
      )}

      {/* New Patient Note Modal */}
      {selectedAppointment && (
        <PatientNoteModal
          isOpen={showPatientNoteModal}
          onClose={() => {
            setShowPatientNoteModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onNoteSubmitted={handleNoteSubmitted}
        />
      )}

      {/* Payment Modal */}
      {selectedAppointment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          amount={paymentAmount}
          description={`Healthcare consultation payment for appointment with ${selectedAppointment.displayDoctor || selectedAppointment.doctorName || 'Doctor'}`}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Consent Review Modal */}
      {selectedAppointment && (
        <ConsentReviewModal
          isOpen={showConsentModal}
          onClose={() => {
            setShowConsentModal(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          patientWalletAddress={user?.walletAddress || ''}
          onConsentDecision={handleConsentDecision}
        />
      )}
    </motion.div>
  );
};
