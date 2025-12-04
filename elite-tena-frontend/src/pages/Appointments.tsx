import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, MapPin, Clock, Video, MoreVertical } from 'lucide-react';
import axios from '../lib/axios';
import type { Appointment } from '../types/healthcare';
import { BookAppointmentModal } from '../components/modals/BookAppointmentModal';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching appointments for:', user.walletAddress);
      const response = await axios.get(`/appointments/patient/${user.walletAddress}`);
      
      if (response.data.success) {
        const backendAppointments = response.data.data.map((apt: any) => ({
          id: apt.id.toString(),
          patientId: apt.patientWallet,
          doctorId: apt.doctorWallet,
          date: apt.appointmentDate.split('T')[0],
          time: new Date(apt.appointmentDate).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: 'in-person',
          location: 'Elite-Tena Healthcare',
          status: apt.status,
          reason: apt.reason || 'Consultation',
          notes: apt.notes
        }));
        
        setAppointments(backendAppointments);
        console.log('✅ Loaded', backendAppointments.length, 'appointments');
      } else {
        console.log('📝 No appointments found');
        setAppointments([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (appointmentData: any) => {
    try {
      console.log('📅 Booking appointment:', appointmentData);
      
      const response = await axios.post('/appointments', {
        patientWalletAddress: user?.walletAddress,
        doctorWalletAddress: appointmentData.doctorId,
        appointmentDate: `${appointmentData.date}T${appointmentData.time}:00`,
        reason: appointmentData.reason,
        duration: 30,
        fee: 100
      });

      if (response.data.success) {
        console.log('✅ Appointment booked successfully');
        fetchAppointments(); // Refresh the list
        alert('Appointment booked successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to book appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
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
                        <h4 className="font-semibold text-gray-900">{appointment.doctorId}</h4>
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

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      {appointment.type === 'telemedicine' && appointment.status === 'confirmed' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Reschedule
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </motion.button>
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

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSubmit={handleBookAppointment}
      />
    </motion.div>
  );
};
