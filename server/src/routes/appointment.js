import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  getDoctorSchedule,
  createDoctorSlot,
  getAvailableSlots,
  bookAppointmentSlot
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

const router = express.Router();

// Get all appointments (with optional query filters)
router.get('/', getAppointments);

// 👨‍⚕️ NEW: Get available appointment slots
router.get('/available-slots', getAvailableSlots);

// 👨‍⚕️ NEW: Get doctor's schedule
router.get('/doctor/:doctorWallet/schedule', getDoctorSchedule);

// Get appointments for a specific doctor
router.get('/doctor/:doctorWallet', getAppointments);

// Get appointments for a specific patient
router.get('/patient/:patientWallet', getAppointments);

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

// Cancel appointment (special action)
router.patch('/:id/cancel', cancelAppointment);

// Delete appointment
router.delete('/:id', deleteAppointment);

// 🆕 PHASE 3: Payment & Approval Routes
router.get('/pending-approval', getPendingApprovals);
router.post('/:id/approve', approveAppointment);
router.post('/:id/reject', rejectAppointment);
router.get('/:id/payment-details', getPaymentDetails);
router.post('/:id/upload-receipt', uploadPaymentReceipt);
router.post('/:id/confirm-payment', confirmPayment);

// 🆕 PHASE 4: Check-in & Queue Routes
router.get('/checked-in', getCheckedInPatients);
router.get('/waiting-room', getWaitingRoom);
router.get('/doctor/:doctorWallet/queue', getDoctorQueue);
router.post('/scan-qr', scanQRAndCheckIn);
router.post('/:id/generate-qr', generateQRCode);
router.post('/:id/check-in', checkInPatient);
router.post('/:id/call-patient', callPatient);
router.post('/:id/complete', completeAppointment);

export default router;
