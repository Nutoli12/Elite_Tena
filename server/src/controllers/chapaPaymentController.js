import ChapaPaymentConsentBridge from '../services/ChapaPaymentConsentBridge.js';
import db from '../models/index.js';
import { Op } from 'sequelize';

const { Appointment, Payment, User, Doctor, Patient } = db;

/**
 * 💳 CHAPA PAYMENT CONTROLLER
 * Handles Chapa-specific payment operations integrated with consent workflow
 */

/**
 * 🚀 Initialize Chapa payment for appointment
 * POST /api/chapa-payment/initialize
 */
export const initializeChapaPayment = async (req, res) => {
  try {
    console.log('🔍 DEBUG: chapaPaymentController.initializeChapaPayment called');
    const {
      appointmentId,
      patientWallet,
      returnUrl,
      customization = {}
    } = req.body;

    console.log('🚀 Initializing Chapa payment:', { appointmentId, patientWallet });

    if (!appointmentId || !patientWallet) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID and patient wallet are required'
      });
    }

    // Validate appointment exists and belongs to patient
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        patientWalletAddress: patientWallet.toLowerCase()
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or access denied'
      });
    }

    // Initialize Chapa payment
    const result = await ChapaPaymentConsentBridge.initializeChapaPayment(
      appointmentId,
      patientWallet,
      {
        returnUrl: returnUrl || `${process.env.FRONTEND_URL}/appointments/${appointmentId}/payment-success`,
        customization
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Chapa payment initialized successfully',
      data: {
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        txRef: result.txRef,
        provider: result.provider,
        demo: result.demo || false
      }
    });

  } catch (error) {
    console.error('❌ Chapa payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Chapa payment',
      message: error.message
    });
  }
};

/**
 * ✅ Verify Chapa payment and trigger consent
 * GET /api/chapa-payment/verify/:txRef
 */
export const verifyChapaPayment = async (req, res) => {
  try {
    const { txRef } = req.params;

    console.log('✅ Verifying Chapa payment:', txRef);

    if (!txRef) {
      return res.status(400).json({
        success: false,
        error: 'Transaction reference is required'
      });
    }

    const result = await ChapaPaymentConsentBridge.verifyChapaPaymentAndTriggerConsent(txRef);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Chapa payment verification completed',
      data: {
        status: result.status,
        payment: {
          id: result.payment.id,
          appointmentId: result.payment.appointmentId,
          amount: result.payment.amount,
          status: result.payment.status,
          verifiedAt: result.payment.verifiedAt
        },
        demo: result.demo || false,
        providerData: result.providerData
      }
    });

  } catch (error) {
    console.error('❌ Chapa payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify Chapa payment',
      message: error.message
    });
  }
};

/**
 * 📱 Handle Chapa webhook
 * POST /api/chapa-payment/webhook
 */
export const handleChapaWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    console.log('📱 Received Chapa webhook:', webhookData);

    // Verify webhook signature (if configured)
    if (process.env.CHAPA_WEBHOOK_SECRET) {
      const signature = req.headers['chapa-signature'];
      if (!signature || !verifyChapaWebhookSignature(webhookData, signature)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }
    }

    const result = await ChapaPaymentConsentBridge.handleChapaWebhook(webhookData);

    if (!result.success) {
      console.error('❌ Webhook processing failed:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log successful webhook processing
    await db.sequelize.query(`
      INSERT INTO chapa_webhook_logs (tx_ref, webhook_data, status, processed)
      VALUES (:txRef, :webhookData, :status, true)
    `, {
      replacements: {
        txRef: webhookData.tx_ref,
        webhookData: JSON.stringify(webhookData),
        status: webhookData.status
      }
    });

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Chapa webhook error:', error);

    // Log failed webhook processing
    try {
      await db.sequelize.query(`
        INSERT INTO chapa_webhook_logs (tx_ref, webhook_data, status, processed, processing_error)
        VALUES (:txRef, :webhookData, :status, false, :error)
      `, {
        replacements: {
          txRef: req.body.tx_ref || 'unknown',
          webhookData: JSON.stringify(req.body),
          status: req.body.status || 'unknown',
          error: error.message
        }
      });
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

/**
 * 🔍 Get Chapa payment status
 * GET /api/chapa-payment/status/:appointmentId
 */
export const getChapaPaymentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientWallet } = req.query;

    console.log('🔍 Getting Chapa payment status:', appointmentId);

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }

    // Get appointment with payment and consent details
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Payment,
          as: 'payments',
          where: { paymentMethod: 'chapa' },
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify access if patientWallet provided
    if (patientWallet && appointment.patientWalletAddress.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const latestPayment = appointment.payments && appointment.payments[0];

    // Check consultation access
    const accessCheck = await ChapaPaymentConsentBridge.checkConsultationAccess(appointmentId);

    res.json({
      success: true,
      data: {
        appointmentId,
        fee: appointment.fee,
        paymentMethod: appointment.paymentMethod,
        paymentStatus: appointment.paymentStatus,
        chapaTransactionId: appointment.chapa_transaction_id,
        paymentConfirmedAt: appointment.paymentConfirmedAt,
        latestPayment: latestPayment ? {
          id: latestPayment.id,
          amount: latestPayment.amount,
          status: latestPayment.status,
          transactionId: latestPayment.transactionId,
          createdAt: latestPayment.createdAt,
          verifiedAt: latestPayment.verifiedAt
        } : null,
        consultationAccess: accessCheck
      }
    });

  } catch (error) {
    console.error('❌ Get Chapa payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      message: error.message
    });
  }
};

