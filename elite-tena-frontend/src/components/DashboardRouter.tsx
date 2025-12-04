import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from '../pages/Dashboard';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard';
import { LabDashboard } from '../pages/lab/LabDashboard';
import { PharmacyDashboard } from '../pages/pharmacy/PharmacyDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';

export const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  // Show role-specific dashboard based on user role
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'lab_technician':
      return <LabDashboard />;
    case 'pharmacist':
      return <PharmacyDashboard />;
    case 'patient':
    default:
      return <Dashboard />;
  }
};
