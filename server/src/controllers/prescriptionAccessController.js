import db from '../models/index.js';
import crypto from 'crypto';
import EnhancedNotificationService from '../services/enhancedNotificationService.js';

const { PrescriptionAccessGrant, Prescription, Patient, Pharmacist, User } = db;

/**
 * 🔐 PRESCRIPTION ACCESS CONTROL CONTROLLER
 * Manages patient-controlled access to prescriptions
 */

/**
 * Quick Approve - Patient approves doctor's suggested pharmacy
 */
export const quickApprove = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { patientWalletAddress, expiryDays = 30, patientNote } = req.body;

    console.log('⚡ Quick approve for prescription:', prescriptionId);

    // Get prescription with suggested pharmacy
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Verify patient owns this prescription
    if (prescription.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your prescription'
      });
    }

    // Check if suggested pharmacy exists
    if (!prescription.suggestedPharmacyWallet) {
      return res.status(400).json({
        success: false,
        error: 'No suggested pharmacy for this prescription'
      });
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create access grant
    const accessGrant = await PrescriptionAccessGrant.create({
      prescriptionId,
      patientWalletAddress,
      pharmacistWalletAddress: prescription.suggestedPharmacyWallet,
      pharmacyName: prescription.suggestedPharmacyName,
      accessMethod: 'quick_approve',
      status: 'active',
      expiresAt,
      patientNote
    });

    // Update prescription
    await prescription.update({
      patientApprovedAt: new Date()
    });

    // Send notification to pharmacist
    await EnhancedNotificationService.sendToUser(
      prescription.suggestedPharmacyWallet,
      'prescription_access_granted',
      {
        patientName: prescription.patientName || 'Patient',
        medicationName: prescription.medicationName,
        relatedId: prescription.id,
        relatedType: 'prescription'
      }
    );

    console.log('✅ Quick approve successful');

    res.json({
      success: true,
      message: 'Access granted to suggested pharmacy',
      data: accessGrant
    });

  } catch (error) {
    console.error('❌ Quick approve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant access',
      message: error.message
    });
  }
};

/**
 * Manual Grant - Patient manually selects pharmacy and grants access
 */
export const manualGrant = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const {
      patientWalletAddress,
      pharmacistWalletAddress,
      pharmacyName,
      expiryDays,
      expiryDate,
      patientNote
    } = req.body;

    console.log('🔧 Manual grant for prescription:', prescriptionId);

    // Get prescription
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Verify patient owns this prescription
    if (prescription.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your prescription'
      });
    }

    // Calculate expiry date
    let expiresAt;
    if (expiryDate) {
      expiresAt = new Date(expiryDate);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));
    }

    // Create access grant
    const accessGrant = await PrescriptionAccessGrant.create({
      prescriptionId,
      patientWalletAddress,
      pharmacistWalletAddress,
      pharmacyName,
      accessMethod: 'manual_grant',
      status: 'active',
      expiresAt,
      patientNote
    });

    // Update prescription
    await prescription.update({
      patientApprovedAt: new Date()
    });

    // Send notification to pharmacist
    await EnhancedNotificationService.sendToUser(
      pharmacistWalletAddress,
      'prescription_access_granted',
      {
        patientName: prescription.patientName || 'Patient',
        medicationName: prescription.medicationName,
        relatedId: prescription.id,
        relatedType: 'prescription'
      }
    );

    console.log('✅ Manual grant successful');

    res.json({
      success: true,
      message: 'Access granted to pharmacy',
      data: accessGrant
    });

  } catch (error) {
    console.error('❌ Manual grant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant access',
      message: error.message
    });
  }
};

/**
 * Generate QR Code - Patient generates time-limited QR code
 */
export const generateQRCode = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const {
      patientWalletAddress,
      validityHours = 24,
      patientNote
    } = req.body;

    console.log('📱 Generating QR code for prescription:', prescriptionId);

    // Get prescription
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Verify patient owns this prescription
    if (prescription.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your prescription'
      });
    }

    // Generate unique QR code token
    const qrCodeToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validityHours);

    // Create access grant with QR code
    const accessGrant = await PrescriptionAccessGrant.create({
      prescriptionId,
      patientWalletAddress,
      pharmacistWalletAddress: null, // Will be filled when scanned
      pharmacyName: null,
      accessMethod: 'qr_code',
      status: 'active',
      expiresAt,
      qrCodeToken,
      qrCodeValidityHours: validityHours,
      qrCodeGeneratedAt: new Date(),
      patientNote
    });

    console.log('✅ QR code generated');

    res.json({
      success: true,
      message: 'QR code generated',
      data: {
        accessGrant,
        qrCodeToken,
        qrCodeData: JSON.stringify({
          prescriptionId,
          token: qrCodeToken,
          expiresAt
        })
      }
    });

  } catch (error) {
    console.error('❌ QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
      message: error.message
    });
  }
};

