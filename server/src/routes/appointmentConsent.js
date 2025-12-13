import express from 'express';
import db from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { AppointmentConsent, Appointment, Patient, Doctor, User, Consent, Notification } = db;

/**
 * 🔔 DOCTOR: Request consent for specific appointment
 * POST /api/appointment-consent/request/:appointmentId
 */
router.post('/request/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      doctorWalletAddress,
      customPermissions,
      purpose,
      consultationType = 'general_consultation'
    } = req.body;

    console.log('🔐 Requesting appointment-specific consent:', {
      appointmentId,
      doctorWalletAddress,
      consultationType
    });

    // Get appointment with patient details
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify doctor matches appointment
    if (appointment.doctorWalletAddress !== doctorWalletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not the doctor for this appointment'
      });
    }

    // Check if appointment is in correct state (payment confirmed)
    if (appointment.paymentStatus !== 'confirmed' && appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Consent can only be requested after payment is confirmed',
        currentPaymentStatus: appointment.paymentStatus,
        requiredStatus: 'confirmed'
      });
    }

    // Check if consent already exists
    const existingConsent = await AppointmentConsent.findOne({
      where: { appointmentId }
    });

    if (existingConsent) {
      if (existingConsent.status === 'granted' && !existingConsent.isExpired()) {
        return res.json({
          success: true,
          message: 'Consent already granted for this appointment',
          data: existingConsent
        });
      } else if (existingConsent.status === 'requested') {
        return res.json({
          success: true,
          message: 'Consent request already pending for this appointment',
          data: existingConsent
        });
      }
    }

    // Default permissions for appointment consultation
    const defaultPermissions = {
      allow_consultation: true,
      allow_medical_history_view: true,
      allow_prescription_write: true,
      allow_lab_test_order: false,
      allow_diagnosis_recording: true,
      allow_video_call: appointment.serviceType === 'videoCall',
      allow_chat: appointment.serviceType === 'chat',
      valid_for_hours: 24,
      purpose: purpose || `Consultation consent for appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
    };

    const finalPermissions = customPermissions 
      ? { ...defaultPermissions, ...customPermissions }
      : defaultPermissions;

    // Create or update appointment consent
    let appointmentConsent;
    if (existingConsent) {
      appointmentConsent = await existingConsent.update({
        status: 'requested',
        permissions: finalPermissions,
        purpose: finalPermissions.purpose,
        consultationType,
        requestedAt: new Date(),
        grantedAt: null,
        expiresAt: null,
        revokedAt: null
      });
    } else {
      appointmentConsent = await AppointmentConsent.create({
        appointmentId,
        patientWalletAddress: appointment.patientWalletAddress,
        doctorWalletAddress: appointment.doctorWalletAddress,
        status: 'requested',
        permissions: finalPermissions,
        purpose: finalPermissions.purpose,
        consultationType,
        requestedAt: new Date()
      });
    }

    // Update appointment workflow state
    await appointment.update({
      workflowState: 'awaiting_consent',
      consentStatus: 'requested'
    });

    // Send notification to patient
    try {
      const doctorName = appointment.doctorDetails?.user?.name || 
                        appointment.doctorDetails?.name || 
                        'Your doctor';
      const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString();
      const appointmentTime = new Date(appointment.appointmentDate).toLocaleTimeString();

      const notification = await Notification.create({
        userId: appointment.patientWalletAddress,
        type: 'appointment_consent_request',
        title: '🔐 Consent Required for Appointment',
        message: `${doctorName} requests your consent for consultation on ${appointmentDate} at ${appointmentTime}`,
        priority: 'high',
        relatedId: appointmentConsent.id,
        relatedType: 'appointment_consent',
        data: {
          appointmentId: appointment.id,
          consentId: appointmentConsent.id,
          doctorName,
          appointmentDate,
          appointmentTime,
          consultationType,
          permissions: finalPermissions,
          actionUrl: `/appointments/${appointmentId}/consent`
        }
      });

      console.log('✅ Consent request notification sent to patient');
    } catch (notifError) {
      console.error('❌ Failed to send consent request notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Consent request sent to patient',
      data: {
        appointmentConsent,
        appointment: {
          id: appointment.id,
          date: appointment.appointmentDate,
          workflowState: appointment.workflowState
        }
      }
    });
  } catch (error) {
    console.error('❌ Request appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request appointment consent',
      error: error.message
    });
  }
});

/**
 * 👤 PATIENT: Grant consent for specific appointment
 * POST /api/appointment-consent/grant/:appointmentId
 */
router.post('/grant/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { 
      patientWalletAddress, 
      customPermissions, 
      customDuration 
    } = req.body;

    console.log('✅ Granting appointment consent:', {
      appointmentId,
      patientWalletAddress
    });

    // Get appointment consent - use case-insensitive matching for wallet addresses
    let appointmentConsent = await AppointmentConsent.findOne({
      where: { 
        appointmentId,
        [Op.or]: [
          { patientWalletAddress },
          { patientWalletAddress: patientWalletAddress?.toLowerCase() },
          { patientWalletAddress: patientWalletAddress?.toUpperCase() }
        ],
        status: 'requested'
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Doctor, as: 'doctorDetails', include: [{ model: User, as: 'user' }] }
          ]
        }
      ]
    });

    if (!appointmentConsent) {
      // Fallback: try to find by appointmentId only (in case of wallet address mismatch)
      console.log('⚠️ Consent not found with wallet match, trying appointmentId only...');
      const fallbackConsent = await AppointmentConsent.findOne({
        where: { 
          appointmentId,
          status: 'requested'
        },
        include: [
          {
            model: Appointment,
            as: 'appointment',
            include: [
              { model: Doctor, as: 'doctorDetails', include: [{ model: User, as: 'user' }] }
            ]
          }
        ]
      });

      if (fallbackConsent) {
        console.log('✅ Found consent via fallback. DB wallet:', fallbackConsent.patientWalletAddress, 'Request wallet:', patientWalletAddress);
        // Reassign to use the fallback consent
        appointmentConsent = fallbackConsent;
      } else {
        return res.status(404).json({
          success: false,
          message: 'No pending consent request found for this appointment'
        });
      }
    }

    // Update permissions if custom ones provided
    let finalPermissions = appointmentConsent.permissions;
    if (customPermissions) {
      finalPermissions = { ...finalPermissions, ...customPermissions };
    }
    if (customDuration) {
      finalPermissions.valid_for_hours = customDuration;
    }

    // Grant the consent
    await appointmentConsent.grant(finalPermissions);

    // Update appointment workflow state
    await appointmentConsent.appointment.update({
      workflowState: 'consent_granted',
      consentStatus: 'granted',
      consentGrantedAt: new Date(),
      consentExpiresAt: appointmentConsent.expiresAt
    });

    // Create general consent record for broader system compatibility
    try {
      const generalConsent = await Consent.create({
        patientWalletAddress: appointmentConsent.patientWalletAddress,
        doctorWalletAddress: appointmentConsent.doctorWalletAddress,
        appointmentId: appointmentId,
        status: 'active',
        permissions: {
          viewMedicalHistory: finalPermissions.allow_medical_history_view,
          addConsultationNotes: finalPermissions.allow_diagnosis_recording,
          writePrescriptions: finalPermissions.allow_prescription_write,
          orderTests: finalPermissions.allow_lab_test_order,
          canVideoCall: finalPermissions.allow_video_call,
          canChat: finalPermissions.allow_chat
        },
        purpose: appointmentConsent.purpose,
        durationType: 'hours',
        durationValue: finalPermissions.valid_for_hours || 24,
        grantedAt: new Date(),
        expiresAt: appointmentConsent.expiresAt
      });

      // Link the general consent to appointment consent
      await appointmentConsent.update({ consentId: generalConsent.id });
    } catch (generalConsentError) {
      console.error('⚠️ Failed to create general consent record:', generalConsentError);
      // Continue anyway - appointment consent is the primary record
    }

    // Send notification to doctor
    try {
      const patientName = appointmentConsent.appointment.patientDetails?.user?.name || 
                          appointmentConsent.appointment.patientDetails?.name || 
                          'Patient';
      const appointmentDate = new Date(appointmentConsent.appointment.appointmentDate).toLocaleDateString();

      const notification = await Notification.create({
        userId: appointmentConsent.doctorWalletAddress,
        type: 'appointment_consent_granted',
        title: '✅ Consent Granted',
        message: `${patientName} granted consent for appointment on ${appointmentDate}. You can now start the consultation.`,
        priority: 'high',
        relatedId: appointmentConsent.id,
        relatedType: 'appointment_consent',
        data: {
          appointmentId: appointmentConsent.appointmentId,
          consentId: appointmentConsent.id,
          patientName,
          appointmentDate,
          permissions: finalPermissions,
          expiresAt: appointmentConsent.expiresAt,
          actionUrl: `/doctor/appointments/${appointmentId}`
        }
      });

      console.log('✅ Consent granted notification sent to doctor');
    } catch (notifError) {
      console.error('❌ Failed to send consent granted notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Consent granted successfully for appointment',
      data: {
        appointmentConsent,
        appointment: {
          id: appointmentConsent.appointment.id,
          workflowState: appointmentConsent.appointment.workflowState,
          consentStatus: appointmentConsent.appointment.consentStatus
        }
      }
    });
  } catch (error) {
    console.error('❌ Grant appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant appointment consent',
      error: error.message
    });
  }
});

/**
 * 🚫 PATIENT: Deny consent for specific appointment
 * POST /api/appointment-consent/deny/:appointmentId
 */
router.post('/deny/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    const appointmentConsent = await AppointmentConsent.findOne({
      where: { 
        appointmentId,
        patientWalletAddress,
        status: 'requested'
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Doctor, as: 'doctorDetails', include: [{ model: User, as: 'user' }] }
          ]
        }
      ]
    });

    if (!appointmentConsent) {
      return res.status(404).json({
        success: false,
        message: 'No pending consent request found for this appointment'
      });
    }

    // Deny the consent
    await appointmentConsent.deny(reason);

    // Update appointment workflow state
    await appointmentConsent.appointment.update({
      workflowState: 'scheduled', // Back to scheduled state
      consentStatus: 'denied'
    });

    // Send notification to doctor
    try {
      const patientName = appointmentConsent.appointment.patientDetails?.user?.name || 'Patient';
      const appointmentDate = new Date(appointmentConsent.appointment.appointmentDate).toLocaleDateString();

      const notification = await Notification.create({
        userId: appointmentConsent.doctorWalletAddress,
        type: 'appointment_consent_denied',
        title: '❌ Consent Denied',
        message: `${patientName} denied consent for appointment on ${appointmentDate}. ${reason ? `Reason: ${reason}` : ''}`,
        priority: 'high',
        relatedId: appointmentConsent.id,
        relatedType: 'appointment_consent',
        data: {
          appointmentId: appointmentConsent.appointmentId,
          consentId: appointmentConsent.id,
          patientName,
          appointmentDate,
          reason: reason || 'No reason provided',
          actionUrl: `/doctor/appointments/${appointmentId}`
        }
      });

      console.log('✅ Consent denied notification sent to doctor');
    } catch (notifError) {
      console.error('❌ Failed to send consent denied notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Consent denied for appointment',
      data: appointmentConsent
    });
  } catch (error) {
    console.error('❌ Deny appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny appointment consent',
      error: error.message
    });
  }
});

/**
 * 🔍 Check consent status for appointment
 * GET /api/appointment-consent/check/:appointmentId
 */
router.get('/check/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { action } = req.query;

    const result = await AppointmentConsent.checkConsent(appointmentId, action);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Check appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check appointment consent',
      error: error.message
    });
  }
});

/**
 * 📋 Get consent details for appointment
 * GET /api/appointment-consent/:appointmentId
 */
router.get('/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointmentConsent = await AppointmentConsent.findOne({
      where: { appointmentId },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Patient, as: 'patientDetails', include: [{ model: User, as: 'user' }] },
            { model: Doctor, as: 'doctorDetails', include: [{ model: User, as: 'user' }] }
          ]
        },
        {
          model: Consent,
          as: 'generalConsent',
          required: false
        }
      ]
    });

    if (!appointmentConsent) {
      return res.status(404).json({
        success: false,
        message: 'No consent found for this appointment'
      });
    }

    res.json({
      success: true,
      data: appointmentConsent
    });
  } catch (error) {
    console.error('❌ Get appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appointment consent',
      error: error.message
    });
  }
});

/**
 * 🚫 PATIENT: Revoke consent for appointment
 * POST /api/appointment-consent/revoke/:appointmentId
 */
router.post('/revoke/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    const appointmentConsent = await AppointmentConsent.findOne({
      where: { 
        appointmentId,
        patientWalletAddress,
        status: 'granted'
      },
      include: [
        {
          model: Appointment,
          as: 'appointment'
        }
      ]
    });

    if (!appointmentConsent) {
      return res.status(404).json({
        success: false,
        message: 'No active consent found for this appointment'
      });
    }

    // Revoke the consent
    await appointmentConsent.revoke(reason);

    // Update appointment workflow state
    await appointmentConsent.appointment.update({
      workflowState: 'scheduled',
      consentStatus: 'revoked'
    });

    // Revoke general consent if it exists
    if (appointmentConsent.consentId) {
      try {
        const generalConsent = await Consent.findByPk(appointmentConsent.consentId);
        if (generalConsent) {
          await generalConsent.revoke(reason || 'Patient revoked appointment consent', patientWalletAddress);
        }
      } catch (generalConsentError) {
        console.error('⚠️ Failed to revoke general consent:', generalConsentError);
      }
    }

    // Send notification to doctor
    try {
      const notification = await Notification.create({
        userId: appointmentConsent.doctorWalletAddress,
        type: 'appointment_consent_revoked',
        title: '🚫 Consent Revoked',
        message: `Patient revoked consent for appointment. Consultation access has been terminated. ${reason ? `Reason: ${reason}` : ''}`,
        priority: 'high',
        relatedId: appointmentConsent.id,
        relatedType: 'appointment_consent',
        data: {
          appointmentId: appointmentConsent.appointmentId,
          consentId: appointmentConsent.id,
          reason: reason || 'No reason provided',
          revokedAt: appointmentConsent.revokedAt,
          actionUrl: `/doctor/appointments/${appointmentId}`
        }
      });

      console.log('✅ Consent revoked notification sent to doctor');
    } catch (notifError) {
      console.error('❌ Failed to send consent revoked notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Consent revoked for appointment',
      data: appointmentConsent
    });
  } catch (error) {
    console.error('❌ Revoke appointment consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke appointment consent',
      error: error.message
    });
  }
});

/**
 * 📊 Get patient's appointment consent requests
 * GET /api/appointment-consent/patient/:patientWalletAddress
 */
router.get('/patient/:patientWalletAddress', async (req, res) => {
  try {
    const { patientWalletAddress } = req.params;
    const { status } = req.query;

    const whereClause = { patientWalletAddress };
    if (status) {
      whereClause.status = status;
    }

    const appointmentConsents = await AppointmentConsent.findAll({
      where: whereClause,
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Doctor, as: 'doctorDetails', include: [{ model: User, as: 'user' }] }
          ]
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: appointmentConsents
    });
  } catch (error) {
    console.error('❌ Get patient appointment consents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get patient appointment consents',
      error: error.message
    });
  }
});

/**
 * 👨‍⚕️ Get doctor's appointment consent requests
 * GET /api/appointment-consent/doctor/:doctorWalletAddress
 */
router.get('/doctor/:doctorWalletAddress', async (req, res) => {
  try {
    const { doctorWalletAddress } = req.params;
    const { status } = req.query;

    const whereClause = { doctorWalletAddress };
    if (status) {
      whereClause.status = status;
    }

    const appointmentConsents = await AppointmentConsent.findAll({
      where: whereClause,
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Patient, as: 'patientDetails', include: [{ model: User, as: 'user' }] }
          ]
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: appointmentConsents
    });
  } catch (error) {
    console.error('❌ Get doctor appointment consents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get doctor appointment consents',
      error: error.message
    });
  }
});

export default router;