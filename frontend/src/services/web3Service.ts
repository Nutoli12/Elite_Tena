/**
 * Web3 Service - Frontend Blockchain Integration
 * Handles all blockchain interactions from the frontend
 */

import { ethers } from 'ethers';

// Import contract ABI (you'll need to copy this from the smart contract compilation)
const CONTRACT_ABI = [
  // Core functions we need
  "function storeMedicalRecord(address _patient, string memory _ipfsHash) external",
  "function issuePrescription(address _patient, string memory _ipfsHash) external returns (uint256)",
  "function grantConsent(address _provider, uint8 _consentType, uint256 _durationHours) external",
  "function revokeConsent(address _provider, uint8 _consentType) external",
  "function submitLabResult(address _patient, string memory _ipfsHash) external returns (uint256)",
  "function bookAppointment(address _doctor) external payable",
  "function checkConsent(address _patient, address _provider, uint8 _consentType) external view returns (bool)",
  "function getMedicalRecords(address _patient) external view returns (string[] memory)",
  "function getUserInfo(address _user) external view returns (tuple(address walletAddress, uint8 role, bool isRegistered, bool isApproved, string profileData, uint256 registrationDate))",
  
  // Events
  "event MedicalRecordStored(address indexed patient, address indexed doctor, string ipfsHash)",
  "event PrescriptionIssued(uint256 indexed prescriptionId, address indexed patient, address indexed doctor)",
  "event ConsentGranted(address indexed patient, address indexed provider, uint8 consentType, uint256 expiresAt)",
  "event ConsentRevoked(address indexed patient, address indexed provider, uint8 consentType)",
  "event LabResultSubmitted(uint256 indexed resultId, address indexed patient, address indexed labTech)",
  "event AppointmentBooked(address indexed patient, address indexed doctor, uint256 amount)"
];

export interface Web3Transaction {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
  success: boolean;
  error?: string;
}

export interface ConsentData {
  provider: string;
  consentType: ConsentType;
  durationHours?: number;
}

export enum ConsentType {
  MedicalRecords = 0,
  Prescriptions = 1,
  LabResults = 2,
  Appointments = 3,
  All = 4
}

