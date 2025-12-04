import express from 'express';
import patientRoutes from './patients.js';
import doctorRoutes from './doctors.js';
import authRoutes from './auth.js';
import appointmentRoutes from './appointment.js';
import paymentRoutes from './payment.js';
import healthRoutes from './health.js';

const router = express.Router();

// Health check route
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Healthcare routes
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

export default router;
