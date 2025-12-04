import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Activity, Bell } from 'lucide-react';
import axios from '../lib/axios';

export const WaitingRoom: React.FC = () => {
  const [waitingPatients, setWaitingPatients] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitingRoom();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchWaitingRoom, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchWaitingRoom = async () => {
    try {
      const response = await axios.get('/appointments/waiting-room');
      if (response.data.success) {
        const patients = response.data.data || [];
        
        // Find patient currently in consultation
        const inProgress = patients.find((p: any) => p.checkInStatus === 'in_progress');
        setCurrentPatient(inProgress);
        
        // Get waiting patients
        const waiting = patients.filter((p: any) => 
          p.checkInStatus === 'checked_in' || p.checkInStatus === 'waiting'
        );
        setWaitingPatients(waiting);
      }
    } catch (error) {
      console.error('Failed to fetch waiting room:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <Activity className="w-16 h-16 text-medical-600 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Elite-Tena Healthcare</h1>
          <p className="text-2xl text-gray-600">Waiting Room</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
            <Clock className="w-5 h-5" />
            <span className="text-lg">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </motion.div>

        {/* Current Patient */}
        {currentPatient && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-8 text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center"
                >
                  <Bell className="w-12 h-12" />
                </motion.div>
                <div>
                  <p className="text-xl opacity-90 mb-2">NOW CONSULTING</p>
                  <h2 className="text-5xl font-bold mb-2">
                    Queue #{currentPatient.queueNumber}
                  </h2>
                  <p className="text-2xl opacity-90">
                    Dr. {currentPatient.doctorDetails?.user?.fullName || 'Doctor'}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-6xl"
              >
                🩺
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Waiting Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Waiting Queue</h2>
              <p className="text-lg text-gray-600">
                {waitingPatients.length} patient{waitingPatients.length !== 1 ? 's' : ''} waiting
              </p>
            </div>
          </div>

          {waitingPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {waitingPatients.map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                      >
                        {patient.queueNumber}
                      </motion.div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Checked in</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(patient.checkedInAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Doctor</p>
                      <p className="font-semibold text-gray-900">
                        Dr. {patient.doctorDetails?.user?.fullName || 'Doctor'}
                      </p>
                      
                      {patient.estimatedWaitTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                          <Clock className="w-4 h-4" />
                          <span>Est. wait: {patient.estimatedWaitTime} min</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Users className="w-20 h-20 mx-auto mb-4 text-gray-400" />
              <p className="text-2xl">No patients waiting</p>
              <p className="text-lg mt-2">The waiting room is currently empty</p>
            </div>
          )}
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Please wait for your number</p>
              <p className="text-lg font-semibold text-gray-900">Listen for announcements</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Emergency?</p>
              <p className="text-lg font-semibold text-red-600">Contact reception immediately</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Questions?</p>
              <p className="text-lg font-semibold text-gray-900">Ask our staff</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
