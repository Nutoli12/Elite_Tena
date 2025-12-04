import express from 'express';
import {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  getPendingPrescriptions,
  dispensePrescription,
  getPharmacyHistory,
  verifyPrescription
} from '../controllers/prescriptionController.js';

const router = express.Router();

// Get all prescriptions (with optional query filters)
router.get('/', getPrescriptions);

// 💊 NEW: Get pending prescriptions for pharmacy
router.get('/pending', getPendingPrescriptions);

// 💊 NEW: Get pharmacy history
router.get('/pharmacy/history', getPharmacyHistory);

// Get prescriptions for a specific patient
router.get('/patient/:patientWallet', getPrescriptions);

// 💊 NEW: Verify prescription before dispensing
router.get('/:id/verify', verifyPrescription);

// Get specific prescription by ID
router.get('/:id', getPrescriptionById);

// Create new prescription
router.post('/', createPrescription);

// 💊 NEW: Dispense prescription
router.post('/:id/dispense', dispensePrescription);

// Update prescription
router.put('/:id', updatePrescription);

// Delete prescription
router.delete('/:id', deletePrescription);

export default router;
