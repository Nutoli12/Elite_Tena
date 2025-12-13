import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getDoctorSchedule,
  createDoctorSlot,
  getAvailableSlots,
  bookAppointmentSlot,
  leavePatientNote,
  checkRescheduleEligibility,
  rescheduleAppointment,
  // 🆕 CONSENT-FIRST WORKFLOW ENDPOINTS
  requestConsent,
  grantConsent,
  getConsentStatus,
  revokeConsent,
  startConsultation
} from '../controllers/appointmentController.js';

// 🆕 PHASE 3: Payment & Approval
import {
  approveAppointment,
  rejectAppointment,
  getPendingApprovals,
  uploadPaymentReceipt,
  confirmPayment,
  getPaymentDetails
} from '../controllers/appointmentPhase3Controller.js';

// 🆕 PHASE 4: Check-in & Queue
import {
  generateQRCode,
  checkInPatient,
  scanQRAndCheckIn,
  getCheckedInPatients,
  getWaitingRoom,
  callPatient,
  completeAppointment,
  getDoctorQueue
} from '../controllers/appointmentPhase4Controller.js';

// 🆕 Dashboard: Role-based queries
import {
  getDoctorAppointments,
  getPatientAppointments,
  getTodayAppointments,
  getDoctorStats
} from '../controllers/appointmentDashboardController.js';

const router = express.Router();

// Get all appointments (with optional query filters)
router.get('/', getAppointments);

// 🆕 Dashboard: Role-based appointment queries
router.get('/dashboard/doctor/:doctorWallet', getDoctorAppointments);
router.get('/dashboard/patient/:patientWallet', getPatientAppointments);
router.get('/dashboard/doctor/:doctorWallet/today', getTodayAppointments);
router.get('/dashboard/doctor/:doctorWallet/stats', getDoctorStats);

// 👨‍⚕️ NEW: Get available appointment slots
router.get('/available-slots', getAvailableSlots);

// 👨‍⚕️ NEW: Get doctor's schedule
router.get('/doctor/:doctorWallet/schedule', getDoctorSchedule);

// Get appointments for a specific doctor
router.get('/doctor/:doctorWallet', getAppointments);

// Get appointments for a specific patient
router.get('/patient/:patientWallet', getAppointments);

// 🆕 PHASE 3: Payment & Approval Routes
router.get('/pending-approval', getPendingApprovals);

// 🆕 PHASE 4: Check-in & Queue Routes
router.get('/checked-in', getCheckedInPatients);
router.get('/waiting-room', getWaitingRoom);
router.get('/doctor/:doctorWallet/queue', getDoctorQueue);

// Get specific appointment by ID
router.get('/:id', getAppointmentById);

// Create new appointment
router.post('/', createAppointment);

// 👨‍⚕️ NEW: Doctor creates appointment slot
router.post('/doctor/create-slot', createDoctorSlot);

// 👤 NEW: Patient books available slot
router.post('/book-slot/:slotId', bookAppointmentSlot);

// Update appointment
router.put('/:id', updateAppointment);

// 🚫 REMOVED: Cancel appointment - replaced with note system
// router.patch('/:id/cancel', cancelAppointment);

// 📝 NEW: Patient note system (replaces cancel)
router.post('/:id/leave-note', leavePatientNote);

// ⏰ NEW: Check reschedule eligibility (24-hour rule)
router.get('/:id/reschedule-check', checkRescheduleEligibility);

// 🔄 NEW: Reschedule appointment (with restrictions)
router.patch('/:id/reschedule', rescheduleAppointment);

// Delete appointment
router.delete('/:id', deleteAppointment);

// 🆕 PHASE 3: Payment & Approval Actions
router.post('/:id/approve', approveAppointment);
router.post('/:id/reject', rejectAppointment);
router.get('/:id/payment-details', getPaymentDetails);
router.post('/:id/upload-receipt', uploadPaymentReceipt);
router.post('/:id/confirm-payment', confirmPayment);

// 🆕 PHASE 4: Check-in & Queue Actions
router.post('/scan-qr', scanQRAndCheckIn);
router.post('/:id/generate-qr', generateQRCode);
router.post('/:id/check-in', checkInPatient);
router.post('/:id/call-patient', callPatient);
router.post('/:id/complete', completeAppointment);

// 🆕 CONSENT-FIRST WORKFLOW ENDPOINTS
router.post('/:id/request-consent', requestConsent);        // Doctor requests consent
router.post('/:id/grant-consent', grantConsent);            // Patient grants consent
router.get('/:id/consent-status', getConsentStatus);        // Check consent status
router.post('/:id/revoke-consent', revokeConsent);          // Revoke consent
router.post('/:id/start-consultation', startConsultation);  // Start consultation (checks consent)

export default router;
