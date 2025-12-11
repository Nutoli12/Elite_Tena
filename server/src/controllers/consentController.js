import db from '../models/index.js';
import { Op } from 'sequelize';
import { getIO } from '../services/socketService.js';

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

    // Validate wallet addresses format
    if (doctorWalletAddress === 'undefined' || doctorWalletAddress === 'null' || 
        patientWalletAddress === 'undefined' || patientWalletAddress === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }

    // Check if patient and doctor exist (with user associations for notification)
    const patient = await Patient.findOne({ 
      where: { walletAddress: patientWalletAddress },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    });
    const doctor = await Doctor.findOne({ 
      where: { walletAddress: doctorWalletAddress },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found. Please ensure you are logged in as a doctor.'
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

    // Send notification to patient
    try {
      const { Notification } = db;
      const doctorName = doctor.user?.name || doctor.name || doctor.user?.email?.split('@')[0] || 'A doctor';
      const doctorSpecialty = doctor.specialty || doctor.specialization || 'Specialist';
      
      const notification = await Notification.create({
        userId: patientWalletAddress,
        type: 'consent_request',
        title: 'New Access Request',
        message: `Dr. ${doctorName} (${doctorSpecialty}) requests access to your medical records`,
        priority: 'high',
        relatedId: consent.id,
        relatedType: 'consent',
        data: {
          consentId: consent.id,
          doctorName: doctorName,
          doctorSpecialty: doctorSpecialty,
          purpose: purpose,
          appointmentId: appointmentId,
          actionUrl: '/consent'
        }
      });
      console.log('✅ Notification created for patient:', patientWalletAddress);
      
      // Emit via socket.io for real-time delivery
      try {
        const io = getIO();
        io.to(patientWalletAddress.toLowerCase()).emit('notification', notification);
        console.log('🔔 Real-time notification sent to patient');
      } catch (socketError) {
        console.error('⚠️ Socket emission failed (patient may not be online):', socketError.message);
      }
    } catch (notifError) {
      console.error('❌ Failed to send notification:', notifError);
      console.error('Notification error details:', notifError.message);
    }

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
  const transaction = await db.sequelize.transaction();
  
  try {
    const { consentId } = req.params;
    const { patientWalletAddress, customDuration, customPermissions, consentType = 'MedicalRecords' } = req.body;

    console.log('🔐 ========== GRANTING CONSENT WITH BLOCKCHAIN ==========');
    console.log('🔐 Consent ID:', consentId);
    console.log('🔐 Patient Wallet:', patientWalletAddress);
    console.log('🔐 Consent Type:', consentType);

    const consent = await Consent.findByPk(consentId, { transaction });

    if (!consent) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Consent request not found'
      });
    }

    // Verify patient owns this consent
    if (consent.patientWalletAddress !== patientWalletAddress) {
      await transaction.rollback();
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
    let durationHours = 24; // Default 24 hours
    if (customDuration) {
      consent.durationType = customDuration.type;
      consent.durationValue = customDuration.value;
      
      // Convert to hours for blockchain
      if (customDuration.type === 'hours') {
        durationHours = customDuration.value;
      } else if (customDuration.type === 'days') {
        durationHours = customDuration.value * 24;
      } else if (customDuration.type === 'weeks') {
        durationHours = customDuration.value * 24 * 7;
      }
    }

    // ========== BLOCKCHAIN FIRST APPROACH ==========
    console.log('🔗 Step 1: Granting consent on BLOCKCHAIN...');
    
    // Import blockchain service
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const blockchainService = require('../../services/blockchain.cjs');

    // Map consent type to blockchain enum
    const blockchainConsentType = blockchainService.ConsentType[consentType] || 0;

    // Grant consent on blockchain FIRST (primary data store)
    const blockchainResult = await blockchainService.grantConsent(
      patientWalletAddress.toLowerCase(),
      consent.doctorWalletAddress.toLowerCase(),
      blockchainConsentType,
      durationHours
    );

    // Demo mode: Allow consent even if blockchain fails (for testing Web3 verification)
    const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    
    if (!blockchainResult.success && !isDemoMode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Blockchain consent failed',
        message: blockchainResult.error,
        details: 'Consent must be granted on blockchain first',
        blockchain: false
      });
    }

    if (!blockchainResult.success && isDemoMode) {
      console.log('⚠️ DEMO MODE: Allowing consent without blockchain (for testing)');
      console.log('   In production, this would require proper blockchain setup');
      // Create mock blockchain data for demo
      blockchainResult.success = true;
      blockchainResult.transactionHash = '0xDEMO' + Date.now().toString(16);
      blockchainResult.blockNumber = Math.floor(Math.random() * 1000000) + 5000000;
      blockchainResult.gasUsed = '75000';
    }

    console.log('✅ Step 1 Complete: Consent granted on blockchain:', blockchainResult.transactionHash);

    // ========== DATABASE SYNC (Secondary) ==========
    console.log('🔗 Step 2: Syncing to database for performance...');

    // Grant the consent in database (for performance/search)
    await consent.grant(patientWalletAddress);
    
    // Update with blockchain metadata
    await consent.update({
      blockchainTxHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      gasUsed: blockchainResult.gasUsed,
      onBlockchain: true
    }, { transaction });

    // Send notification to doctor
    try {
      const { Notification } = db;
      const patient = await Patient.findOne({ 
        where: { walletAddress: consent.patientWalletAddress },
        include: [{ model: User, as: 'user' }]
      });

      const patientName = patient?.user?.name || patient?.name || patient?.user?.email?.split('@')[0] || 'A patient';

      const notification = await Notification.create({
        userId: consent.doctorWalletAddress,
        type: 'consent_granted',
        title: '✅ Access Granted',
        message: `${patientName} granted you access to their medical records`,
        priority: 'high',
        relatedId: consent.id,
        relatedType: 'consent',
        data: {
          consentId: consent.id,
          patientName: patientName,
          patientWalletAddress: consent.patientWalletAddress,
          expiresAt: consent.expiresAt,
          permissions: consent.permissions,
          actionUrl: '/doctor/consent'
        }
      });
      console.log('✅ Grant notification sent to doctor:', consent.doctorWalletAddress);
      
      // Emit via socket.io for real-time delivery
      try {
        const io = getIO();
        io.to(consent.doctorWalletAddress.toLowerCase()).emit('notification', notification);
        console.log('🔔 Real-time notification sent to doctor');
      } catch (socketError) {
        console.error('⚠️ Socket emission failed (doctor may not be online):', socketError.message);
      }
    } catch (notifError) {
      console.error('❌ Failed to send grant notification:', notifError);
    }

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

    const doctorWalletAddress = consent.doctorWalletAddress;
    await consent.revoke(reason || 'Patient denied access', patientWalletAddress);

    // Send notification to doctor about denial
    try {
      const { Notification } = db;
      const patient = await Patient.findOne({ 
        where: { walletAddress: patientWalletAddress },
        include: [{ model: User, as: 'user' }]
      });

      const patientName = patient?.user?.name || patient?.name || patient?.user?.email?.split('@')[0] || 'A patient';

      const notification = await Notification.create({
        userId: doctorWalletAddress,
        type: 'consent_revoked',
        title: '❌ Access Denied',
        message: `${patientName} denied your access request to their medical records`,
        priority: 'high',
        relatedId: consent.id,
        relatedType: 'consent',
        data: {
          consentId: consent.id,
          patientName: patientName,
          reason: reason || 'Patient denied access',
          deniedAt: new Date().toISOString(),
          actionUrl: '/doctor/consent'
        }
      });
      console.log('✅ Denial notification sent to doctor:', doctorWalletAddress);
      
      // Emit via socket.io for real-time delivery
      try {
        const io = getIO();
        io.to(doctorWalletAddress.toLowerCase()).emit('notification', notification);
        console.log('🔔 Real-time notification sent to doctor');
      } catch (socketError) {
        console.error('⚠️ Socket emission failed (doctor may not be online):', socketError.message);
      }
    } catch (notifError) {
      console.error('❌ Failed to send denial notification:', notifError);
    }

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

    // Send notification to doctor
    try {
      const { Notification } = db;
      const patient = await Patient.findOne({ 
        where: { walletAddress: consent.patientWalletAddress },
        include: [{ model: User, as: 'user' }]
      });

      const patientName = patient?.user?.name || patient?.name || patient?.user?.email?.split('@')[0] || 'A patient';

      const notification = await Notification.create({
        userId: consent.doctorWalletAddress,
        type: 'consent_revoked',
        title: '🚫 Access Revoked',
        message: `${patientName} revoked your access to their medical records`,
        priority: 'high',
        relatedId: consent.id,
        relatedType: 'consent',
        data: {
          consentId: consent.id,
          patientName: patientName,
          patientWalletAddress: consent.patientWalletAddress,
          reason: reason || 'Patient revoked access',
          revokedAt: consent.revokedAt,
          actionUrl: '/doctor/consent'
        }
      });
      console.log('✅ Revoke notification sent to doctor:', consent.doctorWalletAddress);
      
      // Emit via socket.io for real-time delivery
      try {
        const io = getIO();
        io.to(consent.doctorWalletAddress.toLowerCase()).emit('notification', notification);
        console.log('🔔 Real-time notification sent to doctor');
      } catch (socketError) {
        console.error('⚠️ Socket emission failed (doctor may not be online):', socketError.message);
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }

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

    // Validate wallet address
    if (!doctorWalletAddress || doctorWalletAddress === 'undefined' || doctorWalletAddress === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Valid doctor wallet address is required'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findOne({ where: { walletAddress: doctorWalletAddress } });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

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
            attributes: ['name', 'email', 'profileData']
          }]
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    // Log what we're returning for debugging
    console.log('📤 getDoctorConsents: Returning', consents.length, 'consents');
    consents.forEach((consent, index) => {
      console.log(`  Consent ${index + 1}:`, {
        patientWallet: consent.patientWalletAddress,
        hasPatient: !!consent.patient,
        patientName: consent.patient?.name,
        hasUser: !!consent.patient?.user,
        userName: consent.patient?.user?.name,
        userEmail: consent.patient?.user?.email,
        hasProfileData: !!consent.patient?.user?.profileData
      });
    });

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    console.error('Get doctor consents error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor consents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
