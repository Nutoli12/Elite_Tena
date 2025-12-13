import express from 'express';
import EnhancedAppointmentController from '../controllers/EnhancedAppointmentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Doctor Pricing Management
router.get('/doctors/:doctorWallet/pricing', 
  authenticateToken,
  EnhancedAppointmentController.getDoctorPricing
);

router.put('/doctors/:doctorWallet/pricing', 
  authenticateToken,
  requireRole(['doctor']),
  EnhancedAppointmentController.updateDoctorPricing
);

// Get all doctors with pricing (for patient selection)
router.get('/doctors', 
  authenticateToken,
  EnhancedAppointmentController.getDoctorsWithPricing
);

// Appointment Booking Flow
// Step 1-3: Department → Doctor → Schedule (Create appointment)
router.post('/appointments', 
  (req, res, next) => {
    console.log('🎯 Enhanced appointments route hit:', req.method, req.path);
    next();
  },
  authenticateToken,
  requireRole(['patient']),
  EnhancedAppointmentController.createAppointment
);

// Step 4: Payment
router.post('/appointments/:appointmentId/payment', 
  authenticateToken,
  requireRole(['patient']),
  EnhancedAppointmentController.processPayment
);

// Appointment Management
router.get('/appointments/:appointmentId', 
  authenticateToken,
  EnhancedAppointmentController.getAppointmentDetails
);

// Patient Appointments
router.get('/patient/appointments', 
  authenticateToken,
  requireRole(['patient']),
  EnhancedAppointmentController.getPatientAppointments
);

// Doctor Appointments & Approval
router.get('/doctor/appointments', 
  authenticateToken,
  requireRole(['doctor']),
  EnhancedAppointmentController.getDoctorAppointments
);

router.post('/doctor/appointments/:appointmentId/approve', 
  authenticateToken,
  requireRole(['doctor']),
  EnhancedAppointmentController.approveAppointment
);

router.post('/doctor/appointments/:appointmentId/reject', 
  authenticateToken,
  requireRole(['doctor']),
  EnhancedAppointmentController.rejectAppointment
);

export default router;