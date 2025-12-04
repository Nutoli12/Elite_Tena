// server/src/middleware/consentMiddleware.js
const { Consent } = require('../models');
const { Op } = require('sequelize');

/**
 * Middleware to verify patient consent before accessing medical data
 */
const requireConsent = (permissionType = 'medical_records') => {
  return async (req, res, next) => {
    try {
      // Get patient wallet from params or body
      const patientWallet = req.params.patientWallet || req.body.patientWalletAddress;
      const doctorWallet = req.user.walletAddress;
      
      if (!patientWallet) {
        return res.status(400).json({
          success: false,
          message: 'Patient wallet address required',
          errorCode: 'PATIENT_WALLET_REQUIRED'
        });
      }

      console.log(`🔐 Checking consent: Doctor ${doctorWallet} -> Patient ${patientWallet}`);
      
      // Check if valid consent exists
      const hasConsent = await Consent.findOne({
        where: {
          patientWalletAddress: patientWallet,
          doctorWalletAddress: doctorWallet,
          permissionType,
          isActive: true,
          expiresAt: {
            [Op.gt]: new Date() // Not expired
          }
        }
      });
      
      if (!hasConsent) {
        console.log(`❌ Consent denied for doctor ${doctorWallet}`);
        return res.status(403).json({
          success: false,
          message: 'Patient consent required to access medical records. Please request access from the patient.',
          errorCode: 'CONSENT_REQUIRED',
          details: {
            patientWallet,
            doctorWallet, 
            permissionType,
            required: 'Valid, non-expired consent'
          }
        });
      }
      
      console.log(`✅ Consent verified: Doctor ${doctorWallet} can access patient ${patientWallet} data`);
      next();
    } catch (error) {
      console.error('❌ Consent verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying patient consent',
        error: error.message
      });
    }
  };
};

module.exports = { requireConsent };