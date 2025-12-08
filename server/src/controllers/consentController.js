import db from '../models/index.js';
import { Op } from 'sequelize';

const { Consent, Patient, Doctor, User, Appointment } = db;

/**
 * 🔔 PATIENT: Receive Access Request Notification
 * Doctor requests access, patient gets notified
 */
export const requestAccess = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      appointmentId,
      purpose,
      requestReason,
      permissions,
      durationType,
      durationValue,
      consentTypes
    } = req.body;

    // Validate required fields
    if (!patientWalletAddress || !doctorWalletAddress || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Patient wallet, doctor wallet, and purpose are required'
      });
    }

    // Check if patient and doctor exist
    const patient = await Patient.findOne({ where: { walletAddress: patientWalletAddress } });
    const doctor = await Doctor.findOne({ where: { walletAddress: doctorWalletAddress } });

    if (!patient || !doctor) {
      return res.status(404).json({
        success: false,
        message: 'Patient or doctor not found'
      });
    }

    // Create consent request
    const consent = await Consent.create({
      patientWalletAddress,
      doctorWalletAddress,
      appointmentId: appointmentId || null,
      status: 'requested',
      purpose,
      requestReason,
      permissions: permissions || {
        viewMedicalHistory: true,
        viewLabResults: true,
        viewPrescriptions: true,
        addConsultationNotes: true,
        orderTests: false,
        writePrescriptions: false,
        shareWithColleagues: false,
        exportRecords: false,
        deleteRecords: false
      },
      durationType: durationType || 'hours',
      durationValue: durationValue || 24,
      consentTypes: consentTypes || ['medical_records'],
      requestedAt: new Date()
    });

    // TODO: Send notification to patient
    // await notificationService.sendConsentRequest(patient, doctor, consent);

    res.status(201).json({
      success: true,
      message: 'Access request sent to patient',
      data: {
        consent,
        doctor: {
          name: doctor.name,
          specialty: doctor.specialty
        }
      }
    });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request access',
      error: error.message
    });
  }
};

/**
 * 👤 PATIENT: View All Pending Requests
 */
export const getPendingRequests = async (req, res) => {
  try {
    const { patientWalletAddress } = req.params;

    const pendingRequests = await Consent.findAll({
      where: {
        patientWalletAddress,
        status: 'requested'
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        },
        {
          model: Appointment,
          as: 'appointment',
          required: false
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
};

/**
 * ✅ PATIENT: Grant Consent (Approve Request)
 */
export const grantConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, customDuration, customPermissions } = req.body;

    const consent = await Consent.findByPk(consentId);

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent request not found'
      });
    }

    // Verify patient owns this consent
    if (consent.patientWalletAddress !== patientWalletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to grant this consent'
      });
    }

    // Update permissions if custom ones provided
    if (customPermissions) {
      consent.permissions = { ...consent.permissions, ...customPermissions };
    }

    // Update duration if custom one provided
    if (customDuration) {
      consent.durationType = customDuration.type;
      consent.durationValue = customDuration.value;
    }

    // Grant the consent
    await consent.grant(patientWalletAddress);

    // TODO: Send notification to doctor
    // await notificationService.sendConsentGranted(doctor, patient, consent);

    res.json({
      success: true,
      message: 'Consent granted successfully',
      data: consent
    });
  } catch (error) {
    console.error('Grant consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant consent',
      error: error.message
    });
  }
};

/**
 * 🚫 PATIENT: Deny Access Request
 */
export const denyConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    const consent = await Consent.findByPk(consentId);

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent request not found'
      });
    }

    if (consent.patientWalletAddress !== patientWalletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await consent.revoke(reason || 'Patient denied access', patientWalletAddress);

    res.json({
      success: true,
      message: 'Access request denied'
    });
  } catch (error) {
    console.error('Deny consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny consent',
      error: error.message
    });
  }
};

/**
 * 👤 PATIENT: View All Active Permissions
 */
export const getActiveConsents = async (req, res) => {
  try {
    const { patientWalletAddress } = req.params;

    const activeConsents = await Consent.findAll({
      where: {
        patientWalletAddress,
        status: 'active'
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        }
      ],
      order: [['grantedAt', 'DESC']]
    });

    // Check for expired consents
    const now = new Date();
    for (const consent of activeConsents) {
      if (consent.isExpired()) {
        consent.status = 'expired';
        await consent.save();
      }
    }

    res.json({
      success: true,
      data: activeConsents.filter(c => c.status === 'active')
    });
  } catch (error) {
    console.error('Get active consents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active consents',
      error: error.message
    });
  }
};

