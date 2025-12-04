import { Contract } from 'ethers';

export class BlockchainService {
  private contract: Contract;

  constructor(contract: Contract) {
    this.contract = contract;
  }

  // Patient Registration
  async registerPatient(patientAddress: string) {
    try {
      const tx = await this.contract.registerPatient(patientAddress);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error registering patient:', error);
      return { success: false, error: error.message };
    }
  }

  // Doctor Registration
  async registerDoctor(doctorAddress: string) {
    try {
      const tx = await this.contract.registerDoctor(doctorAddress);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error registering doctor:', error);
      return { success: false, error: error.message };
    }
  }

  // Grant Consent
  async grantConsent(doctorAddress: string, expiryTime: number) {
    try {
      const tx = await this.contract.grantConsent(doctorAddress, expiryTime);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error granting consent:', error);
      return { success: false, error: error.message };
    }
  }

  // Revoke Consent
  async revokeConsent(doctorAddress: string) {
    try {
      const tx = await this.contract.revokeConsent(doctorAddress);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error revoking consent:', error);
      return { success: false, error: error.message };
    }
  }

  // Add Medical Record
  async addMedicalRecord(patientAddress: string, ipfsHash: string, recordType: string) {
    try {
      const tx = await this.contract.addMedicalRecord(patientAddress, ipfsHash, recordType);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error adding medical record:', error);
      return { success: false, error: error.message };
    }
  }

  // Add Prescription
  async addPrescription(patientAddress: string, ipfsHash: string) {
    try {
      const tx = await this.contract.addPrescription(patientAddress, ipfsHash);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error adding prescription:', error);
      return { success: false, error: error.message };
    }
  }

  // Add Lab Result
  async addLabResult(patientAddress: string, ipfsHash: string) {
    try {
      const tx = await this.contract.addLabResult(patientAddress, ipfsHash);
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Error adding lab result:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen to events
  setupEventListeners(callbacks: {
    onPatientRegistered?: (patient: string, timestamp: bigint) => void;
    onDoctorRegistered?: (doctor: string, timestamp: bigint) => void;
    onConsentGranted?: (patient: string, doctor: string, expiryTime: bigint) => void;
    onConsentRevoked?: (patient: string, doctor: string) => void;
    onMedicalRecordAdded?: (patient: string, doctor: string, ipfsHash: string, timestamp: bigint) => void;
    onPrescriptionAdded?: (patient: string, doctor: string, ipfsHash: string, timestamp: bigint) => void;
    onLabResultAdded?: (patient: string, labTech: string, ipfsHash: string, timestamp: bigint) => void;
  }) {
    if (callbacks.onPatientRegistered) {
      this.contract.on('PatientRegistered', callbacks.onPatientRegistered);
    }
    if (callbacks.onDoctorRegistered) {
      this.contract.on('DoctorRegistered', callbacks.onDoctorRegistered);
    }
    if (callbacks.onConsentGranted) {
      this.contract.on('ConsentGranted', callbacks.onConsentGranted);
    }
    if (callbacks.onConsentRevoked) {
      this.contract.on('ConsentRevoked', callbacks.onConsentRevoked);
    }
    if (callbacks.onMedicalRecordAdded) {
      this.contract.on('MedicalRecordAdded', callbacks.onMedicalRecordAdded);
    }
    if (callbacks.onPrescriptionAdded) {
      this.contract.on('PrescriptionAdded', callbacks.onPrescriptionAdded);
    }
    if (callbacks.onLabResultAdded) {
      this.contract.on('LabResultAdded', callbacks.onLabResultAdded);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}
