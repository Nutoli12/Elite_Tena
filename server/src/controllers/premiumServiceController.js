import db from '../models/index.js';
const { Appointment, Doctor, Patient, User, DoctorPaymentSettings } = db;

/**
 * 💰 PREMIUM SERVICE CONTROLLER (PEER-TO-PEER PAYMENTS)
 * 
 * System DOES NOT process payments - only facilitates connection
 * Patients pay directly to doctors
 * No platform fees or transaction processing
 */

/**
 * 📋 Get doctor's payment settings
 */
export const getDoctorPaymentSettings = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('🔍 Fetching payment settings for doctor:', doctorWallet);

    // Try to find with exact match first, then lowercase
    let settings = await DoctorPaymentSettings.findOne({
      where: { doctorWalletAddress: doctorWallet }
    });

    if (!settings) {
      settings = await DoctorPaymentSettings.findOne({
        where: { doctorWalletAddress: doctorWallet.toLowerCase() }
      });
    }

    // Create default settings if none exist
    if (!settings) {
      try {
        settings = await DoctorPaymentSettings.create({
          doctorWalletAddress: doctorWallet.toLowerCase(),
          telebirrEnabled: false,
          cbeBirrEnabled: false,
          bankTransferEnabled: false,
          cashEnabled: true,
          videoCallFee: 50.00,
          chatFee: 30.00
        });
        console.log('✅ Created default payment settings');
      } catch (createError) {
        console.error('❌ Failed to create default settings:', createError.message);
        // Return default settings without saving if creation fails
        return res.json({
          success: true,
          data: {
            doctorWalletAddress: doctorWallet,
            telebirrEnabled: false,
            telebirrNumber: '',
            cbeBirrEnabled: false,
            cbeBirrAccount: '',
            bankTransferEnabled: false,
            bankName: '',
            bankAccountNumber: '',
            bankAccountName: '',
            cashEnabled: true,
            videoCallFee: 50.00,
            chatFee: 30.00
          }
        });
      }
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('❌ Get payment settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment settings',
      message: error.message
    });
  }
};

/**
 * 💳 Update doctor's payment settings
 */
export const updateDoctorPaymentSettings = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const updates = req.body;

    console.log('🔄 Updating payment settings for doctor:', doctorWallet);

    let settings = await DoctorPaymentSettings.findOne({
      where: { doctorWalletAddress: doctorWallet.toLowerCase() }
    });

    if (!settings) {
      // Create new settings
      settings = await DoctorPaymentSettings.create({
        doctorWalletAddress: doctorWallet.toLowerCase(),
        ...updates
      });
      console.log('✅ Created new payment settings');
    } else {
      // Update existing settings
      await settings.update(updates);
      console.log('✅ Updated payment settings');
    }

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings
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
 * 📝 Patient requests premium service
 */
export const requestPremiumService = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      serviceType,
      appointmentDate,
      reason,
      notes
    } = req.body;

    console.log('📝 Premium service request:', { serviceType, doctorWalletAddress });

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { walletAddress: patientWalletAddress.toLowerCase() }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Verify doctor exists
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWalletAddress.toLowerCase() }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Get doctor's payment settings to determine fee
    const paymentSettings = await DoctorPaymentSettings.findOne({
      where: { doctorWalletAddress: doctorWalletAddress.toLowerCase() }
    });

    const fee = serviceType === 'videoCall' 
      ? (paymentSettings?.videoCallFee || 50.00)
      : (paymentSettings?.chatFee || 30.00);

    // Create appointment with approval required
    const appointment = await Appointment.create({
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      appointmentDate,
      reason,
      notes,
      serviceType,
      fee,
      requiresApproval: true,
      approvalStatus: 'pending',
      status: 'scheduled',
      paymentStatus: 'pending',
      paymentMethod: 'free' // Will be updated after approval
    });

    console.log('✅ Premium service request created:', appointment.id);

    // TODO: Send notification to doctor

    res.status(201).json({
      success: true,
      message: 'Premium service request sent to doctor',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Request premium service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request premium service',
      message: error.message
    });
  }
};

/**
 * ✅ Doctor approves premium service request
 */
export const approvePremiumService = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      doctorWalletAddress,
      paymentMethod,
      paymentDetails,
      paymentInstructions
    } = req.body;

    console.log('✅ Approving premium service:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    if (appointment.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Appointment already processed'
      });
    }

    // Update appointment with approval and payment details
    await appointment.update({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: doctorWalletAddress.toLowerCase(),
      paymentMethod,
      doctorPaymentDetails: paymentDetails,
      paymentInstructions,
      paymentStatus: 'pending' // Waiting for patient payment
    });

    console.log('✅ Premium service approved');

    // TODO: Send notification to patient with payment details

    res.json({
      success: true,
      message: 'Premium service approved. Payment details sent to patient.',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Approve premium service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve premium service',
      message: error.message
    });
  }
};

