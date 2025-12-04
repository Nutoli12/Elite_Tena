import { ethers } from 'ethers';
import db from '../../models/index.js';

/**
 * Blockchain Consent Service - Manages patient consent on blockchain
 */
class ConsentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545');
    this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, this.provider);
    
    // Your EliteHealthSystem contract ABI and address
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.contractABI = [
      "function grantConsent(address patient, address doctor, uint8 consentType, uint256 duration) external",
      "function revokeConsent(address patient, address doctor, uint8 consentType) external",
      "function checkConsent(address patient, address doctor, uint8 consentType) external view returns (bool)",
      "event ConsentGranted(address indexed patient, address indexed doctor, uint8 consentType, uint256 expiry)",
      "event ConsentRevoked(address indexed patient, address indexed doctor, uint8 consentType)"
    ];
    
    this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
  }

  /**
   * Grant consent on blockchain and store in database
   */
  async grantConsent(patientWallet, doctorWallet, consentType, durationDays = 30) {
    try {
      const transaction = await db.sequelize.transaction();

      try {
        // 1. Store consent in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const consent = await db.Consent.create({
          patientWalletAddress: patientWallet,
          doctorWalletAddress: doctorWallet,
          consentType: consentType,
          scope: { access: 'medical_records', duration: durationDays },
          grantedAt: new Date(),
          expiresAt: expiresAt,
          isActive: true
        }, { transaction });

        // 2. Record consent on blockchain (Web3)
        const durationSeconds = durationDays * 24 * 60 * 60;
        const tx = await this.contract.grantConsent(
          patientWallet,
          doctorWallet,
          this.mapConsentTypeToUint(consentType),
          durationSeconds
        );

        // 3. Update database with transaction hash
        await consent.update({ blockchainTxHash: tx.hash }, { transaction });

        await transaction.commit();

        return {
          success: true,
          consentId: consent.id,
          blockchainTx: tx.hash,
          expiresAt: expiresAt
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Grant consent error:', error);
      throw new Error(`Failed to grant consent: ${error.message}`);
    }
  }

  /**
   * Revoke consent on blockchain and update database
   */
  async revokeConsent(patientWallet, doctorWallet, consentType) {
    try {
      const transaction = await db.sequelize.transaction();

      try {
        // 1. Find active consent in database
        const consent = await db.Consent.findOne({
          where: {
            patientWalletAddress: patientWallet,
            doctorWalletAddress: doctorWallet,
            consentType: consentType,
            isActive: true
          }
        }, { transaction });

        if (!consent) {
          throw new Error('No active consent found to revoke');
        }

        // 2. Revoke consent on blockchain
        const tx = await this.contract.revokeConsent(
          patientWallet,
          doctorWallet,
          this.mapConsentTypeToUint(consentType)
        );

        // 3. Update database
        await consent.update({
          isActive: false,
          revocationTxHash: tx.hash
        }, { transaction });

        await transaction.commit();

        return {
          success: true,
          consentId: consent.id,
          revocationTx: tx.hash
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Revoke consent error:', error);
      throw new Error(`Failed to revoke consent: ${error.message}`);
    }
  }

  /**
   * Check if consent exists (both on blockchain and in database)
   */
  async checkConsent(patientWallet, doctorWallet, consentType) {
    try {
      // 1. Check database first
      const dbConsent = await db.Consent.findOne({
        where: {
          patientWalletAddress: patientWallet,
          doctorWalletAddress: doctorWallet,
          consentType: consentType,
          isActive: true,
          expiresAt: { [db.Sequelize.Op.gt]: new Date() }
        }
      });

      if (!dbConsent) {
        return { hasConsent: false, source: 'database' };
      }

      // 2. Verify on blockchain (optional - for extra security)
      try {
        const blockchainConsent = await this.contract.checkConsent(
          patientWallet,
          doctorWallet,
          this.mapConsentTypeToUint(consentType)
        );

        return {
          hasConsent: blockchainConsent && dbConsent.isActive,
          source: 'both',
          expiresAt: dbConsent.expiresAt,
          grantedAt: dbConsent.grantedAt
        };
      } catch (blockchainError) {
        // If blockchain check fails, trust database
        console.warn('Blockchain consent check failed, using database:', blockchainError);
        return {
          hasConsent: dbConsent.isActive,
          source: 'database',
          expiresAt: dbConsent.expiresAt,
          grantedAt: dbConsent.grantedAt
        };
      }

    } catch (error) {
      console.error('Check consent error:', error);
      throw new Error(`Failed to check consent: ${error.message}`);
    }
  }

  /**
   * Map consent type string to uint for blockchain
   */
  mapConsentTypeToUint(consentType) {
    const mapping = {
      'medical_records': 0,
      'treatment': 1,
      'research': 2,
      'billing': 3,
      'emergency': 4
    };
    return mapping[consentType] || 0;
  }

  /**
   * Get all consents for a patient
   */
  async getPatientConsents(patientWallet) {
    try {
      const consents = await db.Consent.findAll({
        where: { patientWalletAddress: patientWallet },
        include: [{
          model: db.Doctor,
          as: 'doctor',
          include: [{
            model: db.User,
            as: 'user',
            attributes: ['walletAddress']
          }]
        }],
        order: [['grantedAt', 'DESC']]
      });

      return consents;
    } catch (error) {
      console.error('Get patient consents error:', error);
      throw new Error(`Failed to get patient consents: ${error.message}`);
    }
  }
}

export default new ConsentService();
