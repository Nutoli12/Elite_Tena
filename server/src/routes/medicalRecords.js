import express from 'express';
import { getAllMedicalRecords, getMedicalRecords, createMedicalRecord, updateMedicalRecord } from '../controllers/medicalRecordController.js';

const router = express.Router();

// Apply authentication to all medical record routes

// Get all medical records (admin only - no filtering)
router.get('/', getAllMedicalRecords);

// Get medical records for specific patient
router.get('/:patientWallet', getMedicalRecords);

// Create medical record - only doctors and admins
router.post('/', createMedicalRecord);
router.post('/:patientWallet', createMedicalRecord); // Alternative route with wallet in path

// Update medical record - only doctors and admins
router.put('/:id', updateMedicalRecord);

export default router;
