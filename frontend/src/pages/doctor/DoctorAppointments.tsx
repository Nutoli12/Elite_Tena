import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Video, MapPin, MessageSquare, MoreVertical, CheckCircle, XCircle, Eye, Phone, FileText, Users, TrendingUp } from 'lucide-react';
import axios from '../../lib/axios';
import { PatientInfoCard } from '../../components/doctor/PatientInfoCard';
import { DoctorQueue } from '../../components/doctor/DoctorQueue';
import { AppointmentActions } from '../../components/doctor/AppointmentActions';
import { ConsentRequestButton } from '../../components/appointment/ConsentRequestButton';

export const DoctorAppointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'queue'>('queue');

  useEffect(() => {
    fetchDoctorSchedule();
  }, [user]);

  const fetchDoctorSchedule = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching doctor schedule for:', user.walletAddress);
      
      // Fetch ONLY this doctor's appointments (patients scheduled with this doctor)
      const response = await axios.get('/appointments', {
        params: {
          userRole: 'doctor',
          userId: user.walletAddress
        }
      });

      if (response.data.success) {
        const doctorAppointments = response.data.data || [];
        
        // Sort by appointment date
        doctorAppointments.sort((a: any, b: any) => 
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
        );

        setAppointments(doctorAppointments);
        console.log(`✅ Loaded ${doctorAppointments.length} appointments in doctor's schedule`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch doctor schedule:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return appointments.filter(apt => apt.appointmentDate.startsWith(today));
      case 'upcoming':
        return appointments.filter(apt => 
          new Date(apt.appointmentDate) > now && apt.status !== 'completed' && apt.status !== 'cancelled'
        );
      case 'completed':
        return appointments.filter(apt => apt.status === 'completed');
      default:
        return appointments;
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return <Video className="w-4 h-4 text-blue-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <MapPin className="w-4 h-4 text-purple-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusBadge = (apt: any) => {
    if (apt.approvalStatus === 'pending') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending Approval</span>;
    }
    if (apt.approvalStatus === 'approved' && apt.paymentStatus === 'pending') {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Awaiting Payment</span>;
    }
    if (apt.paymentStatus === 'paid') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Payment Pending Confirmation</span>;
    }
    if (apt.checkInStatus === 'checked_in') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Checked In</span>;
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>{apt.status}</span>;
  };

  const handleAppointmentAction = async (action: string, appointment: any) => {
    const patientName = appointment.patientDetails?.name || 
                       appointment.patientUser?.profileData?.fullName || 
                       'Unknown Patient';
    
    switch (action) {
      case 'emergency_alert':
        showWarning(
          `Emergency alert has been sent for patient: ${patientName}. Medical staff have been notified.`,
          '🚨 Emergency Alert Sent'
        );
        break;
      case 'pre_consultation_notes':
        const notes = prompt('Enter pre-consultation notes:');
        if (notes) {
          // TODO: Save notes to appointment
          showSuccess('Pre-consultation notes have been saved successfully!', 'Notes Saved');
        }
        break;
      case 'call_patient':
        showInfo(
          `Calling ${patientName}. Please wait while we connect you.`,
          '📞 Calling Patient'
        );
        break;
      case 'reschedule':
        navigate(`/appointments/reschedule/${appointment.id}`);
        break;
      case 'view_details':
        showInfo(
          `Patient: ${patientName}\nDate: ${new Date(appointment.appointmentDate).toLocaleString()}\nReason: ${appointment.reason || 'N/A'}\nStatus: ${appointment.status}\nWorkflow State: ${appointment.workflowState || 'N/A'}`,
          'Appointment Details'
        );
        break;
      case 'cancel':
        if (window.confirm('Are you sure you want to cancel this appointment?')) {
          try {
            await axios.delete(`/appointments/${appointment.id}`);
            showSuccess('Appointment has been cancelled successfully!', 'Appointment Cancelled');
            fetchDoctorSchedule();
          } catch (error) {
            console.error('Cancel error:', error);
            showError('Failed to cancel appointment. Please try again.', 'Cancellation Failed');
          }
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const filteredAppointments = getFilteredAppointments();

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
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-600 mt-1">Manage your appointments and patient schedule</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('queue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'queue'
                  ? 'bg-medical-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Queue View
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-medical-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              List View
            </motion.button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'completed', label: 'Completed' }
            ].map((filterOption) => (
              <motion.button
                key={filterOption.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterOption.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'queue' ? (
        <DoctorQueue 
          appointments={appointments}
          onPatientSelect={(appointment) => navigate(`/comprehensive-consultation/${appointment.id}`)}
        />
      ) : (
        <>
          {/* Calendar View Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="medical-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
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

          {/* Enhanced Appointments List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {filter === 'all' ? 'All Appointments' : 
               filter === 'today' ? 'Today\'s Appointments' :
               filter === 'upcoming' ? 'Upcoming Appointments' :
               'Completed Appointments'} ({filteredAppointments.length})
            </h2>
            
            <div className="space-y-6">
              <AnimatePresence>
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="medical-card p-6"
                  >
                    <div className="space-y-6">
                      {/* Enhanced Patient Information */}
                      <PatientInfoCard 
                        appointment={appointment} 
                        showVitals={true}
                      />

                      {/* Consent Management */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Patient Consent</h4>
                        <ConsentRequestButton
                          appointment={appointment}
                          onConsentRequested={fetchDoctorSchedule}
                          className="w-full"
                        />
                      </div>

                      {/* Enhanced Action Buttons */}
                      <AppointmentActions 
                        appointment={appointment}
                        onAction={handleAppointmentAction}
                      />

                      {/* Appointment Timeline */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Appointment Timeline</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Scheduled:</span>
                            <span className="font-medium">
                              {new Date(appointment.appointmentDate).toLocaleString()}
                            </span>
                          </div>
                          {appointment.checkedInAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Checked In:</span>
                              <span className="font-medium text-green-600">
                                {new Date(appointment.checkedInAt).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          {appointment.consultationStartedAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Consultation Started:</span>
                              <span className="font-medium text-blue-600">
                                {new Date(appointment.consultationStartedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          {appointment.consultationEndedAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Consultation Ended:</span>
                              <span className="font-medium text-gray-600">
                                {new Date(appointment.consultationEndedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {filteredAppointments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'today' ? 'You have no appointments scheduled for today' :
             filter === 'upcoming' ? 'You have no upcoming appointments' :
             filter === 'completed' ? 'You have no completed appointments' :
             'Patients will appear here when they book appointments with you'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
