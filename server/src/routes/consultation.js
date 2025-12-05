import express from 'express';
import {
  startConsultation,
  updateConsultationNotes,
  completeConsultation,
  getConsultationDetails,
  updateComprehensiveConsultation,
  finalizeComprehensiveConsultation
} from '../controllers/consultationController.js';

const router = express.Router();

/**
 * 🩺 CONSULTATION ROUTES
 * Handles doctor consultation workflow
 */

// Get consultation details (patient history, current appointment)
router.get('/:appointmentId', getConsultationDetails);

// Start consultation
router.post('/:appointmentId/start', startConsultation);

// Update consultation notes (auto-save)
router.put('/:appointmentId/notes', updateConsultationNotes);

// Complete consultation
router.post('/:appointmentId/complete', completeConsultation);

// Comprehensive consultation routes
router.put('/:appointmentId/comprehensive', updateComprehensiveConsultation);
router.post('/:appointmentId/finalize', finalizeComprehensiveConsultation);

export default router;
