import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Appointments } from '../pages/Appointments';
import { DoctorAppointments } from '../pages/doctor/DoctorAppointments';

/**
 * Routes to the correct appointments page based on user role
 * - Patients: See their appointments (doctors they're seeing)
 * - Doctors: See their schedule (patients scheduled with them)
 */
export const AppointmentsRouter: React.FC = () => {
  const { user } = useAuth();

  // Doctors see their schedule (patients scheduled with them)
  if (user?.role === 'doctor') {
    return <DoctorAppointments />;
  }

  // Patients and others see patient appointments page
  return <Appointments />;
};
