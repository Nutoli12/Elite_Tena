import db from '../models/index.js';
import { createRequire } from 'module';
import { Op } from 'sequelize';
import sequelize from 'sequelize';
const require = createRequire(import.meta.url);

// Import payment service and ensure environment variables are available
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
      amount,
      provider = 'chapa', // Default to chapa
      email,
      firstName,
      lastName,
      phoneNumber,
      description = 'Healthcare Consultation Payment'
    } = req.body;

    console.log('💳 Initializing payment for appointment:', appointmentId, 'with', provider);

    // Validate required fields
    if (!patientWallet || !amount || !email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWallet, amount, email, firstName, and lastName are required'
      });
    }

    // Validate appointment exists and is not already paid
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }
      
      if (appointment.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Appointment already paid'
        });
      }
    }

    // Generate unique transaction reference
    const txRef = `ELITE-${Date.now()}-${appointmentId || 'direct'}`;

    // Prepare payment data
    const paymentData = {
      amount: parseFloat(amount),
      currency: 'ETB',
      email,
      firstName,
      lastName,
      phoneNumber,
      txRef,
      title: 'Elite Tena', // Max 16 characters for Chapa
      description,
      callbackUrl: `${process.env.BACKEND_URL}/api/payments/callback`,
      returnUrl: `${process.env.FRONTEND_URL}/payments/success`
    };

    // Initialize payment with selected provider
    const result = await paymentService.initializePayment(provider, paymentData);

    if (!result.success) {
      console.error('❌ Payment service error:', result);
      
      // For demo purposes, if Chapa is not properly configured, create a mock payment
      if (provider === 'chapa' && result.error.includes('secret key')) {
        console.log('🔧 Using demo mode for payment');
        
        // Create payment record in database
        const payment = await Payment.create({
          appointmentId: appointmentId || null,
          patientWallet: patientWallet.toLowerCase(),
          doctorWallet: appointment?.doctorWalletAddress || null,
          amount: parseFloat(amount),
          currency: 'ETB',
          status: 'pending',
          paymentMethod: provider,
          transactionId: txRef,
          providerData: { demo: true, message: 'Demo payment - Chapa not configured' }
        });

        // Update appointment payment status to pending
        if (appointment) {
          await appointment.update({ 
            paymentStatus: 'pending',
            fee: parseFloat(amount)
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Demo payment initialized (Chapa not configured)',
          data: {
            payment: {
              id: payment.id,
              appointmentId: payment.appointmentId,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              paymentMethod: payment.paymentMethod,
              transactionId: payment.transactionId
            },
            checkoutUrl: `${process.env.FRONTEND_URL}/payments/demo?txRef=${txRef}`,
            txRef,
            provider,
            demo: true
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Payment initialization failed',
        message: result.error,
        details: result.details,
        provider: provider,
        configured: provider === 'chapa' ? !!process.env.CHAPA_SECRET_KEY : !!process.env.TELEBIRR_APP_ID
      });
    }

    // Create payment record in database
    const payment = await Payment.create({
      appointmentId: appointmentId || null,
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: appointment?.doctorWalletAddress || null,
      amount: parseFloat(amount),
      currency: 'ETB',
      status: 'pending',
      paymentMethod: provider,
      transactionId: txRef,
      providerData: result.data // Store provider response data
    });

    // Update appointment payment status to pending
    if (appointment) {
      await appointment.update({ 
        paymentStatus: 'pending',
        fee: parseFloat(amount)
      });
    }

    console.log('✅ Payment initialized:', payment.id);

    res.status(201).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        payment: {
          id: payment.id,
          appointmentId: payment.appointmentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId
        },
        checkoutUrl: result.checkoutUrl || result.data?.checkout_url || result.data?.paymentUrl,
        txRef,
        provider
      }
    });

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

    // Find payment in database
    const payment = await Payment.findOne({
      where: { transactionId: txRef },
      include: [
        {
          model: Appointment,
          as: 'appointment'
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // If already verified, return current status
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        data: payment,
        status: 'completed',
        message: 'Payment already verified'
      });
    }

    // Check if this is a demo payment
    if (payment.providerData && payment.providerData.demo) {
      console.log('🔧 Demo payment verification');
      
      // For demo, simulate successful payment after 5 seconds
      const createdTime = new Date(payment.createdAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - createdTime;
      
      if (timeDiff > 5000) { // 5 seconds
        await payment.update({ 
          status: 'completed',
          providerTransactionId: txRef,
          verifiedAt: new Date()
        });

        return res.json({
          success: true,
          data: {
            payment: {
              id: payment.id,
              appointmentId: payment.appointmentId,
              amount: payment.amount,
              status: 'completed',
              paymentMethod: payment.paymentMethod,
              transactionId: payment.transactionId,
              providerTransactionId: txRef,
              verifiedAt: new Date()
            },
            demo: true
          },
          status: 'completed'
        });
      } else {
        return res.json({
          success: true,
          data: payment,
          status: 'pending',
          message: 'Demo payment still processing'
        });
      }
    }

    // Verify with payment provider
    const result = await paymentService.verifyPayment(provider, txRef);

    if (!result.success) {
      // Update payment as failed
      await payment.update({ 
        status: 'failed',
        failureReason: result.error,
        verifiedAt: new Date()
      });

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        message: result.error
      });
    }

    // Determine payment status from provider response
    let paymentStatus = 'failed';
    let providerTransactionId = null;

    if (provider === 'chapa') {
      paymentStatus = result.status === 'success' ? 'completed' : 'failed';
      providerTransactionId = result.data?.tx_ref || result.data?.reference;
    } else if (provider === 'telebirr') {
      paymentStatus = result.status === 'TRADE_SUCCESS' ? 'completed' : 'failed';
      providerTransactionId = result.data?.outTradeNo;
    }

    // Update payment in database
    await payment.update({ 
      status: paymentStatus,
      providerTransactionId,
      providerData: result.data,
      verifiedAt: new Date(),
      failureReason: paymentStatus === 'failed' ? 'Payment not successful' : null
    });

    // Update appointment if payment successful (trigger will handle this automatically)
    if (paymentStatus === 'completed' && payment.appointment) {
      console.log('✅ Payment completed for appointment:', payment.appointmentId);
    }

    console.log('✅ Payment verified:', paymentStatus);

    res.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          appointmentId: payment.appointmentId,
          amount: payment.amount,
          status: paymentStatus,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          providerTransactionId,
          verifiedAt: new Date()
        },
        providerData: result.data
      },
      status: paymentStatus
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
    const { tx_ref, status, trx_ref } = req.query;
    const txRef = tx_ref || trx_ref;

    console.log('📞 Chapa callback received:', { txRef, status, body: req.body });

    if (!txRef) {
      return res.status(400).json({ success: false, error: 'Missing transaction reference' });
    }

    const payment = await Payment.findOne({
      where: { transactionId: txRef }
    });

    if (!payment) {
      console.log('❌ Payment not found for tx_ref:', txRef);
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Verify payment with Chapa to ensure authenticity
    const verificationResult = await paymentService.verifyPayment('chapa', txRef);
    
    let paymentStatus = 'failed';
    if (verificationResult.success && verificationResult.status === 'success') {
      paymentStatus = 'completed';
    }

    await payment.update({ 
      status: paymentStatus,
      providerTransactionId: verificationResult.data?.tx_ref,
      providerData: verificationResult.data,
      verifiedAt: new Date()
    });

    console.log('✅ Chapa callback processed:', paymentStatus);

    res.json({ success: true, status: paymentStatus });
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

    console.log('🔔 Telebirr webhook received:', webhookData);

    const { outTradeNo, tradeStatus, totalAmount } = webhookData;

    if (!outTradeNo) {
      return res.status(400).json({ success: false, error: 'Missing outTradeNo' });
    }

    const payment = await Payment.findOne({
      where: { transactionId: outTradeNo }
    });

    if (!payment) {
      console.log('❌ Payment not found for outTradeNo:', outTradeNo);
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Verify payment with Telebirr
    const verificationResult = await paymentService.verifyPayment('telebirr', outTradeNo);
    
    let paymentStatus = 'failed';
    if (verificationResult.success && verificationResult.status === 'TRADE_SUCCESS') {
      paymentStatus = 'completed';
    }

    await payment.update({ 
      status: paymentStatus,
      providerTransactionId: outTradeNo,
      providerData: webhookData,
      verifiedAt: new Date()
    });

    console.log('✅ Telebirr webhook processed:', paymentStatus);

    res.json({ success: true, status: paymentStatus });
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
 * Get payment status for appointment
 */
export const getAppointmentPaymentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    console.log('🔍 Checking payment status for appointment:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const payment = await Payment.findOne({
      where: { appointmentId },
      order: [['createdAt', 'DESC']] // Get latest payment
    });

    res.json({
      success: true,
      data: {
        appointmentId,
        paymentStatus: appointment.paymentStatus,
        fee: appointment.fee,
        payment: payment ? {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
          verifiedAt: payment.verifiedAt
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Get appointment payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      message: error.message
    });
  }
};

/**
 * Get supported payment methods
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const chapaConfigured = !!process.env.CHAPA_SECRET_KEY;
    const telebirrConfigured = !!process.env.TELEBIRR_APP_ID;

    const methods = [
      {
        id: 'chapa',
        name: 'Chapa',
        description: 'Pay with Cards, Mobile Money, Bank Transfer',
        logo: '/images/chapa-logo.png',
        enabled: chapaConfigured,
        configured: chapaConfigured,
        supportedMethods: ['visa', 'mastercard', 'telebirr', 'cbe_birr', 'awash_birr']
      },
      {
        id: 'telebirr',
        name: 'Telebirr',
        description: 'Pay with Telebirr Mobile Money',
        logo: '/images/telebirr-logo.png',
        enabled: telebirrConfigured,
        configured: telebirrConfigured,
        supportedMethods: ['telebirr']
      }
    ];

    console.log('💳 Payment methods status:', {
      chapa: { configured: chapaConfigured, keyLength: process.env.CHAPA_SECRET_KEY?.length },
      telebirr: { configured: telebirrConfigured, appId: !!process.env.TELEBIRR_APP_ID }
    });

    res.json({
      success: true,
      data: methods.filter(method => method.enabled),
      debug: {
        chapaConfigured,
        telebirrConfigured,
        totalMethods: methods.filter(method => method.enabled).length
      }
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

/**
 * Get payment statistics (for admin)
 */
export const getPaymentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = await Payment.findAll({
      attributes: [
        'paymentMethod',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount']
      ],
      where: whereClause,
      group: ['paymentMethod', 'status'],
      raw: true
    });

    const totalPayments = await Payment.count({ where: whereClause });
    const totalRevenue = await Payment.sum('amount', { 
      where: { ...whereClause, status: 'completed' } 
    });

    res.json({
      success: true,
      data: {
        statistics: stats,
        summary: {
          totalPayments,
          totalRevenue: totalRevenue || 0,
          completedPayments: stats.filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + parseInt(s.count), 0),
          failedPayments: stats.filter(s => s.status === 'failed')
            .reduce((sum, s) => sum + parseInt(s.count), 0)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics',
      message: error.message
    });
  }
};
