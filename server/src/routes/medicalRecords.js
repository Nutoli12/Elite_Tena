import express from 'express';
import { getAllMedicalRecords, getMedicalRecords, createMedicalRecord, updateMedicalRecord, debugRecordAccess, verifyMedicalRecord } from '../controllers/medicalRecordController.js';

const router = express.Router();

// Apply authentication to all medical record routes

// Debug endpoint - check record access
router.get('/debug/:recordId', debugRecordAccess);

// Blockchain verification endpoint
router.get('/verify/:id', verifyMedicalRecord);

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
