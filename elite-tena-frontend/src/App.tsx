import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HealthcareLayout } from './components/layout/HealthcareLayout';
import { MedicalRecords } from './pages/MedicalRecords';
import { Prescriptions } from './pages/Prescriptions';
import { Appointments } from './pages/Appointments';
import { LabResults } from './pages/LabResults';
import { ConsentManagement } from './pages/Consent';
import { Payments } from './pages/Payments';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StaffManagement } from './pages/admin/StaffManagement';
import { UserManagement } from './pages/admin/UserManagement';
import { Analytics } from './pages/admin/Analytics';
import { SystemSettings } from './pages/admin/SystemSettings';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { LabDashboard } from './pages/lab/LabDashboard';
import { PharmacyDashboard } from './pages/pharmacy/PharmacyDashboard';
import { DashboardRouter } from './components/DashboardRouter';
import './i18n';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <DashboardRouter />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <MedicalRecords />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Prescriptions />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Appointments />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab-results"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <LabResults />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consent"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <ConsentManagement />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Payments />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <AdminDashboard />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <StaffManagement />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <UserManagement />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <Analytics />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <SystemSettings />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <DoctorDashboard />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab/dashboard"
        element={
          <ProtectedRoute requiredRole="lab_technician">
            <HealthcareLayout>
              <LabDashboard />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/dashboard"
        element={
          <ProtectedRoute requiredRole="pharmacist">
            <HealthcareLayout>
              <PharmacyDashboard />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;
