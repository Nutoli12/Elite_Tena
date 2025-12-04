import db from '../models/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paymentService = require('../../services/payment.cjs');

const { Payment, Appointment } = db;

/**
 * Initialize a payment with Chapa or Telebirr
 */
export const initializePayment = async (req, res) => {
  try {
    const {
      appointmentId,
      patientWallet,
      doctorWallet,
      amount,
      provider = 'chapa', // Default to chapa
      email,
      firstName,
      lastName,
      phoneNumber
    } = req.body;

    console.log('💳 Initializing payment for appointment:', appointmentId, 'with', provider);

    // Validate required fields
    if (!patientWallet || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWallet and amount are required'
      });
    }

    // Generate unique transaction reference
    const txRef = `ELITE-${Date.now()}-${appointmentId || 'direct'}`;

    // For demo purposes, simulate payment initialization
    const mockPaymentUrl = `https://checkout.chapa.co/checkout/payment/${txRef}`;

    // Create payment record in database
    const payment = await Payment.create({
      appointmentId: appointmentId || null,
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: doctorWallet ? doctorWallet.toLowerCase() : null,
      amount,
      currency: 'ETB',
      status: 'pending',
      paymentMethod: provider,
      transactionId: txRef
    });

    console.log('✅ Payment initialized:', payment.id);

    // Simulate successful initialization
    res.status(201).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        payment,
        checkoutUrl: mockPaymentUrl,
        txRef,
        // For demo - auto-complete after 5 seconds
        demoMode: true,
        autoCompleteIn: 5000
      }
    });

    // Auto-complete payment after 5 seconds for demo
    setTimeout(async () => {
      try {
        await payment.update({ status: 'completed' });
        console.log('✅ Demo payment auto-completed:', payment.id);
      } catch (error) {
        console.error('❌ Auto-complete error:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Initialize payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment',
      message: error.message
    });
  }
};

/**
 * Get all payments (with optional filtering)
 */
export const getPayments = async (req, res) => {
  try {
    const { patientWallet, doctorWallet, status } = req.query;

    console.log('🔍 Fetching payments...');

    const where = {};
    if (patientWallet) {
      where.patientWallet = patientWallet.toLowerCase();
    }
    if (doctorWallet) {
      where.doctorWallet = doctorWallet.toLowerCase();
    }
    if (status) {
      where.status = status;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'reason']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${payments.length} payments`);

    res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error) {
    console.error('❌ Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error.message
    });
  }
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching payment:', id);

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'reason']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: `No payment found with id: ${id}`
      });
    }

    console.log('✅ Payment found');

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('❌ Get payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
      message: error.message
    });
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionHash } = req.body;

    console.log('🔄 Updating payment status:', id, 'to', status);

    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const updates = { status };
    if (transactionHash) {
      updates.transactionHash = transactionHash;
    }

    await payment.update(updates);

    // If payment completed, update appointment payment status
    if (status === 'completed') {
      const appointment = await Appointment.findByPk(payment.appointmentId);
      if (appointment) {
        await appointment.update({ paymentStatus: 'paid' });
      }
    }

    console.log('✅ Payment status updated');

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('❌ Update payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status',
      message: error.message
    });
  }
};

/**
 * Verify payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { txRef, provider } = req.query;

    console.log('🔍 Verifying payment:', txRef, 'with', provider);

    if (!txRef || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Missing txRef or provider'
      });
    }

    // Verify with payment provider
    const result = await paymentService.verifyPayment(provider, txRef);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        message: result.error
      });
    }

    // Update payment in database
    const payment = await Payment.findOne({
      where: { transactionId: txRef }
    });

    if (payment) {
      const status = result.status === 'success' || result.status === 'SUCCESS' ? 'completed' : 'failed';
      await payment.update({ status });

      // Update appointment if payment successful
      if (status === 'completed') {
        const appointment = await Appointment.findByPk(payment.appointmentId);
        if (appointment) {
          await appointment.update({ paymentStatus: 'paid' });
        }
      }
    }

    console.log('✅ Payment verified:', result.status);

    res.json({
      success: true,
      data: result.data,
      status: result.status
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
};

/**
 * Payment callback (for Chapa)
 */
export const paymentCallback = async (req, res) => {
  try {
    const { tx_ref, status } = req.query;

    console.log('📞 Payment callback received:', tx_ref, status);

    const payment = await Payment.findOne({
      where: { transactionId: tx_ref }
    });

    if (payment) {
      const paymentStatus = status === 'success' ? 'completed' : 'failed';
      await payment.update({ status: paymentStatus });

      if (paymentStatus === 'completed') {
        const appointment = await Appointment.findByPk(payment.appointmentId);
        if (appointment) {
          await appointment.update({ paymentStatus: 'paid' });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Payment callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Payment webhook (for Telebirr)
 */
export const paymentWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    console.log('🔔 Payment webhook received:', webhookData);

    // Process webhook data based on provider
    // Update payment status accordingly

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Payment webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Process payment (for demo purposes)
 */
export const processPayment = async (req, res) => {
  try {
    const {
      paymentId,
      amount,
      patientWallet,
      doctorWallet,
      appointmentId
    } = req.body;

    console.log('💳 Processing payment:', paymentId);

    // Create or update payment record
    let payment;
    if (paymentId) {
      payment = await Payment.findByPk(paymentId);
      if (payment) {
        await payment.update({ status: 'completed' });
      }
    } else {
      payment = await Payment.create({
        appointmentId: appointmentId || null,
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet: doctorWallet ? doctorWallet.toLowerCase() : null,
        amount,
        currency: 'ETB',
        status: 'completed',
        paymentMethod: 'chapa',
        transactionId: `ELITE-${Date.now()}`
      });
    }

    // Update appointment payment status if applicable
    if (appointmentId) {
      const appointment = await Appointment.findByPk(appointmentId);
      if (appointment) {
        await appointment.update({ paymentStatus: 'paid' });
      }
    }

    console.log('✅ Payment processed successfully');

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: payment
    });
  } catch (error) {
    console.error('❌ Process payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment',
      message: error.message
    });
  }
};

/**
 * Get supported payment methods
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'chapa',
        name: 'Chapa',
        description: 'Pay with Chapa',
        logo: '/images/chapa-logo.png',
        enabled: true
      },
      {
        id: 'telebirr',
        name: 'Telebirr',
        description: 'Pay with Telebirr',
        logo: '/images/telebirr-logo.png',
        enabled: true
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
      error: 'Failed to fetch payment methods',
      message: error.message
    });
  }
};
