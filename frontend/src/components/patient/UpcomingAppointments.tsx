import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../lib/axios';

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
      const response = await axios.get('/appointments', {
        params: {
          userRole: 'patient',
          userId: user.walletAddress
        }
      });
      if (response.data.success) {
        const upcomingAppointments = response.data.data
          .filter((apt: any) => new Date(apt.appointmentDate) > new Date())
          .slice(0, 2)
          .map((apt: any) => ({
            id: apt.id,
            doctor: apt.doctor?.profileData?.name || apt.doctor?.profileData?.fullName || (apt.doctor?.profileData?.firstName && apt.doctor?.profileData?.lastName ? `${apt.doctor.profileData.firstName} ${apt.doctor.profileData.lastName}` : apt.displayDoctor || apt.appointedWith?.name || 'Unknown Doctor'),
            specialization: apt.doctor?.doctorProfile?.specialization || apt.appointedWith?.specialization || 'General Medicine',
            date: apt.appointmentDate.split('T')[0],
            time: new Date(apt.appointmentDate).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            }),
            type: apt.serviceType || 'in-person',
            location: apt.serviceType === 'videoCall' ? 'Video Call' : 'Elite-Tena Healthcare'
          }));
        setAppointments(upcomingAppointments);
      } else {
        // No appointments found
        setAppointments([]);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      // Set empty array on error
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="medical-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
        <a href="/appointments" className="text-medical-600 hover:text-medical-700 text-sm font-medium">
          View All →
        </a>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-medical-500 border-t-transparent rounded-full"
            />
          </div>
        ) : appointments.map((appointment, index) => (
          <motion.div
            key={appointment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ y: -2 }}
            className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-medical-50 rounded-lg flex flex-col items-center justify-center border border-medical-200">
              <span className="text-sm font-bold text-medical-600">
                {new Date(appointment.date).getDate()}
              </span>
              <span className="text-xs text-medical-500">
                {new Date(appointment.date).toLocaleString('en', { month: 'short' })}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">{appointment.doctor}</h4>
              <p className="text-sm text-gray-600 mb-2">{appointment.specialization}</p>
              
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
                  <span className="truncate">{appointment.location}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && appointments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No upcoming appointments</p>
        </div>
      )}
    </motion.div>
  );
};
