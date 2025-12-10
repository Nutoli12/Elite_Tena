const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

/**
 * Enhanced Blockchain Integration Service
 * Connects backend to EliteHealthSystemEnhanced smart contract
 * TRUE WEB3 INTEGRATION - Blockchain as Primary Data Store
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    this.privateKey = process.env.PRIVATE_KEY;
    
    // Consent type enum (matches smart contract)
    this.ConsentType = {
      MedicalRecords: 0,
      Prescriptions: 1,
      LabResults: 2,
      Appointments: 3,
      All: 4
    };
    
    // Role enum (matches smart contract)
    this.Role = {
      None: 0,
      Patient: 1,
      Doctor: 2,
      Pharmacist: 3,
      LabTechnician: 4
    };

    // Transaction options
    this.txOptions = {
      gasLimit: 500000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    };
  }

  /**
   * Initialize blockchain connection with WRITE capabilities
   */
  async initialize() {
    try {
      console.log('🔗 Initializing TRUE WEB3 blockchain connection...');
      
      // Reload contract address from environment
      this.contractAddress = process.env.CONTRACT_ADDRESS;
      this.rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
      this.privateKey = process.env.PRIVATE_KEY;
      
      if (!this.contractAddress) {
        throw new Error('CONTRACT_ADDRESS not set in environment variables');
      }

      if (!this.privateKey) {
        console.warn('⚠️  PRIVATE_KEY not set - blockchain writes will be disabled');
      }
      
      console.log('   Contract Address:', this.contractAddress);
      console.log('   RPC URL:', this.rpcUrl);
      console.log('   Private Key:', this.privateKey ? 'SET' : 'NOT SET');
      
      // Connect to blockchain
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // Create signer for transactions
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
        console.log('✅ Signer created:', this.signer.address);
      }
      
      // Load contract ABI
      const artifactPaths = [
        path.join(__dirname, '../contracts/EliteHealthSystemEnhanced.json'),
        path.join(__dirname, '../../shared/contracts/EliteHealthSystemEnhanced.json'),
        path.join(__dirname, '../..', 'elite-tena-smart-contracts/artifacts/contracts/EliteHealthSystemEnhanced.sol/EliteHealthSystemEnhanced.json')
      ];
      
      let artifact = null;
      for (const artifactPath of artifactPaths) {
        if (fs.existsSync(artifactPath)) {
          artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          console.log('✅ Contract ABI loaded from:', artifactPath);
          break;
        }
      }
      
      if (!artifact) {
        throw new Error('Contract artifact not found. Please run: cd elite-tena-smart-contracts && node scripts/export-abi.js');
      }
      
      // Create contract instances (read-only and with signer)
      this.contract = new ethers.Contract(
        this.contractAddress,
        artifact.abi,
        this.provider
      );

      if (this.signer) {
        this.contractWithSigner = new ethers.Contract(
          this.contractAddress,
          artifact.abi,
          this.signer
        );
      }
      
      // Test connection
      const network = await this.provider.getNetwork();
      console.log('✅ TRUE WEB3 blockchain service initialized');
      console.log('   Contract:', this.contractAddress);
      console.log('   Network:', network.name, 'Chain ID:', network.chainId.toString());
      console.log('   Write Enabled:', !!this.signer);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error.message);
      return false;
    }
  }

  /**
   * Setup event listeners for real-time sync
   */
  setupEventListeners(db) {
    console.log('🔍 Setting up blockchain event listeners...');

    // User registration events
    this.contract.on('UserRegistered', async (user, role, event) => {
      console.log('👤 User registered:', user, 'Role:', this.getRoleName(role));
      // Sync with database if needed
    });

    this.contract.on('ProviderApproved', async (provider, role, event) => {
      console.log('✅ Provider approved:', provider, 'Role:', this.getRoleName(role));
    });

    // Consent events
    this.contract.on('ConsentGranted', async (patient, provider, consentType, expiresAt, event) => {
      console.log('✅ Consent granted:', {
        patient,
        provider,
        consentType: this.getConsentTypeName(consentType),
        expiresAt: new Date(Number(expiresAt) * 1000)
      });
      
      // Update database
      if (db && db.Consent) {
        try {
          await db.Consent.create({
            patientWalletAddress: patient.toLowerCase(),
            doctorWalletAddress: provider.toLowerCase(),
            consentType: this.getConsentTypeName(consentType),
            grantedAt: new Date(),
            expiresAt: Number(expiresAt) > 0 ? new Date(Number(expiresAt) * 1000) : null,
            isActive: true,
            blockchainTxHash: event.log.transactionHash
          });
        } catch (error) {
          console.error('Error saving consent to database:', error.message);
        }
      }
    });

    this.contract.on('ConsentRevoked', async (patient, provider, consentType, event) => {
      console.log('❌ Consent revoked:', { patient, provider, consentType: this.getConsentTypeName(consentType) });
      
      // Update database
      if (db && db.Consent) {
        try {
          await db.Consent.update(
            { 
              isActive: false,
              revocationTxHash: event.log.transactionHash
            },
            {
              where: {
                patientWalletAddress: patient.toLowerCase(),
                doctorWalletAddress: provider.toLowerCase(),
                isActive: true
              }
            }
          );
        } catch (error) {
          console.error('Error updating consent in database:', error.message);
        }
      }
    });

    // Prescription events
    this.contract.on('PrescriptionIssued', async (prescriptionId, patient, doctor, event) => {
      console.log('💊 Prescription issued:', { prescriptionId: prescriptionId.toString(), patient, doctor });
    });

    this.contract.on('PrescriptionFilled', async (prescriptionId, pharmacist, event) => {
      console.log('💊 Prescription filled:', { prescriptionId: prescriptionId.toString(), pharmacist });
    });

    // Lab result events
    this.contract.on('LabResultSubmitted', async (resultId, patient, labTech, event) => {
      console.log('🔬 Lab result submitted:', { resultId: resultId.toString(), patient, labTech });
    });

    this.contract.on('LabResultApproved', async (resultId, doctor, event) => {
      console.log('🔬 Lab result approved:', { resultId: resultId.toString(), doctor });
    });

    // Appointment events
    this.contract.on('AppointmentBooked', async (patient, doctor, amount, event) => {
      console.log('📅 Appointment booked:', { patient, doctor, amount: ethers.formatEther(amount) });
    });

    // Medical record events
    this.contract.on('MedicalRecordStored', async (patient, doctor, ipfsHash, event) => {
      console.log('📄 Medical record stored:', { patient, doctor, ipfsHash });
    });

    console.log('✅ Event listeners setup complete');
  }

  /**
   * Check if user has active consent
   */
  async checkActiveConsent(patientWallet, providerWallet, consentType) {
    try {
      const consentTypeValue = typeof consentType === 'string' 
        ? this.ConsentType[consentType]
        : consentType;
        
      return await this.contract.checkActiveConsent(
        patientWallet,
        providerWallet,
        consentTypeValue
      );
    } catch (error) {
      console.error('Error checking consent:', error.message);
      return false;
    }
  }

  /**
   * Verify prescription on blockchain
   */
  async verifyPrescription(prescriptionId) {
    try {
      const [exists, filled, issuer] = await this.contract.verifyPrescription(prescriptionId);
      return { exists, filled, issuer };
    } catch (error) {
      console.error('Error verifying prescription:', error.message);
      return { exists: false, filled: false, issuer: null };
    }
  }

  /**
   * Verify lab result on blockchain
   */
  async verifyLabResult(resultId) {
    try {
      const [exists, approved, technician] = await this.contract.verifyLabResult(resultId);
      return { exists, approved, technician };
    } catch (error) {
      console.error('Error verifying lab result:', error.message);
      return { exists: false, approved: false, technician: null };
    }
  }

  /**
   * Get user information from blockchain
   */
  async getUserInfo(walletAddress) {
    try {
      const userInfo = await this.contract.getUserInfo(walletAddress);
      return {
        registered: userInfo.registered,
        role: this.getRoleName(userInfo.role),
        id: userInfo.id,
        specialization: userInfo.specialization,
        registrationDate: new Date(Number(userInfo.registrationDate) * 1000)
      };
    } catch (error) {
      console.error('Error getting user info:', error.message);
      return null;
    }
  }

  /**
   * Check if provider is approved
   */
  async isProviderApproved(providerWallet) {
    try {
      return await this.contract.isProviderApproved(providerWallet);
    } catch (error) {
      console.error('Error checking provider approval:', error.message);
      return false;
    }
  }

  /**
   * Get medical records for a patient
   */
  async getMedicalRecords(patientWallet, accessorWallet) {
    try {
      // This requires a signer with the accessor's wallet
      // For read-only, we can't call this directly
      // Backend should check consent first, then return from database
      const hasConsent = await this.checkActiveConsent(
        patientWallet,
        accessorWallet,
        this.ConsentType.MedicalRecords
      );
      
      return { hasConsent };
    } catch (error) {
      console.error('Error getting medical records:', error.message);
      return { hasConsent: false };
    }
  }

  /**
   * Helper: Get consent type name
   */
  getConsentTypeName(consentType) {
    const types = ['MedicalRecords', 'Treatment', 'Prescriptions', 'LabResults', 'Emergency'];
    return types[consentType] || 'Unknown';
  }

  /**
   * Helper: Get role name
   */
  getRoleName(role) {
    const roles = ['None', 'Patient', 'Doctor', 'Pharmacist', 'LabTechnician', 'Admin'];
    return roles[role] || 'Unknown';
  }

  /**
   * Generate prescription ID (matches smart contract logic)
   */
  generatePrescriptionId(patientWallet, doctorWallet, timestamp) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(`prescription_${patientWallet}_${doctorWallet}_${timestamp}`)
    );
  }

  /**
   * Generate lab result ID (matches smart contract logic)
   */
  generateLabResultId(patientWallet, labTechWallet, timestamp) {
    return ethers.keccak256(
      ethers.toUtf8Bytes(`labresult_${patientWallet}_${labTechWallet}_${timestamp}`)
    );
  }

  // ========== TRUE WEB3 DATA STORAGE FUNCTIONS ==========

  /**
   * Store medical record on blockchain (PRIMARY DATA STORE)
   */
  async storeMedicalRecord(patientWallet, doctorWallet, ipfsHash) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('📝 Storing medical record on blockchain:', { patientWallet, doctorWallet, ipfsHash });

      // Check consent first
      const hasConsent = await this.checkActiveConsent(patientWallet, doctorWallet, this.ConsentType.MedicalRecords);
      if (!hasConsent) {
        throw new Error('No active consent for medical records');
      }

      // Store on blockchain
      const tx = await this.contractWithSigner.storeMedicalRecord(
        patientWallet,
        ipfsHash,
        this.txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Medical record stored on blockchain:', receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to store medical record on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Issue prescription on blockchain (PRIMARY DATA STORE)
   */
  async issuePrescription(patientWallet, doctorWallet, ipfsHash) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('💊 Issuing prescription on blockchain:', { patientWallet, doctorWallet, ipfsHash });

      // Check consent first
      const hasConsent = await this.checkActiveConsent(patientWallet, doctorWallet, this.ConsentType.Prescriptions);
      if (!hasConsent) {
        throw new Error('No active consent for prescriptions');
      }

      // Issue prescription on blockchain
      const tx = await this.contractWithSigner.issuePrescription(
        patientWallet,
        ipfsHash,
        this.txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Prescription issued on blockchain:', receipt.transactionHash);

      // Extract prescription ID from events
      const prescriptionEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'PrescriptionIssued';
        } catch (e) {
          return false;
        }
      });

      let prescriptionId = null;
      if (prescriptionEvent) {
        const parsed = this.contract.interface.parseLog(prescriptionEvent);
        prescriptionId = parsed.args[0].toString();
      }

      return {
        success: true,
        prescriptionId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to issue prescription on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Grant consent on blockchain (PRIMARY DATA STORE)
   */
  async grantConsent(patientWallet, providerWallet, consentType, durationHours = 0) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('🔐 Granting consent on blockchain:', { 
        patientWallet, 
        providerWallet, 
        consentType, 
        durationHours 
      });

      // Grant consent on blockchain
      const tx = await this.contractWithSigner.grantConsent(
        providerWallet,
        consentType,
        durationHours,
        this.txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Consent granted on blockchain:', receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to grant consent on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke consent on blockchain
   */
  async revokeConsent(patientWallet, providerWallet, consentType) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('🚫 Revoking consent on blockchain:', { patientWallet, providerWallet, consentType });

      const tx = await this.contractWithSigner.revokeConsent(
        providerWallet,
        consentType,
        this.txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Consent revoked on blockchain:', receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to revoke consent on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit lab result on blockchain
   */
  async submitLabResult(patientWallet, labTechWallet, ipfsHash) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('🔬 Submitting lab result on blockchain:', { patientWallet, labTechWallet, ipfsHash });

      // Check consent first
      const hasConsent = await this.checkActiveConsent(patientWallet, labTechWallet, this.ConsentType.LabResults);
      if (!hasConsent) {
        throw new Error('No active consent for lab results');
      }

      const tx = await this.contractWithSigner.submitLabResult(
        patientWallet,
        ipfsHash,
        this.txOptions
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Lab result submitted on blockchain:', receipt.transactionHash);

      // Extract lab result ID from events
      const labEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'LabResultSubmitted';
        } catch (e) {
          return false;
        }
      });

      let labResultId = null;
      if (labEvent) {
        const parsed = this.contract.interface.parseLog(labEvent);
        labResultId = parsed.args[0].toString();
      }

      return {
        success: true,
        labResultId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Failed to submit lab result on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Book appointment with payment on blockchain
   */
  async bookAppointment(patientWallet, doctorWallet, appointmentFee) {
    try {
      if (!this.contractWithSigner) {
        throw new Error('Blockchain writes not enabled - missing private key');
      }

      console.log('📅 Booking appointment on blockchain:', { 
        patientWallet, 
        doctorWallet, 
        appointmentFee: ethers.formatEther(appointmentFee) + ' ETH'
      });

      const tx = await this.contractWithSigner.bookAppointment(
        doctorWallet,
        {
          ...this.txOptions,
          value: appointmentFee
        }
      );

      console.log('⏳ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Appointment booked on blockchain:', receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        appointmentFee: ethers.formatEther(appointmentFee)
      };
    } catch (error) {
      console.error('❌ Failed to book appointment on blockchain:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check active consent (READ from blockchain)
   */
  async checkActiveConsent(patientWallet, providerWallet, consentType) {
    try {
      const hasConsent = await this.contract.checkConsent(
        patientWallet,
        providerWallet,
        consentType
      );
      
      console.log('🔍 Consent check:', { 
        patientWallet: patientWallet.substring(0, 8) + '...', 
        providerWallet: providerWallet.substring(0, 8) + '...', 
        consentType: this.getConsentTypeName(consentType),
        hasConsent 
      });
      
      return hasConsent;
    } catch (error) {
      console.error('❌ Failed to check consent:', error.message);
      return false;
    }
  }

  /**
   * Get medical records from blockchain
   */
  async getMedicalRecordsFromBlockchain(patientWallet) {
    try {
      const records = await this.contract.getMedicalRecords(patientWallet);
      console.log('📋 Retrieved medical records from blockchain:', records.length, 'records');
      return records;
    } catch (error) {
      console.error('❌ Failed to get medical records from blockchain:', error.message);
      return [];
    }
  }

  /**
   * Get contract fees
   */
  async getFees() {
    try {
      const [patientFee, doctorFee, pharmacistFee, labTechFee, appointmentFee] = await Promise.all([
        this.contract.patientFee(),
        this.contract.doctorFee(),
        this.contract.pharmacistFee(),
        this.contract.labTechnicianFee(),
        this.contract.appointmentFee()
      ]);

      return {
        patientFee: ethers.formatEther(patientFee),
        doctorFee: ethers.formatEther(doctorFee),
        pharmacistFee: ethers.formatEther(pharmacistFee),
        labTechnicianFee: ethers.formatEther(labTechFee),
        appointmentFee: ethers.formatEther(appointmentFee)
      };
    } catch (error) {
      console.error('Error getting fees:', error.message);
      return null;
    }
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
