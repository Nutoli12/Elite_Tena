import appointmentPaymentFlow from '../services/appointmentPaymentFlow.js';
import db from '../models/index.js';

const { Appointment, Doctor, DoctorPaymentSettings, Payment } = db;

/**
 * 💰 APPOINTMENT PAYMENT CONTROLLER
 * Handles Phase 2: Approval & Payment workflow endpoints
 */

/**
 * 📊 Calculate appointment fee
 * POST /api/appointments/calculate-fee
 */
export const calculateAppointmentFee = async (req, res) => {
  try {
    const {
      doctorWallet,
      serviceType = 'inPerson',
      appointmentDate,
      duration = 30,
      priority = 'routine'
    } = req.body;

    console.log('💰 Calculating appointment fee...');

    if (!doctorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address is required'
      });
    }

    const appointmentData = {
      serviceType,
      appointmentDate: appointmentDate || new Date(),
      duration,
      priority
    };

    const feeCalculation = await appointmentPaymentFlow.calculateAppointmentFee(
      appointmentData,
      doctorWallet
    );

    if (!feeCalculation.success) {
      return res.status(400).json({
        success: false,
        error: feeCalculation.error
      });
    }

    // Get available payment methods
    const paymentMethods = await getAvailablePaymentMethods(doctorWallet);

    res.json({
      success: true,
      data: {
        fee: feeCalculation.fee,
        requiresPayment: feeCalculation.requiresPayment,
        requiresApproval: feeCalculation.requiresApproval,
        breakdown: feeCalculation.breakdown,
        paymentMethods: paymentMethods,
        serviceType: appointmentData.serviceType,
        estimatedDuration: appointmentData.duration
      }
    });

  } catch (error) {
    console.error('❌ Calculate fee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate appointment fee',
      message: error.message
    });
  }
};

/**
 * 👨‍⚕️ Doctor approves or rejects appointment
 * POST /api/appointments/:id/approval
 */
export const processAppointmentApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, doctorWallet } = req.body;

    console.log('👨‍⚕️ Processing appointment approval:', id, action);

    if (!action || !doctorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Action and doctor wallet are required'
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

    const result = await appointmentPaymentFlow.processAppointmentApproval(
      id,
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
        appointmentId: id,
        status: result.status,
        nextStep: result.nextStep,
        reason: result.reason
      }
    });

  } catch (error) {
    console.error('❌ Appointment approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process appointment approval',
      message: error.message
    });
  }
};

/**
 * 💳 Initialize payment for approved appointment
 * POST /api/appointments/:id/payment/initialize
 */
export const initializeAppointmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { patientWallet, paymentMethod = 'chapa' } = req.body;

    console.log('💳 Initializing appointment payment:', id);

    if (!patientWallet) {
      return res.status(400).json({
        success: false,
        error: 'Patient wallet address is required'
      });
    }

    const result = await appointmentPaymentFlow.initializeAppointmentPayment(
      id,
      patientWallet,
      paymentMethod
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        txRef: result.txRef,
        provider: result.provider,
        demo: result.demo || false
      }
    });

  } catch (error) {
    console.error('❌ Payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment',
      message: error.message
    });
  }
};

/**
 * ✅ Verify appointment payment
 * GET /api/appointments/:id/payment/verify
 */
export const verifyAppointmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { txRef, provider = 'chapa' } = req.query;

    console.log('✅ Verifying appointment payment:', id, txRef);

    if (!txRef) {
      return res.status(400).json({
        success: false,
        error: 'Transaction reference is required'
      });
    }

    const result = await appointmentPaymentFlow.verifyAppointmentPayment(txRef, provider);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Payment verification completed',
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
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
};

/**
 * 📊 Get appointment payment status and workflow
 * GET /api/appointments/:id/payment/status
 */
export const getAppointmentPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📊 Getting appointment payment status:', id);

    const result = await appointmentPaymentFlow.getAppointmentPaymentStatus(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      message: error.message
    });
  }
};

/**
 * 📋 Get doctor's pending approval requests
 * GET /api/appointments/doctor/:doctorWallet/pending-approvals
 */
export const getDoctorPendingApprovals = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('📋 Getting pending approvals for doctor:', doctorWallet);

    const pendingAppointments = await Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet.toLowerCase(),
        requiresApproval: true,
        approvalStatus: 'pending'
      },
      include: [
        {
          model: db.Patient,
          as: 'patientDetails',
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Enhance with patient information
    const enhancedAppointments = await Promise.all(
      pendingAppointments.map(async (appointment) => {
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
          createdAt: appointment.createdAt,
          priority: appointment.priority || 'routine'
        };
      })
    );

    res.json({
      success: true,
      data: enhancedAppointments,
      count: enhancedAppointments.length
    });

  } catch (error) {
    console.error('❌ Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending approvals',
      message: error.message
    });
  }
};