/**
 * Regenerate QR Code - Patient regenerates expired QR code
 */
export const regenerateQRCode = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const {
      patientWalletAddress,
      oldGrantId,
      validityHours = 24
    } = req.body;

    console.log('🔄 Regenerating QR code for prescription:', prescriptionId);

    // Get prescription
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Verify patient owns this prescription
    if (prescription.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your prescription'
      });
    }

    // Invalidate old QR code if provided
    if (oldGrantId) {
      await PrescriptionAccessGrant.update(
        { status: 'expired' },
        { where: { id: oldGrantId } }
      );
    }

    // Generate new QR code token
    const qrCodeToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validityHours);

    // Get regeneration count from old grant
    let regenerationCount = 0;
    if (oldGrantId) {
      const oldGrant = await PrescriptionAccessGrant.findByPk(oldGrantId);
      if (oldGrant) {
        regenerationCount = (oldGrant.qrCodeRegenerationCount || 0) + 1;
      }
    }

    // Create new access grant
    const accessGrant = await PrescriptionAccessGrant.create({
      prescriptionId,
      patientWalletAddress,
      pharmacistWalletAddress: null,
      pharmacyName: null,
      accessMethod: 'qr_code',
      status: 'active',
      expiresAt,
      qrCodeToken,
      qrCodeValidityHours: validityHours,
      qrCodeGeneratedAt: new Date(),
      qrCodeRegenerationCount: regenerationCount
    });

    console.log('✅ QR code regenerated');

    res.json({
      success: true,
      message: 'QR code regenerated',
      data: {
        accessGrant,
        qrCodeToken,
        qrCodeData: JSON.stringify({
          prescriptionId,
          token: qrCodeToken,
          expiresAt
        }),
        regenerationCount
      }
    });

  } catch (error) {
    console.error('❌ QR code regeneration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR code',
      message: error.message
    });
  }
};

/**
 * Scan QR Code - Pharmacist scans QR code to gain access
 */
export const scanQRCode = async (req, res) => {
  try {
    const {
      qrCodeToken,
      pharmacistWalletAddress,
      pharmacyName
    } = req.body;

    console.log('📷 Scanning QR code');

    // Find access grant by QR code token
    const accessGrant = await PrescriptionAccessGrant.findOne({
      where: { qrCodeToken },
      include: [{
        model: Prescription,
        as: 'prescription'
      }]
    });

    if (!accessGrant) {
      return res.status(404).json({
        success: false,
        error: 'Invalid QR code'
      });
    }

    // Check if already scanned
    if (accessGrant.qrCodeScannedAt) {
      return res.status(400).json({
        success: false,
        error: 'QR code already used'
      });
    }

    // Check if expired
    if (new Date() > new Date(accessGrant.expiresAt)) {
      await accessGrant.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        error: 'QR code expired'
      });
    }

    // Update access grant with pharmacist info
    await accessGrant.update({
      pharmacistWalletAddress,
      pharmacyName,
      qrCodeScannedAt: new Date()
    });

    // Send notification to patient
    await EnhancedNotificationService.sendToUser(
      accessGrant.patientWalletAddress,
      'prescription_access_granted',
      {
        patientName: 'You',
        medicationName: accessGrant.prescription.medicationName,
        pharmacyName: pharmacyName,
        relatedId: accessGrant.prescription.id,
        relatedType: 'prescription'
      }
    );

    console.log('✅ QR code scanned successfully');

    res.json({
      success: true,
      message: 'Access granted via QR code',
      data: {
        accessGrant,
        prescription: accessGrant.prescription
      }
    });

  } catch (error) {
    console.error('❌ QR code scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan QR code',
      message: error.message
    });
  }
};

/**
 * Revoke Access - Patient revokes access from pharmacist
 */
