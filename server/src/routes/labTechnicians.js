import express from 'express';
import { 
  getLabTechnicians, 
  createLabTechnician, 
  updateLabTechnician, 
  deleteLabTechnician,
  uploadLabResult 
} from '../controllers/labTechnicianController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all lab technician routes
router.use(authenticateToken);

// Get all lab technicians - accessible by doctors and admins
router.get('/', requireRole(['doctor', 'admin']), getLabTechnicians);

// Create lab technician - only admins
router.post('/', requireRole(['admin']), createLabTechnician);

// Update lab technician - only admins or the lab tech themselves
router.put('/:id', requireRole(['admin', 'lab_technician']), updateLabTechnician);

// Delete lab technician - only admins
router.delete('/:id', requireRole(['admin']), deleteLabTechnician);

// Upload lab results - lab technicians and doctors
router.post('/upload-result', requireRole(['lab_technician', 'doctor']), uploadLabResult);

export default router;
