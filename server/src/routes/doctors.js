import express from 'express';
import { 
  getDoctors, 
  getDoctorById,
  getDoctorsByDepartment,
  getDepartments,
  createDoctor,
  updateDoctor,
  deleteDoctor
} from '../controllers/doctorController.js';

const router = express.Router();

// 🆕 PHASE 2: Enhanced doctor routes
router.get('/departments', getDepartments); // Must be before /:id
router.get('/department/:department', getDoctorsByDepartment);
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.post('/', createDoctor);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

export default router;