import PaymentFirstWorkflow from '../services/PaymentFirstWorkflow.js';
import db from '../models/index.js';

const { Appointment, Doctor, DoctorPaymentSettings } = db;

/**
 * 💰 PAYMENT-FIRST CONTROLLER
 * 🎯 Implements correct workflow: Payment BEFORE Doctor Approval
 */

/**
 * 💰 Get upfront pricing for service type
 * GET /api/payment-first/pricing/:doctorWallet/:serviceType
 */
export const getServicePricing = async (req, res) => {
  try {
    const { doctorWallet, serviceType } = req.params;

    console.log('💰 Getting service pricing:', { doctorWallet, serviceType });

    if (!doctorWallet || !serviceType) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet and service type are required'
      });
    }

    const result = await PaymentFirstWorkflow.getServicePricing(serviceType, doctorWallet);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Service pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service pricing',
      message: error.message
    });
  }
};

/**
 * 📅 Create appointment (free services only)
 * POST /api/payment-first/create-appointment
 */
export const createFreeAppointment = async (req, res) => {
  try {
    const {
      patientWallet,
      doctorWallet,
      serviceType,
      appointmentDate,
      reason,
      duration = 30
    } = req.body;

    console.log('📅 Creating free appointment:', { serviceType, patientWallet });

    if (!patientWallet || !doctorWallet || !serviceType || !appointmentDate) {
      return res.status(400).json({
        success: false,
        error: 'Patient wallet, doctor wallet, service type, and appointment date are required'
      });
    }

    const appointmentData = {
      serviceType,
      doctorWallet,
      appointmentDate,
      reason,
      duration
    };

    const result = await PaymentFirstWorkflow.createAppointmentWithPaymentFirst(
      appointmentData,
      patientWallet
    );

    if (!result.success) {
      if (result.error === 'PAYMENT_REQUIRED_FIRST') {
        return res.status(402).json({
          success: false,
          error: result.error,
          message: result.message,
          fee: result.fee,
          paymentRequired: true,
          nextStep: result.nextStep
        });
      }

      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.appointment
    });

  } catch (error) {
    console.error('❌ Free appointment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error.message
    });
  }
};

/**
 * 💳 Initialize payment for premium service
 * POST /api/payment-first/initialize-premium-payment
 */
export const initializePremiumPayment = async (req, res) => {
  try {
    const {
      patientWallet,
      doctorWallet,
      serviceType,
      appointmentDate,
      reason,
      duration = 30
    } = req.body;

    console.log('💳 Initializing premium payment:', { serviceType, patientWallet });

    if (!patientWallet || !doctorWallet || !serviceType || !appointmentDate) {
      return res.status(400).json({
        success: false,
        error: 'All appointment details are required'
      });
    }

    // Validate service type requires payment
    if (!['videoCall', 'chat'].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        error: 'Payment initialization only available for video and chat consultations'
      });
    }

    const serviceData = {
      serviceType,
      doctorWallet,
      appointmentDate,
      reason,
      duration
    };

    const result = await PaymentFirstWorkflow.initializePaymentForPremiumService(
      serviceData,
      patientWallet
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        appointment: result.appointment,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        txRef: result.txRef
      }
    });

  } catch (error) {
    console.error('❌ Premium payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize premium payment',
      message: error.message
    });
  }
};

/**
 * ✅ Complete payment and send for approval
 * POST /api/payment-first/complete-payment/:txRef
 */
export const completePaymentAndSendForApproval = async (req, res) => {
  try {
    const { txRef } = req.params;

    console.log('✅ Completing payment and sending for approval:', txRef);

    if (!txRef) {
      return res.status(400).json({
        success: false,
        error: 'Transaction reference is required'
      });
    }

    const result = await PaymentFirstWorkflow.completePaymentAndSendForApproval(txRef);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.appointment
    });

  } catch (error) {
    console.error('❌ Payment completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete payment',
      message: error.message
    });
  }
};

/**
 * 👨‍⚕️ Doctor approval with automatic refund
 * POST /api/payment-first/doctor-approval/:appointmentId
 */
export const processDoctorApprovalWithRefund = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorWallet, action, reason } = req.body;

    console.log('👨‍⚕️ Processing doctor approval with refund:', { appointmentId, action });

    if (!appointmentId || !doctorWallet || !action) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID, doctor wallet, and action are required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "approve" or "reject"'
      });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const result = await PaymentFirstWorkflow.processDoctorApprovalWithRefund(
      appointmentId,
      doctorWallet,
      action,
      reason
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        status: result.status,
        nextStep: result.nextStep,
        reason: result.reason,
        refundStatus: result.refundStatus
      }
    });

  } catch (error) {
    console.error('❌ Doctor approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process doctor approval',
      message: error.message
    });
  }
};

/**
 * 📊 Get doctor's paid appointment queue
 * GET /api/payment-first/doctor-queue/:doctorWallet
 */
