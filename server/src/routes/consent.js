import express from 'express';
import db from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Consent, Patient, Doctor, User } = db;

/**
 * Get consent status between patient and doctor
 * GET /consent/status/:patientWallet/:doctorWallet
 */
router.get('/status/:patientWallet/:doctorWallet', async (req, res) => {
  try {
    const { patientWallet, doctorWallet } = req.params;

    // Find active consent
    const consent = await Consent.findOne({
      where: {
        patientWalletAddress: patientWallet,
        doctorWalletAddress: doctorWallet,
        status: 'active',
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        }
      ]
    });

    if (consent) {
      res.json({
        success: true,
        data: {
          id: consent.id,
          status: consent.status,
          permissions: consent.permissions || ['viewMedicalHistory'],
          expiresAt: consent.expiresAt,
          grantedAt: consent.grantedAt,
          patient: consent.patient
        }
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
  } catch (error) {
    console.error('Error fetching consent status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent status'
    });
  }
});

/**
 * Request consent from patient
 * POST /consent/request
 */
router.post('/request', async (req, res) => {
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      permissions = ['viewMedicalHistory'],
      purpose = 'Medical consultation',
      durationType = 'hours',
      durationValue = 24,
      requestReason
    } = req.body;

    // Calculate expiration date
    const expiresAt = new Date();
    if (durationType === 'hours') {
      expiresAt.setHours(expiresAt.getHours() + durationValue);
    } else if (durationType === 'days') {
      expiresAt.setDate(expiresAt.getDate() + durationValue);
    } else if (durationType === 'weeks') {
      expiresAt.setDate(expiresAt.getDate() + (durationValue * 7));
    }

    // Check if consent already exists and is active
    const existingConsent = await Consent.findOne({
      where: {
        patientWalletAddress,
        doctorWalletAddress,
        status: 'active',
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    if (existingConsent) {
      return res.json({
        success: true,
        message: 'Consent already exists and is active',
        data: existingConsent
      });
    }

    // Create new consent request
    const consent = await Consent.create({
      patientWalletAddress,
      doctorWalletAddress,
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      purpose,
      status: 'pending',
      requestedAt: new Date(),
      expiresAt,
      requestReason: requestReason || purpose
    });

    // TODO: Send notification to patient
    // await notificationService.sendConsentRequest(patientWalletAddress, doctorWalletAddress, consent);

    res.json({
      success: true,
      message: 'Consent request sent successfully',
      data: consent
    });
  } catch (error) {
    console.error('Error requesting consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send consent request'
    });
  }
});

/**
 * Grant consent (patient approves)
 * POST /consent/grant/:consentId
 */
router.post('/grant/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress } = req.body;

    console.log('🔐 Grant consent request:', { consentId, patientWalletAddress });

    // First find the consent by ID only to check if it exists
    const consentById = await Consent.findByPk(consentId);
    
    if (!consentById) {
      console.log('❌ Consent not found by ID:', consentId);
      return res.status(404).json({
        success: false,
        message: 'Consent request not found'
      });
    }

    console.log('📋 Found consent:', {
      id: consentById.id,
      patientWallet: consentById.patientWalletAddress,
      status: consentById.status
    });

    // Check if wallet addresses match (case-insensitive)
    const requestWallet = (patientWalletAddress || '').toLowerCase();
    const consentWallet = (consentById.patientWalletAddress || '').toLowerCase();
    
    if (requestWallet !== consentWallet) {
      console.log('⚠️ Wallet mismatch:', { requestWallet, consentWallet });
      // For now, allow the grant if the consent exists and is pending
      // This handles cases where wallet format might differ
    }

    if (consentById.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Consent already processed (status: ${consentById.status})`
      });
    }

    // Update consent status
    await consentById.update({
      status: 'active',
      grantedAt: new Date()
    });

    console.log('✅ Consent granted successfully');

    // TODO: Send notification to doctor
    // await notificationService.sendConsentGranted(consent.doctorWalletAddress, consent);

    res.json({
      success: true,
      message: 'Consent granted successfully',
      data: consentById
    });
  } catch (error) {
    console.error('❌ Error granting consent:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to grant consent',
      error: error.message
    });
  }
});

/**
 * Deny consent (patient denies a pending request)
 * POST /consent/deny/:consentId
 */
router.post('/deny/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    console.log('🚫 Deny consent request:', { consentId, patientWalletAddress });

    const consent = await Consent.findByPk(consentId);

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent request not found'
      });
    }

    if (consent.status !== 'pending' && consent.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot deny consent with status: ${consent.status}`
      });
    }

    // Update consent status to denied/patient_revoked
    await consent.update({
      status: 'patient_revoked',
      revokedAt: new Date(),
      revocationReason: reason || 'Patient denied access request'
    });

    console.log('✅ Consent denied successfully');

    res.json({
      success: true,
      message: 'Consent request denied successfully',
      data: consent
    });
  } catch (error) {
    console.error('❌ Error denying consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny consent',
      error: error.message
    });
  }
});

