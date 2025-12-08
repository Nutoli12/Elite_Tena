import db from '../models/index.js';
const { Appointment, Patient, Doctor, User, Notification } = db;
import { sendNotification } from '../services/socketService.js';

/**
 * 🆕 PHASE 3: Doctor approves paid appointment
 */
export const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet, paymentDetails } = req.body;

    console.log('✅ Doctor approving appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Appointment already approved'
      });
    }

    // Update appointment
    await appointment.update({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: doctorWallet,
      status: 'scheduled' // Keep as 'scheduled' - valid ENUM value
    });

    // Send notification to patient
    try {
      await sendNotification(
        appointment.patientWalletAddress,
        'appointment_confirmed', // Valid DB type from Notification model
        {
          title: 'Appointment Approved',
          message: 'Your appointment has been approved. Please proceed with payment.',
          relatedId: appointment.id,
          priority: 'high'
        }
      );
      console.log('🔔 Sent approval notification to patient');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
      // Don't fail the approval if notification fails
    }

    console.log('✅ Appointment approved successfully');

    res.json({
      success: true,
      message: 'Appointment approved successfully',
      data: appointment,
      paymentDetails: paymentDetails || {
        method: 'telebirr',
        accountNumber: '0912345678',
        accountName: 'Dr. ' + doctorWallet.substring(0, 8),
        amount: appointment.fee
      }
    });

  } catch (error) {
    console.error('❌ Approve appointment error:', error);
    console.error('Stack:', error.stack); // Log stack trace
    res.status(500).json({
      success: false,
      error: 'Failed to approve appointment',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 🆕 PHASE 3: Doctor rejects paid appointment
 */
export const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet, reason } = req.body;

    console.log('❌ Doctor rejecting appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Update appointment
    await appointment.update({
      approvalStatus: 'rejected',
      status: 'cancelled',
      notes: reason || 'Rejected by doctor'
    });

    // Send notification to patient
    await sendNotification(
      appointment.patientWalletAddress,
      'appointment',
      {
        title: 'Appointment Rejected',
        message: `Your appointment request has been declined. Reason: ${reason || 'Doctor not available'}`,
        relatedId: appointment.id,
        subType: 'rejected'
      }
    );

    console.log('✅ Appointment rejected');

    res.json({
      success: true,
      message: 'Appointment rejected',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Reject appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject appointment',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 3: Get pending approval appointments for doctor
 */
/**
 * 🆕 PHASE 3: Get pending approval appointments for doctor
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const { doctorWallet } = req.query;

    if (!doctorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing doctorWallet query parameter',
        data: [],
        count: 0
      });
    }

    console.log('🔍 Fetching pending approvals for:', doctorWallet);

    // Debug: Check if doctor exists
    try {
      const doctorExists = await Doctor.findByPk(doctorWallet.toLowerCase());
      console.log('🔍 Doctor exists check:', !!doctorExists);
    } catch (err) {
      console.error('❌ Error checking doctor existence:', err);
    }

    try {
      const appointments = await Appointment.findAll({
        where: {
          doctorWalletAddress: doctorWallet.toLowerCase(),
          requiresApproval: true,
          approvalStatus: 'pending'
        },
        include: [
          {
            model: Patient,
            as: 'patientDetails',
            include: [{
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      console.log(`✅ Found ${appointments.length} pending approvals`);

      res.json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (queryError) {
      console.error('❌ Database query error in getPendingApprovals:', queryError);
      // Fallback: Try without include if association fails
      console.log('⚠️ Retrying without associations...');
      const simpleAppointments = await Appointment.findAll({
        where: {
          doctorWalletAddress: doctorWallet.toLowerCase(),
          requiresApproval: true,
          approvalStatus: 'pending'
        }
      });

      res.json({
        success: true,
        data: simpleAppointments,
        count: simpleAppointments.length,
        warning: 'Associations failed to load'
      });
    }

  } catch (error) {
    console.error('❌ Get pending approvals fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 🆕 PHASE 3: Patient uploads payment receipt
 */
export const uploadPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptUrl, paymentMethod } = req.body;

    console.log('📤 Uploading payment receipt for appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Appointment must be approved before payment'
      });
    }

    // Update appointment with receipt
    await appointment.update({
      paymentReceiptUrl: receiptUrl,
      paymentMethod: paymentMethod || 'telebirr',
      paymentStatus: 'paid'
    });

    // Notify doctor
    await sendNotification(
      appointment.doctorWalletAddress,
      'payment',
      {
        title: 'Payment Receipt Uploaded',
        message: 'Patient has uploaded payment receipt. Please verify and confirm.',
        relatedId: appointment.id,
        subType: 'receipt_uploaded'
      }
    );

    console.log('✅ Payment receipt uploaded');

    res.json({
      success: true,
      message: 'Payment receipt uploaded successfully',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Upload receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload receipt',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 3: Doctor confirms payment
 */
export const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.body;

    console.log('✅ Doctor confirming payment for appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'No payment receipt uploaded yet'
      });
    }

    // Confirm payment
    await appointment.update({
      paymentStatus: 'confirmed',
      paymentConfirmedAt: new Date(),
      paymentConfirmedBy: doctorWallet,
      status: 'scheduled' // Now fully confirmed and scheduled
    });

    // Notify patient with enhanced message
    try {
      const serviceTypeText = appointment.serviceType === 'videoCall' ? 'video call' : 
                             appointment.serviceType === 'chat' ? 'chat' : 'in-person';
      
      await sendNotification(
        appointment.patientWalletAddress,
        'payment_confirmed',
        {
          title: 'Payment Confirmed - Ready to Chat!',
          message: `Your payment has been confirmed. You can now ${serviceTypeText} with your doctor. Click to start chatting!`,
          relatedId: appointment.id,
          priority: 'high',
          data: {
            appointmentId: appointment.id,
            doctorWallet: appointment.doctorWalletAddress,
            serviceType: appointment.serviceType,
            actionUrl: `/messages?userId=${appointment.doctorWalletAddress}`,
            actionText: 'Start Chat'
          }
        }
      );
      console.log('🔔 Sent payment confirmation notification with chat link');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Payment confirmed');

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
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
 * 🆕 PHASE 3: Get payment details for appointment
 */
/**
 * 🆕 PHASE 3: Get payment details for appointment
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'profileData']
          }]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Fetch doctor's payment settings
    const { DoctorPaymentSettings } = db;
    let paymentSettings = await DoctorPaymentSettings.findOne({
      where: { doctorWalletAddress: appointment.doctorWalletAddress.toLowerCase() }
    });

    // If no settings found, use defaults (or return empty)
    if (!paymentSettings) {
      paymentSettings = {
        telebirrEnabled: false,
        cbeBirrEnabled: false,
        bankTransferEnabled: false,
        cashEnabled: true
      };
    }

    const paymentMethods = [];

    // Telebirr
    if (paymentSettings.telebirrEnabled) {
      paymentMethods.push({
        method: 'telebirr',
        accountNumber: paymentSettings.telebirrNumber || 'Not provided',
        accountName: paymentSettings.telebirrName || appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',
        instructions: 'Send payment via Telebirr and upload receipt'
      });
    }

    // CBE Birr
    if (paymentSettings.cbeBirrEnabled) {
      paymentMethods.push({
        method: 'cbe_birr',
        accountNumber: paymentSettings.cbeBirrAccount || 'Not provided',
        accountName: paymentSettings.cbeBirrName || appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',
        instructions: 'Send payment via CBE Birr and upload receipt'
      });
    }

    // Bank Transfer
    if (paymentSettings.bankTransferEnabled) {
      paymentMethods.push({
        method: 'bank_transfer',
        accountNumber: paymentSettings.bankAccountNumber || 'Not provided',
        accountName: paymentSettings.bankAccountName || appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',
        bankName: paymentSettings.bankName || 'Bank',
        instructions: `Transfer to ${paymentSettings.bankName} and upload receipt`
      });
    }

    // Cash (always fallback if nothing else, or explicit)
    if (paymentSettings.cashEnabled || paymentMethods.length === 0) {
      paymentMethods.push({
        method: 'cash',
        instructions: 'Pay in person at the clinic'
      });
    }

    // Return payment details
    const paymentDetails = {
      appointmentId: appointment.id,
      amount: appointment.fee,
      currency: 'ETB',
      serviceType: appointment.serviceType,
      approvalStatus: appointment.approvalStatus,
      paymentStatus: appointment.paymentStatus,
      paymentMethods: paymentMethods
    };

    res.json({
      success: true,
      data: paymentDetails
    });

  } catch (error) {
    console.error('❌ Get payment details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment details',
      message: error.message
    });
  }
};