export const getDoctorPaidQueue = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('📊 Getting doctor paid queue:', doctorWallet);

    // Get appointments that are paid and awaiting approval
    const paidAppointments = await Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet.toLowerCase(),
        paymentStatus: 'paid',
        approvalStatus: 'pending',
        status: 'awaiting_approval'
      },
      include: [
        {
          model: db.Patient,
          as: 'patientDetails',
          required: false
        }
      ],
      order: [['paymentConfirmedAt', 'ASC']] // First paid, first reviewed
    });

    // Enhance with patient information
    const enhancedAppointments = await Promise.all(
      paidAppointments.map(async (appointment) => {
        const patientUser = await db.User.findOne({
          where: { walletAddress: appointment.patientWalletAddress }
        });

        const patientName = appointment.patientDetails?.name || 
                           patientUser?.profileData?.name || 
                           patientUser?.profileData?.firstName || 
                           'Unknown Patient';

        return {
          id: appointment.id,
          patientName,
          patientWallet: appointment.patientWalletAddress,
          appointmentDate: appointment.appointmentDate,
          serviceType: appointment.serviceType,
          reason: appointment.reason,
          fee: appointment.fee,
          duration: appointment.duration,
          paymentConfirmedAt: appointment.paymentConfirmedAt,
          isPaid: true,
          priority: 'paid_request' // Highlight that this is a paid request
        };
      })
    );

    res.json({
      success: true,
      data: enhancedAppointments,
      count: enhancedAppointments.length,
      message: enhancedAppointments.length > 0 
        ? `${enhancedAppointments.length} paid appointment(s) awaiting your approval`
        : 'No paid appointments pending approval'
    });

  } catch (error) {
    console.error('❌ Get doctor paid queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get doctor queue',
      message: error.message
    });
  }
};

/**
 * 🔧 Update doctor payment settings with minimums
 * PUT /api/payment-first/doctor-settings/:doctorWallet
 */
export const updateDoctorPaymentSettings = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const {
      inPersonFee,
      videoCallFee,
      chatFee,
      acceptsChapa = true,
      acceptsTelebirr = true
    } = req.body;

    console.log('🔧 Updating doctor payment settings:', doctorWallet);

    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Enforce minimum fees for premium services
    const minimumFees = {
      videoCall: 400,
      chat: 400
    };

    const validatedFees = {
      inPersonFee: Math.max(parseFloat(inPersonFee) || 0, 0), // Can be free
      videoCallFee: Math.max(parseFloat(videoCallFee) || minimumFees.videoCall, minimumFees.videoCall),
      chatFee: Math.max(parseFloat(chatFee) || minimumFees.chat, minimumFees.chat)
    };

    // Find or create payment settings
    let [paymentSettings, created] = await DoctorPaymentSettings.findOrCreate({
      where: { doctorWallet: doctorWallet.toLowerCase() },
      defaults: {
        doctorWallet: doctorWallet.toLowerCase(),
        ...validatedFees,
        acceptsChapa,
        acceptsTelebirr
      }
    });

    if (!created) {
      await paymentSettings.update({
        ...validatedFees,
        acceptsChapa,
        acceptsTelebirr
      });
    }

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: {
        ...validatedFees,
        acceptsChapa,
        acceptsTelebirr,
        minimumEnforced: {
          videoCall: `Minimum ${minimumFees.videoCall} ETB enforced`,
          chat: `Minimum ${minimumFees.chat} ETB enforced`
        }
      }
    });

  } catch (error) {
    console.error('❌ Update payment settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment settings',
      message: error.message
    });
  }
};

/**
 * 📈 Get payment-first analytics
 * GET /api/payment-first/analytics/:doctorWallet
 */
export const getPaymentFirstAnalytics = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const { startDate, endDate } = req.query;

    console.log('📈 Getting payment-first analytics:', doctorWallet);

    const whereClause = {
      doctorWalletAddress: doctorWallet.toLowerCase()
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      attributes: [
        'serviceType',
        'fee',
        'paymentStatus',
        'approvalStatus',
        'status',
        'createdAt',
        'paymentConfirmedAt',
        'approvedAt'
      ]
    });

    // Calculate analytics
    const analytics = {
      totalAppointments: appointments.length,
      paidAppointments: appointments.filter(a => a.paymentStatus === 'paid').length,
      freeAppointments: appointments.filter(a => a.fee === 0).length,
      totalRevenue: appointments
        .filter(a => a.paymentStatus === 'paid')
        .reduce((sum, a) => sum + parseFloat(a.fee), 0),
      approvalRate: 0,
      averageApprovalTime: 0,
      byServiceType: {},
      recentTrends: {}
    };

    // Calculate approval rate
    const approvedPaid = appointments.filter(a => 
      a.paymentStatus === 'paid' && a.approvalStatus === 'approved'
    ).length;
    const totalPaid = appointments.filter(a => a.paymentStatus === 'paid').length;
    
    if (totalPaid > 0) {
      analytics.approvalRate = Math.round((approvedPaid / totalPaid) * 100);
    }

    // Group by service type
    appointments.forEach(appointment => {
      const serviceType = appointment.serviceType;
      if (!analytics.byServiceType[serviceType]) {
        analytics.byServiceType[serviceType] = {
          count: 0,
          revenue: 0,
          approvalRate: 0
        };
      }
      analytics.byServiceType[serviceType].count++;
      if (appointment.paymentStatus === 'paid') {
        analytics.byServiceType[serviceType].revenue += parseFloat(appointment.fee);
      }
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Payment-first analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message
    });
  }
};