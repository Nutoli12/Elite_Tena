import express from 'express';
import {
  startConsultation,
  updateConsultationNotes,
  completeConsultation,
  getConsultationDetails,
  updateComprehensiveConsultation,
  finalizeComprehensiveConsultation
} from '../controllers/consultationController.js';
import { requireAppointmentConsent } from '../../middleware/requireAppointmentConsent.js';

const router = express.Router();

/**
 * 🩺 CONSULTATION ROUTES
 * Handles doctor consultation workflow
 */

// Get consultation details (patient history, current appointment) - allow for initial setup
router.get('/:appointmentId', getConsultationDetails);

// Start consultation - requires consent
router.post('/:appointmentId/start', requireAppointmentConsent, startConsultation);

// Update consultation notes (auto-save) - requires consent
router.put('/:appointmentId/notes', requireAppointmentConsent, updateConsultationNotes);

// Complete consultation - requires consent
router.post('/:appointmentId/complete', requireAppointmentConsent, completeConsultation);

// Comprehensive consultation routes - require consent
router.put('/:appointmentId/comprehensive', requireAppointmentConsent, updateComprehensiveConsultation);
router.post('/:appointmentId/finalize', requireAppointmentConsent, finalizeComprehensiveConsultation);

export default router;
