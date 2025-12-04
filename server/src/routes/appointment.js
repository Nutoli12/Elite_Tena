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

export default router;
