import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Video, MapPin, MessageSquare } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

export const UpcomingAppointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching doctor appointments for:', user.walletAddress);
      
      // Fetch ONLY this doctor's appointments (not patient appointments!)
      const response = await axios.get('/appointments', {
        params: {
          userRole: 'doctor',
          userId: user.walletAddress
        }
      });

      if (response.data.success) {
        const allAppointments = response.data.data || [];
        
        // Filter for upcoming appointments only
        const upcomingAppointments = allAppointments.filter((apt: any) => 
          apt.status !== 'cancelled' &&
          apt.status !== 'completed' &&
          new Date(apt.appointmentDate) >= new Date()
        );

        // Sort by appointment date
        upcomingAppointments.sort((a: any, b: any) => 
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
        );

        setAppointments(upcomingAppointments.slice(0, 5)); // Show next 5 appointments
        console.log(`✅ Loaded ${upcomingAppointments.length} upcoming appointments for doctor`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch doctor appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'videoCall':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      default:
        return <MapPin className="w-5 h-5 text-purple-600" />;
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
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Confirmed</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full mx-auto"
        />
        <p className="text-gray-600 mt-2">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="medical-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Appointments</h2>
        <a href="/appointments" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          View All →
        </a>
      </div>

      {appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ x: 5 }}
              className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-medical-300 hover:shadow-md transition-all group"
            >
              {/* Date Badge */}
              <div className="flex-shrink-0 w-16 h-16 bg-medical-50 rounded-lg flex flex-col items-center justify-center border-2 border-medical-200">
                <span className="text-sm font-bold text-medical-600">
                  {new Date(appointment.appointmentDate).getDate()}
                </span>
                <span className="text-xs text-medical-500">
                  {new Date(appointment.appointmentDate).toLocaleString('en', { month: 'short' })}
                </span>
              </div>

              {/* Appointment Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <h4 className="font-semibold text-gray-900">
                        {(appointment.patientDetails as any)?.user?.fullName || 
                         appointment.patientWalletAddress?.substring(0, 10) + '...'}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600">{appointment.reason || 'Consultation'}</p>
                  </div>
                  {getStatusBadge(appointment)}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(appointment.appointmentDate).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {getServiceIcon(appointment.serviceType)}
                    <span className="capitalize">
                      {appointment.serviceType === 'inPerson' ? 'In-Person' : 
                       appointment.serviceType === 'videoCall' ? 'Video Call' : 'Chat'}
                    </span>
                  </div>

                  {appointment.fee > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-medical-600">{appointment.fee} Birr</span>
                    </div>
                  )}
                </div>

                {appointment.notes && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                    Note: {appointment.notes}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No upcoming appointments</p>
          <p className="text-sm mt-1">Patients will appear here when they book appointments with you</p>
        </div>
      )}
    </div>
  );
};
