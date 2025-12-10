import express from 'express';
import db from '../models/index.js';
import {
  initializePayment,
  processPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  verifyPayment,
  paymentCallback,
  paymentWebhook,
  getPaymentMethods,
  getAppointmentPaymentStatus,
  getPaymentStatistics
} from '../controllers/paymentController.js';

const router = express.Router();

// Get supported payment methods
router.get('/methods', getPaymentMethods);

// Debug endpoint to test payment configuration
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    debug: {
      chapaSecretKey: process.env.CHAPA_SECRET_KEY ? `${process.env.CHAPA_SECRET_KEY.substring(0, 10)}...` : 'NOT_SET',
      telebirrAppId: process.env.TELEBIRR_APP_ID ? `${process.env.TELEBIRR_APP_ID.substring(0, 10)}...` : 'NOT_SET',
      backendUrl: process.env.BACKEND_URL,
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Get payment statistics (admin)
router.get('/statistics', getPaymentStatistics);

// Get appointment payment status
router.get('/appointment/:appointmentId/status', getAppointmentPaymentStatus);

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

// Demo payment completion endpoint
router.post('/demo/complete', async (req, res) => {
  try {
    const { txRef } = req.body;
    
    if (!txRef) {
      return res.status(400).json({
        success: false,
        error: 'Missing txRef'
      });
    }

    const { Payment } = db;
    const payment = await Payment.findOne({
      where: { transactionId: txRef }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Complete the demo payment
    await payment.update({
      status: 'completed',
      providerTransactionId: txRef,
      verifiedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Demo payment completed',
      data: payment
    });
  } catch (error) {
    console.error('❌ Demo payment completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete demo payment',
      message: error.message
    });
  }
});

// Get all payments (with optional query filters)
router.get('/', getPayments);

// Get specific payment
router.get('/:id', getPaymentById);

// Update payment status
router.patch('/:id/status', updatePaymentStatus);

export default router;