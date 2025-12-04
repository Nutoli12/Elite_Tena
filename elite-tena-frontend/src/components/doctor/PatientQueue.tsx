import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, User } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

export const PatientQueue: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
    // Refresh queue every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchQueue = async () => {
    if (!user?.walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/appointments/doctor/${user.walletAddress}/queue`);
      if (response.data.success) {
        setQueue(response.data.data || []);
        console.log(`✅ Found ${response.data.count} patients in queue`);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPatient = async (appointmentId: string) => {
    try {
      const response = await axios.post(`/appointments/${appointmentId}/call-patient`, {
        doctorWallet: user?.walletAddress
      });

      if (response.data.success) {
        alert('Patient called successfully!');
        fetchQueue();
      }
    } catch (error) {
      console.error('Failed to call patient:', error);
      alert('Failed to call patient');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full mx-auto"
        />
        <p className="text-gray-600 mt-2">Loading queue...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Patient Queue</h2>
          <p className="text-sm text-gray-600">
            {queue.length} patient{queue.length !== 1 ? 's' : ''} waiting
          </p>
        </div>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-3">
          {queue.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                appointment.checkInStatus === 'in_progress'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                  appointment.checkInStatus === 'in_progress'
                    ? 'bg-green-200 text-green-700'
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {appointment.queueNumber || index + 1}
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
                      <span>
                        Checked in: {new Date(appointment.checkedInAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  {appointment.reason && (
                    <p className="text-xs text-gray-500 mt-1">{appointment.reason}</p>
                  )}
                </div>
              </div>

              {appointment.checkInStatus === 'in_progress' ? (
                <a
                  href={`/doctor/consultation/${appointment.id}`}
                  className="px-3 py-1 bg-green-200 text-green-800 rounded-lg text-sm font-medium hover:bg-green-300 transition-colors"
                >
                  View Consultation
                </a>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCallPatient(appointment.id)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  Call Patient
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No patients in queue</p>
          <p className="text-sm mt-1">Checked-in patients will appear here</p>
        </div>
      )}
    </>
  );
};
