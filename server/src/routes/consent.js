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

    const consent = await Consent.findOne({
      where: {
        id: consentId,
        patientWalletAddress,
        status: 'pending'
      }
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent request not found or already processed'
      });
    }

    // Update consent status
    await consent.update({
      status: 'active',
      grantedAt: new Date()
    });

    // TODO: Send notification to doctor
    // await notificationService.sendConsentGranted(consent.doctorWalletAddress, consent);

    res.json({
      success: true,
      message: 'Consent granted successfully',
      data: consent
    });
  } catch (error) {
    console.error('Error granting consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant consent'
    });
  }
});

/**
 * Revoke consent (patient revokes)
 * POST /consent/revoke/:consentId
 */
router.post('/revoke/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;
    const { patientWalletAddress } = req.body;

    const consent = await Consent.findOne({
      where: {
        id: consentId,
        patientWalletAddress,
        status: 'active'
      }
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Active consent not found'
      });
    }

    // Update consent status
    await consent.update({
      status: 'revoked',
      revokedAt: new Date()
    });

    // TODO: Send notification to doctor
    // await notificationService.sendConsentRevoked(consent.doctorWalletAddress, consent);

    res.json({
      success: true,
      message: 'Consent revoked successfully',
      data: consent
    });
  } catch (error) {
    console.error('Error revoking consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke consent'
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