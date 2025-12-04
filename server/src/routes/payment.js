import express from 'express';
import {
  initializePayment,
  processPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  verifyPayment,
  paymentCallback,
  paymentWebhook,
  getPaymentMethods
} from '../controllers/paymentController.js';

const router = express.Router();

// Get supported payment methods
router.get('/methods', getPaymentMethods);

// Initialize a new payment
router.post('/initialize', initializePayment);

// Process payment
router.post('/process', processPayment);

// Verify payment
router.get('/verify', verifyPayment);

// Payment callback (Chapa)
router.get('/callback', paymentCallback);

// Payment webhook (Telebirr)
router.post('/webhook', paymentWebhook);

// Get all payments (with optional query filters)
router.get('/', getPayments);

// Get specific payment
router.get('/:id', getPaymentById);

// Update payment status
router.patch('/:id/status', updatePaymentStatus);

export default router;