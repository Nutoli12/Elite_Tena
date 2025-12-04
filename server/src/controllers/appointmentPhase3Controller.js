import db from '../models/index.js';
const { Appointment, Patient, Doctor, User, Notification } = db;

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
      status: 'approved'
    });

    // Create notification for patient
    await Notification.create({
      userId: appointment.patientWalletAddress,
      title: 'Appointment Approved',
      message: `Your appointment has been approved. Please proceed with payment.`,
      type: 'appointment_approved',
      relatedId: appointment.id
    });

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
    res.status(500).json({
      success: false,
      error: 'Failed to approve appointment',
      message: error.message
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

    // Create notification for patient
    await Notification.create({
      userId: appointment.patientWalletAddress,
      title: 'Appointment Rejected',
      message: `Your appointment request has been declined. Reason: ${reason || 'Doctor not available'}`,
      type: 'appointment_rejected',
      relatedId: appointment.id
    });

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
export const getPendingApprovals = async (req, res) => {
  try {
    const { doctorWallet } = req.query;

    console.log('🔍 Fetching pending approvals for:', doctorWallet);

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

    // Notify doctor to confirm payment
    await Notification.create({
      userId: appointment.doctorWalletAddress,
      title: 'Payment Receipt Uploaded',
      message: 'Patient has uploaded payment receipt. Please verify and confirm.',
      type: 'payment_receipt_uploaded',
      relatedId: appointment.id
    });

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

    // Notify patient
    await Notification.create({
      userId: appointment.patientWalletAddress,
      title: 'Payment Confirmed',
      message: 'Your payment has been confirmed. Appointment is now scheduled!',
      type: 'payment_confirmed',
      relatedId: appointment.id
    });

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

    // Return payment details
    const paymentDetails = {
      appointmentId: appointment.id,
      amount: appointment.fee,
      currency: 'ETB',
      serviceType: appointment.serviceType,
      approvalStatus: appointment.approvalStatus,
      paymentStatus: appointment.paymentStatus,
      paymentMethods: [
        {
          method: 'telebirr',
          accountNumber: '0912345678',
          accountName: appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',
          instructions: 'Send payment via Telebirr and upload receipt'
        },
        {
          method: 'cbe_birr',
          accountNumber: '1000123456789',
          accountName: appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor',
          instructions: 'Send payment via CBE Birr and upload receipt'
        }
      ]
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
