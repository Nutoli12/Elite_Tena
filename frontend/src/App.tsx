import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import { SocketProvider } from './contexts/SocketContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthGuard } from './components/auth/AuthGuard';
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
import { AdminStaff } from './pages/admin/AdminStaff';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { ConsultationRoom } from './pages/doctor/ConsultationRoom';
import { ConsultationInterface } from './pages/doctor/ConsultationInterface';
import { ComprehensiveConsultation } from './pages/doctor/ComprehensiveConsultation';
import { DoctorSettings } from './pages/doctor/DoctorSettings';
import { DoctorConsent } from './pages/doctor/DoctorConsent';
import { LabDashboard } from './pages/lab/LabDashboard';
import { PharmacyDashboard } from './pages/pharmacy/PharmacyDashboard';
import { ReceptionCheckIn } from './pages/reception/ReceptionCheckIn';
import { WaitingRoom } from './pages/WaitingRoom';
import { DashboardRouter } from './components/DashboardRouter';
import { AppointmentsRouter } from './components/AppointmentsRouter';
import { Messages } from './pages/Messages';
import './i18n';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <AuthGuard requireAuth={false}>
            <LandingPage />
          </AuthGuard>
        } 
      />
      <Route 
        path="/login" 
        element={
          <AuthGuard requireAuth={false}>
            <Login />
          </AuthGuard>
        } 
      />
      <Route 
        path="/register" 
        element={
          <AuthGuard requireAuth={false}>
            <Register />
          </AuthGuard>
        } 
      />
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
              <AppointmentsRouter />
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
        path="/messages"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Messages />
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
              <AdminStaff />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <AdminUsers />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <HealthcareLayout>
              <AdminAnalytics />
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
        path="/consultation/:appointmentId"
        element={
          <ProtectedRoute requiredRole="doctor">
            <ConsultationInterface />
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
      <Route
        path="/doctor/consultation/:appointmentId"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <ConsultationRoom />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/consultation/:appointmentId"
        element={
          <ProtectedRoute requiredRole="patient">
            <HealthcareLayout>
              <ConsultationRoom />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/comprehensive-consultation/:appointmentId"
        element={
          <ProtectedRoute requiredRole="doctor">
            <ComprehensiveConsultation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/settings"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <DoctorSettings />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/consent"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <DoctorConsent />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reception/check-in"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <ReceptionCheckIn />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/waiting-room"
        element={<WaitingRoom />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;