/**
 * 💰 Get doctor's payment settings
 * GET /api/appointments/doctor/:doctorWallet/payment-settings
 */
export const getDoctorPaymentSettings = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('💰 Getting payment settings for doctor:', doctorWallet);

    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() },
      include: [{
        model: DoctorPaymentSettings,
        as: 'paymentSettings',
        required: false
      }]
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    const settings = doctor.paymentSettings || {};

    res.json({
      success: true,
      data: {
        doctorWallet: doctor.walletAddress,
        specialization: doctor.specialization,
        paymentSettings: {
          inPersonFee: settings.inPersonFee || 0,
          videoCallFee: settings.videoCallFee || 100,
          chatFee: settings.chatFee || 50,
          acceptsChapa: settings.acceptsChapa !== false, // Default true
          acceptsTelebirr: settings.acceptsTelebirr !== false, // Default true
          telebirrNumber: settings.telebirrNumber || null,
          bankAccount: settings.bankAccount || null,
          paymentInstructions: settings.paymentInstructions || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Get payment settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment settings',
      message: error.message
    });
  }
};

/**
 * 🔧 Update doctor's payment settings
 * PUT /api/appointments/doctor/:doctorWallet/payment-settings
 */
export const updateDoctorPaymentSettings = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const {
      inPersonFee,
      videoCallFee,
      chatFee,
      acceptsChapa,
      acceptsTelebirr,
      telebirrNumber,
      bankAccount,
      paymentInstructions
    } = req.body;

    console.log('🔧 Updating payment settings for doctor:', doctorWallet);

    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Find or create payment settings
    let [paymentSettings, created] = await DoctorPaymentSettings.findOrCreate({
      where: { doctorWallet: doctorWallet.toLowerCase() },
      defaults: {
        doctorWallet: doctorWallet.toLowerCase(),
        inPersonFee: inPersonFee || 0,
        videoCallFee: videoCallFee || 100,
        chatFee: chatFee || 50,
        acceptsChapa: acceptsChapa !== false,
        acceptsTelebirr: acceptsTelebirr !== false,
        telebirrNumber,
        bankAccount,
        paymentInstructions
      }
    });

    if (!created) {
      // Update existing settings
      await paymentSettings.update({
        inPersonFee: inPersonFee !== undefined ? inPersonFee : paymentSettings.inPersonFee,
        videoCallFee: videoCallFee !== undefined ? videoCallFee : paymentSettings.videoCallFee,
        chatFee: chatFee !== undefined ? chatFee : paymentSettings.chatFee,
        acceptsChapa: acceptsChapa !== undefined ? acceptsChapa : paymentSettings.acceptsChapa,
        acceptsTelebirr: acceptsTelebirr !== undefined ? acceptsTelebirr : paymentSettings.acceptsTelebirr,
        telebirrNumber: telebirrNumber !== undefined ? telebirrNumber : paymentSettings.telebirrNumber,
        bankAccount: bankAccount !== undefined ? bankAccount : paymentSettings.bankAccount,
        paymentInstructions: paymentInstructions !== undefined ? paymentInstructions : paymentSettings.paymentInstructions
      });
    }

    console.log('✅ Payment settings updated');

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: paymentSettings
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

// Helper function to get available payment methods
async function getAvailablePaymentMethods(doctorWallet) {
  try {
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() },
      include: [{
        model: DoctorPaymentSettings,
        as: 'paymentSettings',
        required: false
      }]
    });

    const settings = doctor?.paymentSettings || {};
    const methods = [];

    // System payment methods
    if (settings.acceptsChapa !== false && process.env.CHAPA_SECRET_KEY) {
      methods.push({
        id: 'chapa',
        name: 'Chapa Payment',
        description: 'Pay with cards, mobile money, or bank transfer',
        type: 'system',
        enabled: true,
        logo: '/images/chapa-logo.png'
      });
    }

    if (settings.acceptsTelebirr !== false && process.env.TELEBIRR_APP_ID) {
      methods.push({
        id: 'telebirr',
        name: 'Telebirr',
        description: 'Pay with Telebirr mobile money',
        type: 'system',
        enabled: true,
        logo: '/images/telebirr-logo.png'
      });
    }

    // Peer-to-peer methods (for future implementation)
    if (settings.telebirrNumber) {
      methods.push({
        id: 'telebirr_p2p',
        name: 'Telebirr (Direct)',
        description: `Pay directly to doctor's Telebirr: ${settings.telebirrNumber}`,
        type: 'peer_to_peer',
        enabled: false, // Not implemented yet
        details: settings.telebirrNumber
      });
    }

    if (settings.bankAccount) {
      methods.push({
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Transfer to doctor\'s bank account',
        type: 'peer_to_peer',
        enabled: false, // Not implemented yet
        details: settings.bankAccount
      });
    }

    return methods;

  } catch (error) {
    console.error('❌ Get payment methods error:', error);
    return [];
  }
}