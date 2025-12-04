import express from 'express';
import {
  getLabResults,
  getLabResultById,
  createLabResult,
  updateLabResult,
  deleteLabResult,
  getPatientsWithPendingTests,
  getLabOrders,
  uploadLabResults
} from '../controllers/labResultController.js';

const router = express.Router();

// Get all lab results (with optional query filters)
router.get('/', getLabResults);

// 🔬 NEW: Get patients with pending tests (REAL DATA)
router.get('/pending-patients', getPatientsWithPendingTests);

// 🔬 NEW: Get lab orders for technician
router.get('/orders', getLabOrders);

// Get specific lab result
router.get('/:id', getLabResultById);

// Create new lab result
router.post('/', createLabResult);

// 🔬 NEW: Upload lab results
router.post('/upload', uploadLabResults);

// Update lab result
router.put('/:id', updateLabResult);

// Delete lab result
router.delete('/:id', deleteLabResult);

export default router;
