import express from 'express';
import {
  getServicePricing,
  createFreeAppointment,
  initializePremiumPayment,
  completePaymentAndSendForApproval,
  processDoctorApprovalWithRefund,
  getDoctorPaidQueue,
  updateDoctorPaymentSettings,
  getPaymentFirstAnalytics
} from '../controllers/paymentFirstController.js';

const router = express.Router();

/**
 * 💰 PAYMENT-FIRST ROUTES
 * 🎯 Correct workflow: Payment BEFORE Doctor Approval for Premium Services
 */

// Get upfront pricing for service type
router.get('/pricing/:doctorWallet/:serviceType', getServicePricing);

// Create free appointment (in-person with no fee)
router.post('/create-appointment', createFreeAppointment);

// Initialize payment for premium services (video/chat)
router.post('/initialize-premium-payment', initializePremiumPayment);

// Complete payment and send to doctor for approval
router.post('/complete-payment/:txRef', completePaymentAndSendForApproval);

// Doctor approval with automatic refund on rejection
router.post('/doctor-approval/:appointmentId', processDoctorApprovalWithRefund);

// Get doctor's paid appointment queue
router.get('/doctor-queue/:doctorWallet', getDoctorPaidQueue);

// Update doctor payment settings with minimum enforcement
router.put('/doctor-settings/:doctorWallet', updateDoctorPaymentSettings);

// Get payment-first analytics
router.get('/analytics/:doctorWallet', getPaymentFirstAnalytics);

export default router;