export const revokeAccess = async (req, res) => {
  try {
    const { grantId } = req.params;
    const { patientWalletAddress } = req.body;

    console.log('🚫 Revoking access grant:', grantId);

    // Find access grant
    const accessGrant = await PrescriptionAccessGrant.findByPk(grantId);

    if (!accessGrant) {
      return res.status(404).json({
        success: false,
        error: 'Access grant not found'
      });
    }

    // Verify patient owns this grant
    if (accessGrant.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your access grant'
      });
    }

    // Check if already used
    if (accessGrant.status === 'used') {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke: Prescription already dispensed'
      });
    }

    // Revoke access
    await accessGrant.update({
      status: 'revoked',
      revokedAt: new Date()
    });

    // Send notification to pharmacist if they have wallet address
    if (accessGrant.pharmacistWalletAddress) {
      await EnhancedNotificationService.sendToUser(
        accessGrant.pharmacistWalletAddress,
        'prescription_access_revoked',
        {
          medicationName: 'Prescription',
          relatedId: accessGrant.prescriptionId,
          relatedType: 'prescription'
        }
      );
    }

    console.log('✅ Access revoked');

    res.json({
      success: true,
      message: 'Access revoked',
      data: accessGrant
    });

  } catch (error) {
    console.error('❌ Revoke access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke access',
      message: error.message
    });
  }
};

/**
 * Get Access Grants - Get all access grants for a prescription
 */
export const getAccessGrants = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { patientWalletAddress } = req.query;

    console.log('📋 Getting access grants for prescription:', prescriptionId);

    // Get prescription
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Verify patient owns this prescription
    if (patientWalletAddress && 
        prescription.patientWalletAddress.toLowerCase() !== patientWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your prescription'
      });
    }

    // Get all access grants
    const accessGrants = await PrescriptionAccessGrant.findAll({
      where: { prescriptionId },
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${accessGrants.length} access grants`);

    res.json({
      success: true,
      data: accessGrants
    });

  } catch (error) {
    console.error('❌ Get access grants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get access grants',
      message: error.message
    });
  }
};

/**
 * Emergency Access - Pharmacist requests emergency access
 */
export const emergencyAccess = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const {
      pharmacistWalletAddress,
      pharmacyName,
      emergencyReason
    } = req.body;

    console.log('🚨 Emergency access request for prescription:', prescriptionId);

    // Get prescription
    const prescription = await Prescription.findByPk(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Create emergency access grant (1 hour validity)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const accessGrant = await PrescriptionAccessGrant.create({
      prescriptionId,
      patientWalletAddress: prescription.patientWalletAddress,
      pharmacistWalletAddress,
      pharmacyName,
      accessMethod: 'emergency',
      status: 'active',
      expiresAt,
      isEmergency: true,
      emergencyReason,
      emergencyConfirmedByPatient: false
    });

    // Send urgent notification to patient
    await EnhancedNotificationService.sendToUser(
      prescription.patientWalletAddress,
      'prescription_emergency_access',
      {
        pharmacyName: pharmacyName,
        medicationName: prescription.medicationName,
        reason: emergencyReason,
        relatedId: prescription.id,
        relatedType: 'prescription',
        priority: 'urgent'
      }
    );

    console.log('⚠️ Emergency access granted (requires patient confirmation)');

    res.json({
      success: true,
      message: 'Emergency access granted - Patient will be notified',
      data: accessGrant,
      warning: 'This access requires patient confirmation within 7 days'
    });

  } catch (error) {
    console.error('❌ Emergency access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant emergency access',
      message: error.message
    });
  }
};

/**
 * Get Pharmacist Accessible Prescriptions
 */
export const getAccessiblePrescriptions = async (req, res) => {
  try {
    const { pharmacistWalletAddress } = req.params;

    console.log('💊 Getting accessible prescriptions for pharmacist:', pharmacistWalletAddress);

    // Get all active access grants for this pharmacist
    const accessGrants = await PrescriptionAccessGrant.findAll({
      where: {
        pharmacistWalletAddress,
        status: 'active'
      },
      include: [{
        model: Prescription,
        as: 'prescription',
        where: {
          status: 'active' // Only active prescriptions
        }
      }],
      order: [['createdAt', 'DESC']]
    });

    // Filter out expired grants
    const now = new Date();
    const validGrants = accessGrants.filter(grant => new Date(grant.expiresAt) > now);

    // Auto-expire old grants
    const expiredGrants = accessGrants.filter(grant => new Date(grant.expiresAt) <= now);
    if (expiredGrants.length > 0) {
      await Promise.all(expiredGrants.map(grant => 
        grant.update({ status: 'expired' })
      ));
    }

    console.log(`✅ Found ${validGrants.length} accessible prescriptions`);

    res.json({
      success: true,
      data: validGrants
    });

  } catch (error) {
    console.error('❌ Get accessible prescriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get accessible prescriptions',
      message: error.message
    });
  }
};
