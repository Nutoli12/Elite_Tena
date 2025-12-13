import express from 'express';
import {
  calculateAppointmentFee,
  processAppointmentApproval,
  initializeAppointmentPayment,
  verifyAppointmentPayment,
  getAppointmentPaymentStatus,
  getDoctorPendingApprovals,
  getDoctorPaymentSettings,
  updateDoctorPaymentSettings
} from '../controllers/appointmentPaymentController.js';

const router = express.Router();

/**
 * 💰 APPOINTMENT PAYMENT ROUTES
 * Phase 2: Approval & Payment workflow
 */

// 📊 Calculate appointment fee
router.post('/calculate-fee', calculateAppointmentFee);

// 👨‍⚕️ Doctor approval workflow
router.post('/:id/approval', processAppointmentApproval);

// 💳 Payment initialization
router.post('/:id/payment/initialize', initializeAppointmentPayment);

// ✅ Payment verification
router.get('/:id/payment/verify', verifyAppointmentPayment);

// 📊 Payment status and workflow
router.get('/:id/payment/status', getAppointmentPaymentStatus);

// 📋 Doctor's pending approvals
router.get('/doctor/:doctorWallet/pending-approvals', getDoctorPendingApprovals);

// 💰 Doctor payment settings
router.get('/doctor/:doctorWallet/payment-settings', getDoctorPaymentSettings);
router.put('/doctor/:doctorWallet/payment-settings', updateDoctorPaymentSettings);

export default router;