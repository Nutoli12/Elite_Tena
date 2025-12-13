import express from 'express';
import {
  initializeChapaPayment,
  verifyChapaPayment,
  handleChapaWebhook,
  getChapaPaymentStatus,
  getChapaPaymentAnalytics,
  retryChapaPayment,
  getEthiopianPaymentMethods
} from '../controllers/chapaPaymentController.js';

const router = express.Router();

/**
 * 🇪🇹 CHAPA PAYMENT ROUTES
 * Ethiopian payment gateway integration with consent workflow
 */

// Test route to verify Chapa routes are loaded
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Chapa payment routes are working! DEBUG VERSION' });
});

// Initialize Chapa payment for appointment
router.post('/initialize', initializeChapaPayment);

// Verify Chapa payment and trigger consent
router.get('/verify/:txRef', verifyChapaPayment);

// Handle Chapa webhooks (real-time payment updates)
router.post('/webhook', handleChapaWebhook);

// Get payment status for appointment
router.get('/status/:appointmentId', getChapaPaymentStatus);

// Get payment analytics for doctor
router.get('/analytics/:doctorWallet', getChapaPaymentAnalytics);

// Retry failed payment
router.post('/retry/:paymentId', retryChapaPayment);

// Get Ethiopian payment methods
router.get('/methods', getEthiopianPaymentMethods);

export default router;