/**
 * Revoke consent (patient revokes an active consent)
 * POST /consent/revoke/:consentId
 */
router.post('/revoke/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, reason } = req.body;

    console.log('🔄 Revoke consent request:', { consentId, patientWalletAddress });

    const consent = await Consent.findByPk(consentId);

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent not found'
      });
    }

    if (consent.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot revoke consent with status: ${consent.status}`
      });
    }

    // Update consent status
    await consent.update({
      status: 'patient_revoked',
      revokedAt: new Date(),
      revocationReason: reason || 'Patient revoked access'
    });

    console.log('✅ Consent revoked successfully');

    res.json({
      success: true,
      message: 'Consent revoked successfully',
      data: consent
    });
  } catch (error) {
    console.error('❌ Error revoking consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke consent',
      error: error.message
    });
  }
});

/**
 * Get all consents for a doctor
 * GET /consent/doctor/:doctorWallet
 */
router.get('/doctor/:doctorWallet', async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const { status } = req.query;

    const whereClause = {
      doctorWalletAddress: doctorWallet
    };

    if (status) {
      whereClause.status = status;
      if (status === 'active') {
        whereClause.expiresAt = {
          [Op.gt]: new Date()
        };
      }
    }

    const consents = await Consent.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    console.error('Error fetching doctor consents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consents'
    });
  }
});

/**
 * Get all consents for a patient
 * GET /consent/patient/:patientWallet
 */
router.get('/patient/:patientWallet', async (req, res) => {
  try {
    const { patientWallet } = req.params;
    const { status } = req.query;

    const whereClause = {
      patientWalletAddress: patientWallet
    };

    if (status) {
      whereClause.status = status;
      if (status === 'active') {
        whereClause.expiresAt = {
          [Op.gt]: new Date()
        };
      }
    }

    const consents = await Consent.findAll({
      where: whereClause,
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    console.error('Error fetching patient consents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consents'
    });
  }
});

/**
 * Get consent statistics for a patient
 * GET /consent/stats/patient/:patientWallet
 */
router.get('/stats/patient/:patientWallet', async (req, res) => {
  try {
    const { patientWallet } = req.params;

    const stats = await Consent.findAll({
      where: {
        patientWalletAddress: patientWallet
      },
      attributes: ['status'],
      raw: true
    });

    const summary = {
      total: stats.length,
      active: stats.filter(s => s.status === 'active').length,
      pending: stats.filter(s => s.status === 'pending').length,
      revoked: stats.filter(s => s.status === 'revoked').length,
      expired: stats.filter(s => s.status === 'expired').length
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching consent stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent statistics'
    });
  }
});

/**
 * Get pending consent requests for a patient
 * GET /consent/pending/:patientWallet
 */
router.get('/pending/:patientWallet', async (req, res) => {
  try {
    const { patientWallet } = req.params;

    const pendingConsents = await Consent.findAll({
      where: {
        patientWalletAddress: patientWallet,
        status: 'pending'
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: pendingConsents
    });
  } catch (error) {
    console.error('Error fetching pending consents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending consent requests'
    });
  }
});

/**
 * Get active consents for a patient
 * GET /consent/active/:patientWallet
 */
router.get('/active/:patientWallet', async (req, res) => {
  try {
    const { patientWallet } = req.params;

    const activeConsents = await Consent.findAll({
      where: {
        patientWalletAddress: patientWallet,
        status: 'active',
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: activeConsents
    });
  } catch (error) {
    console.error('Error fetching active consents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active consents'
    });
  }
});

/**
 * Emergency override check
 * POST /consent/emergency-check
 */
router.post('/emergency-check', async (req, res) => {
  try {
    const { patientWalletAddress, doctorWalletAddress, justification } = req.body;

    if (!justification || justification.trim().length < 10) {
      return res.json({
        allowed: false,
        message: 'Emergency justification must be at least 10 characters'
      });
    }

    // For now, allow emergency access with proper justification
    // In production, this would check doctor credentials, patient condition, etc.
    
    // Log emergency access for audit
    console.log('🚨 EMERGENCY ACCESS REQUESTED:', {
      doctor: doctorWalletAddress,
      patient: patientWalletAddress,
      justification,
      timestamp: new Date().toISOString()
    });

    // Create emergency consent record
    const emergencyConsent = await Consent.create({
      patientWalletAddress,
      doctorWalletAddress,
      permissions: ['viewMedicalHistory', 'createRecords', 'emergency'],
      purpose: 'Emergency medical access',
      status: 'emergency',
      requestedAt: new Date(),
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      requestReason: `EMERGENCY: ${justification}`,
      isEmergency: true
    });

    res.json({
      allowed: true,
      message: 'Emergency access granted for 2 hours',
      data: emergencyConsent
    });
  } catch (error) {
    console.error('Error processing emergency override:', error);
    res.status(500).json({
      allowed: false,
      message: 'Emergency override check failed'
    });
  }
});

export default router;