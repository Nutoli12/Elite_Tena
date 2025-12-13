import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  User,
  MapPin,
  Timer,
  TrendingUp
} from 'lucide-react';
import { PatientInfoCard } from './PatientInfoCard';

interface DoctorQueueProps {
  appointments: any[];
  currentPatient?: any;
  onPatientSelect?: (appointment: any) => void;
}

export const DoctorQueue: React.FC<DoctorQueueProps> = ({ 
  appointments, 
  currentPatient, 
  onPatientSelect 
}) => {
  const [queueStats, setQueueStats] = useState({
    totalToday: 0,
    completed: 0,
    waiting: 0,
    avgConsultationTime: 22,
    estimatedFinishTime: ''
  });

  useEffect(() => {
    calculateQueueStats();
  }, [appointments]);

  const calculateQueueStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => 
      apt.appointmentDate.startsWith(today)
    );

    const completed = todayAppointments.filter(apt => 
      apt.status === 'completed' || apt.workflowState === 'completed'
    ).length;

    const waiting = todayAppointments.filter(apt => 
      apt.checkInStatus === 'checked_in' || apt.checkInStatus === 'waiting'
    ).length;

    // Calculate estimated finish time
    const remainingAppointments = todayAppointments.length - completed;
    const avgTime = 22; // minutes per consultation
    const estimatedMinutes = remainingAppointments * avgTime;
    const finishTime = new Date(Date.now() + estimatedMinutes * 60000);

    setQueueStats({
      totalToday: todayAppointments.length,
      completed,
      waiting,
      avgConsultationTime: avgTime,
      estimatedFinishTime: finishTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    });
  };

  const getQueuePosition = (appointment: any) => {
    const checkedInAppointments = appointments
      .filter(apt => apt.checkInStatus === 'checked_in' || apt.checkInStatus === 'waiting')
      .sort((a, b) => new Date(a.checkedInAt || a.appointmentDate).getTime() - 
                      new Date(b.checkedInAt || b.appointmentDate).getTime());
    
    return checkedInAppointments.findIndex(apt => apt.id === appointment.id) + 1;
  };

  const getWaitTime = (appointment: any) => {
    if (appointment.checkedInAt) {
      return Math.floor((new Date().getTime() - new Date(appointment.checkedInAt).getTime()) / (1000 * 60));
    }
    return 0;
  };

  const getStatusIcon = (appointment: any) => {
    switch (appointment.workflowState || appointment.checkInStatus) {
      case 'consultation_started':
      case 'video_call_active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'checked_in':
      case 'waiting':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <User className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (appointment: any) => {
    switch (appointment.workflowState || appointment.checkInStatus) {
      case 'consultation_started':
      case 'video_call_active':
        return 'border-l-green-500 bg-green-50';
      case 'checked_in':
      case 'waiting':
        return 'border-l-orange-500 bg-orange-50';
      case 'completed':
        return 'border-l-gray-400 bg-gray-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const todayAppointments = appointments.filter(apt => 
    apt.appointmentDate.startsWith(new Date().toISOString().split('T')[0])
  );

  const currentConsultation = todayAppointments.find(apt => 
    apt.workflowState === 'consultation_started' || apt.workflowState === 'video_call_active'
  );

  const waitingPatients = todayAppointments
    .filter(apt => apt.checkInStatus === 'checked_in' || apt.checkInStatus === 'waiting')
    .sort((a, b) => new Date(a.checkedInAt || a.appointmentDate).getTime() - 
                    new Date(b.checkedInAt || b.appointmentDate).getTime());

  const upcomingPatients = todayAppointments
    .filter(apt => !apt.checkInStatus || apt.checkInStatus === 'not_checked_in')
    .filter(apt => new Date(apt.appointmentDate) > new Date())
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-medical-600" />
          Today's Queue Overview
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-medical-600">{queueStats.totalToday}</div>
            <div className="text-sm text-gray-600">Total Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{queueStats.waiting}</div>
            <div className="text-sm text-gray-600">Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{queueStats.avgConsultationTime}m</div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
        </div>

        {queueStats.estimatedFinishTime && (
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Estimated finish time: <span className="font-semibold text-gray-900">{queueStats.estimatedFinishTime}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Current Patient */}
      {currentConsultation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Currently in Consultation
          </h3>
          <PatientInfoCard appointment={currentConsultation} compact />
          <div className="mt-3 text-sm text-green-700">
            <div className="flex items-center">
              <Timer className="w-4 h-4 mr-2" />
              Started: {new Date(currentConsultation.consultationStartedAt || currentConsultation.checkedInAt).toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Waiting Queue */}
      {waitingPatients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-orange-600" />
            Patient Queue ({waitingPatients.length} waiting)
          </h3>
          
          <div className="space-y-3">
            <AnimatePresence>
              {waitingPatients.map((appointment, index) => {
                const waitTime = getWaitTime(appointment);
                const position = index + 1;
                
                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    whileHover={{ x: 5 }}
                    className={`border-l-4 rounded-lg p-4 cursor-pointer transition-all ${getStatusColor(appointment)}`}
                    onClick={() => onPatientSelect?.(appointment)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-orange-500 text-orange-600 font-bold text-sm">
                          {position}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {appointment.patientDetails?.name || 
                             appointment.patientUser?.profileData?.fullName || 
                             appointment.patientWalletAddress?.substring(0, 10) + '...'}
                          </h4>
                          <p className="text-sm text-gray-600">{appointment.reason || 'General consultation'}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center text-sm text-orange-600 font-medium">
                          <Clock className="w-4 h-4 mr-1" />
                          {waitTime} min
                        </div>
                        <div className="text-xs text-gray-500">
                          Checked in: {new Date(appointment.checkedInAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Upcoming Appointments */}
      {upcomingPatients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Upcoming Today
          </h3>
          
          <div className="space-y-3">
            {upcomingPatients.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {appointment.patientDetails?.name || 
                       appointment.patientUser?.profileData?.fullName || 
                       'Patient'}
                    </h4>
                    <p className="text-sm text-gray-600">{appointment.reason || 'Consultation'}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {new Date(appointment.appointmentDate).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="text-xs text-gray-500">Scheduled</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {waitingPatients.length === 0 && upcomingPatients.length === 0 && !currentConsultation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white rounded-lg border border-gray-200"
        >
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients in queue</h3>
          <p className="text-gray-600">
            Patients will appear here when they check in for their appointments
          </p>
        </motion.div>
      )}
    </div>
  );
};