/**
 * 🚫 PATIENT: Revoke Active Consent
 */
export const revokeConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    const consent = await Consent.findByPk(consentId, {
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user'
          }]
        }
      ]
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent not found'
      });
    }

    if (consent.patientWalletAddress !== patientWalletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await consent.revoke(reason || 'Patient revoked access', patientWalletAddress);

    // TODO: Send notification to doctor
    // await notificationService.sendConsentRevoked(doctor, patient, consent);

    res.json({
      success: true,
      message: 'Consent revoked successfully',
      data: consent
    });
  } catch (error) {
    console.error('Revoke consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke consent',
      error: error.message
    });
  }
};

/**
 * 👤 PATIENT: Get Complete Consent History
 */
export const getConsentHistory = async (req, res) => {
  try {
    const { patientWalletAddress } = req.params;
    const { status, startDate, endDate } = req.query;

    const whereClause = { patientWalletAddress };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const consents = await Consent.findAll({
      where: whereClause,
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    console.error('Get consent history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent history',
      error: error.message
    });
  }
};

/**
 * 👨‍⚕️ DOCTOR: View My Access Requests Status
 */
export const getDoctorConsents = async (req, res) => {
  try {
    const { doctorWalletAddress } = req.params;
    const { status } = req.query;

    const whereClause = { doctorWalletAddress };
    if (status) {
      whereClause.status = status;
    }

    const consents = await Consent.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    console.error('Get doctor consents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor consents',
      error: error.message
    });
  }
};

/**
 * 👨‍⚕️ DOCTOR: Check if has access to patient
 */
export const checkAccess = async (req, res) => {
  try {
    const { doctorWalletAddress, patientWalletAddress } = req.params;
    const { action } = req.query;

    const consent = await Consent.findOne({
      where: {
        doctorWalletAddress,
        patientWalletAddress,
        status: 'active'
      }
    });

    if (!consent) {
      return res.json({
        success: true,
        hasAccess: false,
        message: 'No active consent found'
      });
    }

    if (consent.isExpired()) {
      consent.status = 'expired';
      await consent.save();
      
      return res.json({
        success: true,
        hasAccess: false,
        message: 'Consent has expired'
      });
    }

    const hasAccess = action ? consent.canAccess(action) : true;

    // Record access
    if (hasAccess) {
      await consent.recordAccess();
    }

    res.json({
      success: true,
      hasAccess,
      consent: {
        id: consent.id,
        permissions: consent.permissions,
        expiresAt: consent.expiresAt,
        accessLevel: consent.accessLevel
      }
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check access',
      error: error.message
    });
  }
};

/**
 * 📊 Get Consent Statistics
 */
export const getConsentStats = async (req, res) => {
  try {
    const { walletAddress, role } = req.params;

    const whereClause = role === 'patient' 
      ? { patientWalletAddress: walletAddress }
      : { doctorWalletAddress: walletAddress };

    const stats = {
      total: await Consent.count({ where: whereClause }),
      active: await Consent.count({ where: { ...whereClause, status: 'active' } }),
      pending: await Consent.count({ where: { ...whereClause, status: 'requested' } }),
      expired: await Consent.count({ where: { ...whereClause, status: 'expired' } }),
      revoked: await Consent.count({ 
        where: { 
          ...whereClause, 
          status: { [Op.in]: ['patient_revoked', 'doctor_revoked', 'admin_revoked'] }
        } 
      })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get consent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent statistics',
      error: error.message
    });
  }
};

/**
 * 🔄 Auto-expire old consents (Cron job)
 */
export const autoExpireConsents = async (req, res) => {
  try {
    const expiredCount = await Consent.checkAndExpireConsents();

    res.json({
      success: true,
      message: `Expired ${expiredCount} consents`,
      count: expiredCount
    });
  } catch (error) {
    console.error('Auto-expire consents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-expire consents',
      error: error.message
    });
  }
};

export default {
  requestAccess,
  getPendingRequests,
  grantConsent,
  denyConsent,
  getActiveConsents,
  revokeConsent,
  getConsentHistory,
  getDoctorConsents,
  checkAccess,
  getConsentStats,
  autoExpireConsents
};
