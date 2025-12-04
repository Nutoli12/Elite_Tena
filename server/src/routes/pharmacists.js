import express from 'express';
import { 
  getPharmacists, 
  createPharmacist, 
  updatePharmacist, 
  deletePharmacist,
  dispensePrescription 
} from '../controllers/pharmacistController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all pharmacist routes
router.use(authenticateToken);

// Get all pharmacists - accessible by doctors and admins
router.get('/', requireRole(['doctor', 'admin']), getPharmacists);

// Create pharmacist - only admins
router.post('/', requireRole(['admin']), createPharmacist);

// Update pharmacist - only admins or the pharmacist themselves
router.put('/:id', requireRole(['admin', 'pharmacist']), updatePharmacist);

// Delete pharmacist - only admins
router.delete('/:id', requireRole(['admin']), deletePharmacist);

// Dispense prescription - pharmacists only
router.post('/dispense', requireRole(['pharmacist']), dispensePrescription);

export default router;