/**
 * 📊 Get Chapa payment analytics for doctor
 * GET /api/chapa-payment/analytics/:doctorWallet
 */
export const getChapaPaymentAnalytics = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const { startDate, endDate } = req.query;

    console.log('📊 Getting Chapa payment analytics for doctor:', doctorWallet);

    const whereClause = {
      doctorWallet: doctorWallet.toLowerCase(),
      paymentMethod: 'chapa'
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get payment statistics
    const payments = await Payment.findAll({
      where: whereClause,
      include: [{
        model: Appointment,
        as: 'appointment',
        attributes: ['serviceType', 'appointmentDate']
      }]
    });

    // Calculate analytics
    const analytics = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      completedPayments: payments.filter(p => p.status === 'completed').length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      failedPayments: payments.filter(p => p.status === 'failed').length,
      byServiceType: {},
      byMonth: {},
      averageAmount: 0
    };

    // Calculate average
    if (analytics.totalPayments > 0) {
      analytics.averageAmount = analytics.totalAmount / analytics.totalPayments;
    }

    // Group by service type
    payments.forEach(payment => {
      const serviceType = payment.appointment?.serviceType || 'unknown';
      if (!analytics.byServiceType[serviceType]) {
        analytics.byServiceType[serviceType] = {
          count: 0,
          amount: 0
        };
      }
      analytics.byServiceType[serviceType].count++;
      analytics.byServiceType[serviceType].amount += parseFloat(payment.amount);
    });

    // Group by month
    payments.forEach(payment => {
      const month = new Date(payment.createdAt).toISOString().substring(0, 7); // YYYY-MM
      if (!analytics.byMonth[month]) {
        analytics.byMonth[month] = {
          count: 0,
          amount: 0
        };
      }
      analytics.byMonth[month].count++;
      analytics.byMonth[month].amount += parseFloat(payment.amount);
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Chapa payment analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment analytics',
      message: error.message
    });
  }
};

/**
 * 🔄 Retry failed Chapa payment
 * POST /api/chapa-payment/retry/:paymentId
 */
export const retryChapaPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { patientWallet } = req.body;

    console.log('🔄 Retrying Chapa payment:', paymentId);

    const payment = await Payment.findByPk(paymentId, {
      include: [{
        model: Appointment,
        as: 'appointment'
      }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Verify access
    if (payment.patientWallet.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if payment can be retried
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment already completed'
      });
    }

    if (payment.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts exceeded'
      });
    }

    // Initialize new payment attempt
    const result = await ChapaPaymentConsentBridge.initializeChapaPayment(
      payment.appointmentId,
      patientWallet
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Update retry count
    await payment.update({
      retryCount: payment.retryCount + 1
    });

    res.json({
      success: true,
      message: 'Payment retry initialized',
      data: {
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        txRef: result.txRef,
        retryCount: payment.retryCount + 1
      }
    });

  } catch (error) {
    console.error('❌ Chapa payment retry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry payment',
      message: error.message
    });
  }
};

/**
 * 📋 Get Ethiopian payment methods
 * GET /api/chapa-payment/methods
 */
export const getEthiopianPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'chapa',
        name: 'Chapa Payment Gateway',
        description: 'Secure payment with cards, mobile money, and bank transfer',
        type: 'gateway',
        enabled: !!process.env.CHAPA_SECRET_KEY,
        logo: '/images/chapa-logo.png',
        supportedMethods: [
          {
            id: 'telebirr',
            name: 'Telebirr',
            description: 'Pay with Telebirr mobile money',
            icon: '📱'
          },
          {
            id: 'cbe_birr',
            name: 'CBE Birr',
            description: 'Commercial Bank of Ethiopia mobile banking',
            icon: '🏦'
          },
          {
            id: 'awash_birr',
            name: 'Awash Birr',
            description: 'Awash Bank mobile banking',
            icon: '🏦'
          },
          {
            id: 'visa',
            name: 'Visa Card',
            description: 'Pay with Visa credit/debit card',
            icon: '💳'
          },
          {
            id: 'mastercard',
            name: 'Mastercard',
            description: 'Pay with Mastercard credit/debit card',
            icon: '💳'
          }
        ]
      }
    ];

    res.json({
      success: true,
      data: methods
    });

  } catch (error) {
    console.error('❌ Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
};

// Helper function to verify Chapa webhook signature
function verifyChapaWebhookSignature(payload, signature) {
  try {
    const crypto = require('crypto');
    const secret = process.env.CHAPA_WEBHOOK_SECRET;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
}