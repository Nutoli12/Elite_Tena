import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthGuard } from './components/auth/AuthGuard';
import { HealthcareLayout } from './components/layout/HealthcareLayout';
import { MedicalRecords } from './pages/MedicalRecords';
import { Prescriptions } from './pages/Prescriptions';

import { LabResults } from './pages/LabResults';
import LabWorkflow from './pages/LabWorkflow';
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
import DoctorPricingDashboard from './components/doctor/DoctorPricingDashboard';
import PremiumPricingSettings from './components/doctor/PremiumPricingSettings';
import DoctorSelection from './pages/patient/DoctorSelection';
import EnhancedAppointmentBooking from './components/appointment/EnhancedAppointmentBooking';
import TestEnhancedBooking from './pages/TestEnhancedBooking';
import { LabDashboard } from './pages/lab/LabDashboard';
import { PharmacyDashboard } from './pages/pharmacy/PharmacyDashboard';
import { ReceptionCheckIn } from './pages/reception/ReceptionCheckIn';
import { WaitingRoom } from './pages/WaitingRoom';
import { DashboardRouter } from './components/DashboardRouter';
import { AppointmentsRouter } from './components/AppointmentsRouter';
import { Messages } from './pages/Messages';
import Consultations from './pages/Consultations';
import VideoCalls from './pages/VideoCalls';
import VideoCall from './pages/VideoCall';
import VideoConsultationDemo from './components/video/VideoConsultationDemo';
import SimpleVideoDemo from './components/video/SimpleVideoDemo';
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
        path="/lab-workflow"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <LabWorkflow />
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
        path="/doctor/pricing-dashboard"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <DoctorPricingDashboard />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/pricing-settings"
        element={
          <ProtectedRoute requiredRole="doctor">
            <HealthcareLayout>
              <PremiumPricingSettings />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/doctor-selection"
        element={
          <ProtectedRoute requiredRole="patient">
            <HealthcareLayout>
              <DoctorSelection />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/book-appointment"
        element={
          <ProtectedRoute requiredRole="patient">
            <HealthcareLayout>
              <EnhancedAppointmentBooking />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-enhanced-booking"
        element={
          <ProtectedRoute requiredRole="patient">
            <TestEnhancedBooking />
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
      {/* Premium Consultations (Chat & Video) */}
      <Route
        path="/consultations"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Consultations />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultations/:consultationId"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <Consultations />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      {/* Video Calls */}
      <Route
        path="/video-calls"
        element={
          <ProtectedRoute>
            <HealthcareLayout>
              <VideoCalls />
            </HealthcareLayout>
          </ProtectedRoute>
        }
      />
      {/* Individual Video Call */}
      <Route
        path="/video-call/:callId"
        element={
          <ProtectedRoute>
            <VideoCall />
          </ProtectedRoute>
        }
      />
      {/* Video Consultation Demo */}
      <Route
        path="/video-consultation-demo"
        element={
          <ProtectedRoute>
            <VideoConsultationDemo />
          </ProtectedRoute>
        }
      />
      {/* Simple Video Demo (Fallback) */}
      <Route
        path="/simple-video-demo"
        element={
          <ProtectedRoute>
            <SimpleVideoDemo />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Router>
                <AppRoutes />
              </Router>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;