/**
 * ❌ Doctor rejects premium service request
 */
export const rejectPremiumService = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorWalletAddress, rejectionReason } = req.body;

    console.log('❌ Rejecting premium service:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    await appointment.update({
      approvalStatus: 'rejected',
      rejectionReason,
      status: 'cancelled'
    });

    console.log('✅ Premium service rejected');

    // TODO: Send notification to patient

    res.json({
      success: true,
      message: 'Premium service request rejected',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Reject premium service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject premium service',
      message: error.message
    });
  }
};

/**
 * 📤 Patient uploads payment receipt
 */
export const uploadPaymentReceipt = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      patientWalletAddress,
      receiptUrl,
      transactionId,
      notes
    } = req.body;

    console.log('📤 Uploading payment receipt for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    if (appointment.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Appointment not approved yet'
      });
    }

    await appointment.update({
      paymentReceiptUrl: receiptUrl,
      paymentTransactionId: transactionId,
      paymentStatus: 'paid', // Waiting for doctor confirmation
      notes: notes || appointment.notes
    });

    console.log('✅ Payment receipt uploaded');

    // TODO: Send notification to doctor to verify payment

    res.json({
      success: true,
      message: 'Payment receipt uploaded. Waiting for doctor confirmation.',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Upload payment receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload payment receipt',
      message: error.message
    });
  }
};

/**
 * ✅ Doctor confirms payment received
 */
export const confirmPaymentReceived = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorWalletAddress } = req.body;

    console.log('✅ Confirming payment for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    if (appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'No payment receipt uploaded yet'
      });
    }

    await appointment.update({
      paymentStatus: 'confirmed',
      paymentConfirmedAt: new Date(),
      paymentConfirmedBy: doctorWalletAddress.toLowerCase(),
      status: 'scheduled' // Now fully confirmed
    });

    console.log('✅ Payment confirmed');

    // TODO: Send notification to patient

    res.json({
      success: true,
      message: 'Payment confirmed. Appointment scheduled.',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      message: error.message
    });
  }
};

/**
 * ❌ Doctor rejects payment proof
 */
export const rejectPaymentProof = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorWalletAddress, rejectionReason } = req.body;

    console.log('❌ Rejecting payment proof for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    await appointment.update({
      paymentStatus: 'pending',
      paymentRejectionReason: rejectionReason,
      paymentReceiptUrl: null, // Clear the rejected receipt
      paymentTransactionId: null
    });

    console.log('✅ Payment proof rejected');

    // TODO: Send notification to patient to resubmit

    res.json({
      success: true,
      message: 'Payment proof rejected. Patient notified to resubmit.',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Reject payment proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject payment proof',
      message: error.message
    });
  }
};

/**
 * 📊 Get doctor's pending approvals
 */
export const getDoctorPendingApprovals = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('📋 Fetching pending approvals for:', doctorWallet);

    const pendingApprovals = await Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet.toLowerCase(),
        requiresApproval: true,
        approvalStatus: 'pending'
      },
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    console.log(`✅ Found ${pendingApprovals.length} pending approvals`);

    res.json({
      success: true,
      data: pendingApprovals,
      count: pendingApprovals.length
    });

  } catch (error) {
    console.error('❌ Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals',
      message: error.message
    });
  }
};

/**
 * 📊 Get doctor's pending payment confirmations
 */
export const getDoctorPendingPayments = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('📋 Fetching pending payments for:', doctorWallet);

    const pendingPayments = await Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet.toLowerCase(),
        approvalStatus: 'approved',
        paymentStatus: 'paid' // Receipt uploaded, waiting for confirmation
      },
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    console.log(`✅ Found ${pendingPayments.length} pending payment confirmations`);

    res.json({
      success: true,
      data: pendingPayments,
      count: pendingPayments.length
    });

  } catch (error) {
    console.error('❌ Get pending payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending payments',
      message: error.message
    });
  }
};

/**
 * 📊 Get patient's premium service requests
 */
export const getPatientPremiumRequests = async (req, res) => {
  try {
    const { patientWallet } = req.params;

    console.log('📋 Fetching premium requests for patient:', patientWallet);

    const requests = await Appointment.findAll({
      where: {
        patientWalletAddress: patientWallet.toLowerCase(),
        requiresApproval: true
      },
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${requests.length} premium requests`);

    res.json({
      success: true,
      data: requests,
      count: requests.length
    });

  } catch (error) {
    console.error('❌ Get premium requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium requests',
      message: error.message
    });
  }
};