class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor() {
    this.contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x2c0cE04B1013451660f62DE1292440e4bead3894';
  }

  /**
   * Initialize Web3 connection
   */
  async initialize(): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      console.log('🔗 Initializing Web3 service...');
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      this.contract = new ethers.Contract(
        this.contractAddress,
        CONTRACT_ABI,
        this.signer
      );

      const network = await this.provider.getNetwork();
      console.log('✅ Web3 service initialized');
      console.log('   Contract:', this.contractAddress);
      console.log('   Network:', network.name, 'Chain ID:', network.chainId.toString());
      console.log('   Signer:', await this.signer.getAddress());

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3 service:', error);
      return false;
    }
  }

  /**
   * Store medical record on blockchain
   */
  async storeMedicalRecord(patientWallet: string, ipfsHash: string): Promise<Web3Transaction> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('📝 Storing medical record on blockchain:', { patientWallet, ipfsHash });

      const tx = await this.contract.storeMedicalRecord(patientWallet, ipfsHash);
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Medical record stored on blockchain:', receipt.transactionHash);

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true
      };
    } catch (error: any) {
      console.error('❌ Failed to store medical record:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Issue prescription on blockchain
   */
  async issuePrescription(patientWallet: string, ipfsHash: string): Promise<Web3Transaction & { prescriptionId?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('💊 Issuing prescription on blockchain:', { patientWallet, ipfsHash });

      const tx = await this.contract.issuePrescription(patientWallet, ipfsHash);
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Prescription issued on blockchain:', receipt.transactionHash);

      // Extract prescription ID from events
      let prescriptionId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'PrescriptionIssued') {
            prescriptionId = parsed.args[0].toString();
            break;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true,
        prescriptionId
      };
    } catch (error: any) {
      console.error('❌ Failed to issue prescription:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Grant consent on blockchain
   */
  async grantConsent(providerWallet: string, consentType: ConsentType, durationHours: number = 0): Promise<Web3Transaction> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('🔐 Granting consent on blockchain:', { 
        providerWallet, 
        consentType: ConsentType[consentType], 
        durationHours 
      });

      const tx = await this.contract.grantConsent(providerWallet, consentType, durationHours);
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Consent granted on blockchain:', receipt.transactionHash);

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true
      };
    } catch (error: any) {
      console.error('❌ Failed to grant consent:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke consent on blockchain
   */
  async revokeConsent(providerWallet: string, consentType: ConsentType): Promise<Web3Transaction> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('🚫 Revoking consent on blockchain:', { 
        providerWallet, 
        consentType: ConsentType[consentType]
      });

      const tx = await this.contract.revokeConsent(providerWallet, consentType);
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Consent revoked on blockchain:', receipt.transactionHash);

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true
      };
    } catch (error: any) {
      console.error('❌ Failed to revoke consent:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit lab result on blockchain
   */
  async submitLabResult(patientWallet: string, ipfsHash: string): Promise<Web3Transaction & { labResultId?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('🔬 Submitting lab result on blockchain:', { patientWallet, ipfsHash });

      const tx = await this.contract.submitLabResult(patientWallet, ipfsHash);
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Lab result submitted on blockchain:', receipt.transactionHash);

      // Extract lab result ID from events
      let labResultId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'LabResultSubmitted') {
            labResultId = parsed.args[0].toString();
            break;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true,
        labResultId
      };
    } catch (error: any) {
      console.error('❌ Failed to submit lab result:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Book appointment with payment on blockchain
   */
  async bookAppointment(doctorWallet: string, appointmentFee: string): Promise<Web3Transaction> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      console.log('📅 Booking appointment on blockchain:', { 
        doctorWallet, 
        appointmentFee: appointmentFee + ' ETH'
      });

      const feeInWei = ethers.parseEther(appointmentFee);
      const tx = await this.contract.bookAppointment(doctorWallet, { value: feeInWei });
      console.log('⏳ Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Appointment booked on blockchain:', receipt.transactionHash);

      return {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        success: true
      };
    } catch (error: any) {
      console.error('❌ Failed to book appointment:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check consent status (READ from blockchain)
   */
  async checkConsent(patientWallet: string, providerWallet: string, consentType: ConsentType): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      const hasConsent = await this.contract.checkConsent(patientWallet, providerWallet, consentType);
      console.log('🔍 Consent check:', { 
        patient: patientWallet.substring(0, 8) + '...', 
        provider: providerWallet.substring(0, 8) + '...', 
        consentType: ConsentType[consentType],
        hasConsent 
      });

      return hasConsent;
    } catch (error) {
      console.error('❌ Failed to check consent:', error);
      return false;
    }
  }

  /**
   * Get medical records from blockchain
   */
  async getMedicalRecords(patientWallet: string): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      const records = await this.contract.getMedicalRecords(patientWallet);
      console.log('📋 Retrieved medical records from blockchain:', records.length, 'records');
      return records;
    } catch (error) {
      console.error('❌ Failed to get medical records:', error);
      return [];
    }
  }

  /**
   * Get user info from blockchain
   */
  async getUserInfo(walletAddress: string): Promise<any> {
    try {
      if (!this.contract) {
        throw new Error('Web3 not initialized');
      }

      const userInfo = await this.contract.getUserInfo(walletAddress);
      return {
        walletAddress: userInfo.walletAddress,
        role: userInfo.role,
        isRegistered: userInfo.isRegistered,
        isApproved: userInfo.isApproved,
        profileData: userInfo.profileData,
        registrationDate: new Date(Number(userInfo.registrationDate) * 1000)
      };
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Listen to blockchain events
   */
  setupEventListeners(callback: (event: any) => void) {
    if (!this.contract) {
      console.error('❌ Cannot setup event listeners - Web3 not initialized');
      return;
    }

    console.log('🔍 Setting up blockchain event listeners...');

    // Listen to all relevant events
    this.contract.on('MedicalRecordStored', (patient, doctor, ipfsHash, event) => {
      callback({
        type: 'MedicalRecordStored',
        data: { patient, doctor, ipfsHash },
        transactionHash: event.log.transactionHash
      });
    });

    this.contract.on('PrescriptionIssued', (prescriptionId, patient, doctor, event) => {
      callback({
        type: 'PrescriptionIssued',
        data: { prescriptionId: prescriptionId.toString(), patient, doctor },
        transactionHash: event.log.transactionHash
      });
    });

    this.contract.on('ConsentGranted', (patient, provider, consentType, expiresAt, event) => {
      callback({
        type: 'ConsentGranted',
        data: { patient, provider, consentType, expiresAt: expiresAt.toString() },
        transactionHash: event.log.transactionHash
      });
    });

    this.contract.on('ConsentRevoked', (patient, provider, consentType, event) => {
      callback({
        type: 'ConsentRevoked',
        data: { patient, provider, consentType },
        transactionHash: event.log.transactionHash
      });
    });

    console.log('✅ Blockchain event listeners active');
  }

  /**
   * Get current signer address
   */
  async getSignerAddress(): Promise<string | null> {
    try {
      if (!this.signer) {
        return null;
      }
      return await this.signer.getAddress();
    } catch (error) {
      console.error('❌ Failed to get signer address:', error);
      return null;
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<any> {
    try {
      if (!this.provider) {
        return null;
      }
      return await this.provider.getNetwork();
    } catch (error) {
      console.error('❌ Failed to get network info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
export default web3Service;