import express from 'express';
import { getPatients, getPatientById } from '../controllers/patientController.js';

const router = express.Router();

// Real database operations - no mock data
router.get('/', getPatients);
router.get('/:id', getPatientById);

export default router;