import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Video, MapPin, MessageSquare, MoreVertical, CheckCircle, XCircle, Eye, Phone } from 'lucide-react';
import axios from '../../lib/axios';

export const DoctorAppointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');

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
                  ? 'bg-medical-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
            </motion.button>
          ))}
        </div>
      </div>

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

      {/* Appointments List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {filter === 'all' ? 'All Appointments' : 
           filter === 'today' ? 'Today\'s Appointments' :
           filter === 'upcoming' ? 'Upcoming Appointments' :
           'Completed Appointments'} ({filteredAppointments.length})
        </h2>
        
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAppointments.map((appointment, index) => (
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
                      {new Date(appointment.appointmentDate).getDate()}
                    </span>
                    <span className="text-xs text-medical-500">
                      {new Date(appointment.appointmentDate).toLocaleString('en', { month: 'short' })}
                    </span>
                  </motion.div>

                  {/* Appointment Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <h4 className="font-semibold text-gray-900">
                            Patient: {appointment.patientDetails?.user?.profileData?.fullName || 
                                     appointment.patientWalletAddress?.substring(0, 10) + '...'}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">{appointment.reason || 'Consultation'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(appointment)}
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(appointment.appointmentDate).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getServiceIcon(appointment.serviceType)}
                        <span className="capitalize">
                          {appointment.serviceType === 'inPerson' ? 'In-Person' : 
                           appointment.serviceType === 'videoCall' ? 'Video Call' : 'Chat'}
                        </span>
                        {appointment.fee > 0 && (
                          <span className="ml-2 font-semibold text-medical-600">{appointment.fee} Birr</span>
                        )}
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <strong>Note:</strong> {appointment.notes}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Comprehensive Consultation - Available for ALL appointments */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/comprehensive-consultation/${appointment.id}`)}
                        className="bg-medical-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {appointment.status === 'completed' ? 'View Consultation' : 'Start Consultation'}
                      </motion.button>

                      {/* Quick Consultation */}
                      {appointment.status !== 'completed' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/consultation/${appointment.id}`)}
                          className="border border-medical-500 text-medical-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Quick Consultation
                        </motion.button>
                      )}

                      {/* Chat Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/messages?userId=${appointment.patientWalletAddress}`)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </motion.button>

                      {/* Video Call Button */}
                      {appointment.serviceType === 'videoCall' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            // Navigate to messages with video call intent
                            navigate(`/messages?userId=${appointment.patientWalletAddress}&startCall=true`);
                          }}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          Start Video Call
                        </motion.button>
                      )}

                      {/* View Details */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => alert(`Appointment Details:\n\nPatient: ${appointment.patientDetails?.user?.profileData?.fullName || 'N/A'}\nDate: ${new Date(appointment.appointmentDate).toLocaleString()}\nReason: ${appointment.reason || 'N/A'}\nStatus: ${appointment.status}`)}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </motion.button>

                      {/* Delete */}
                      {appointment.status !== 'completed' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this appointment?')) {
                              try {
                                await axios.delete(`/appointments/${appointment.id}`);
                                alert('Appointment deleted successfully!');
                                fetchDoctorSchedule(); // Refresh list
                              } catch (error) {
                                console.error('Delete error:', error);
                                alert('Failed to delete appointment');
                              }
                            }
                          }}
                          className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Delete
                        </motion.button>
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
