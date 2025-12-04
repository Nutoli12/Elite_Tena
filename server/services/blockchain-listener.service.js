const { ethers } = require('ethers');
const db = require('../src/models');

class BlockchainListener {
  constructor(contractAddress, contractABI, providerUrl) {
    if (!contractAddress || !providerUrl) {
      console.warn('⚠️  Blockchain listener not initialized: Missing configuration');
      this.enabled = false;
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(providerUrl);
      this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
      this.enabled = true;
      console.log('✅ Blockchain listener initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain listener:', error.message);
      this.enabled = false;
    }
  }

  async startListening() {
    if (!this.enabled) {
      console.log('⚠️  Blockchain listener disabled');
      return;
    }

    console.log('🔍 Starting blockchain event listeners...');

    try {
      // Listen to Consent Events
      this.contract.on('ConsentGranted', async (consentId, patient, provider, consentType, expiresAt, event) => {
        console.log('📋 ConsentGranted Event:', {
          consentId: consentId.toString(),
          patient,
          provider,
          consentType,
          expiresAt: expiresAt.toString(),
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          // Sync to database
          await db.Consent.findOrCreate({
            where: {
              patientWallet: patient.toLowerCase(),
              providerWallet: provider.toLowerCase(),
              consentType: this.getConsentTypeName(consentType)
            },
            defaults: {
              patientWallet: patient.toLowerCase(),
              providerWallet: provider.toLowerCase(),
              consentType: this.getConsentTypeName(consentType),
              expiresAt: new Date(Number(expiresAt) * 1000),
              isActive: true,
              blockchainTxHash: event.log.transactionHash
            }
          });
          console.log('✅ Consent synced to database');
        } catch (error) {
          console.error('❌ Failed to sync consent:', error.message);
        }
      });

      // Listen to Consent Revoked
      this.contract.on('ConsentRevoked', async (patient, provider, consentType, event) => {
        console.log('🚫 ConsentRevoked Event:', {
          patient,
          provider,
          consentType,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          await db.Consent.update(
            { isActive: false },
            {
              where: {
                patientWallet: patient.toLowerCase(),
                providerWallet: provider.toLowerCase(),
                consentType: this.getConsentTypeName(consentType)
              }
            }
          );
          console.log('✅ Consent revocation synced to database');
        } catch (error) {
          console.error('❌ Failed to sync consent revocation:', error.message);
        }
      });

      // Listen to Medical Record Events
      this.contract.on('MedicalRecordStored', async (patient, cid, event) => {
        console.log('📄 MedicalRecordStored Event:', {
          patient,
          cid,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          // Update medical record with blockchain confirmation
          await db.MedicalRecord.update(
            { blockchainTxHash: event.log.transactionHash },
            {
              where: {
                patientWallet: patient.toLowerCase(),
                ipfsHash: cid
              }
            }
          );
          console.log('✅ Medical record blockchain confirmation synced');
        } catch (error) {
          console.error('❌ Failed to sync medical record:', error.message);
        }
      });

      // Listen to Prescription Events
      this.contract.on('PrescriptionIssued', async (prescriptionId, patient, doctor, event) => {
        console.log('💊 PrescriptionIssued Event:', {
          prescriptionId: prescriptionId.toString(),
          patient,
          doctor,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          await db.Prescription.update(
            { blockchainTxHash: event.log.transactionHash },
            {
              where: {
                patientWallet: patient.toLowerCase(),
                doctorWallet: doctor.toLowerCase()
              }
            }
          );
          console.log('✅ Prescription blockchain confirmation synced');
        } catch (error) {
          console.error('❌ Failed to sync prescription:', error.message);
        }
      });

      // Listen to Prescription Filled
      this.contract.on('PrescriptionFilled', async (prescriptionId, pharmacist, event) => {
        console.log('✅ PrescriptionFilled Event:', {
          prescriptionId: prescriptionId.toString(),
          pharmacist,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          // Update prescription status
          await db.Prescription.update(
            { status: 'filled' },
            {
              where: { blockchainTxHash: event.log.transactionHash }
            }
          );
          console.log('✅ Prescription filled status synced');
        } catch (error) {
          console.error('❌ Failed to sync prescription filled:', error.message);
        }
      });

      // Listen to Lab Result Events
      this.contract.on('LabResultSubmitted', async (resultId, patient, labTech, event) => {
        console.log('🔬 LabResultSubmitted Event:', {
          resultId: resultId.toString(),
          patient,
          labTech,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          await db.LabResult.update(
            { blockchainTxHash: event.log.transactionHash },
            {
              where: {
                patientWallet: patient.toLowerCase(),
                labTechWallet: labTech.toLowerCase()
              }
            }
          );
          console.log('✅ Lab result blockchain confirmation synced');
        } catch (error) {
          console.error('❌ Failed to sync lab result:', error.message);
        }
      });

      // Listen to Appointment Events
      this.contract.on('AppointmentBooked', async (appointmentId, patient, doctor, event) => {
        console.log('📅 AppointmentBooked Event:', {
          appointmentId: appointmentId.toString(),
          patient,
          doctor,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash
        });

        try {
          await db.Appointment.update(
            { blockchainTxHash: event.log.transactionHash },
            {
              where: {
                patientWallet: patient.toLowerCase(),
                doctorWallet: doctor.toLowerCase()
              }
            }
          );
          console.log('✅ Appointment blockchain confirmation synced');
        } catch (error) {
          console.error('❌ Failed to sync appointment:', error.message);
        }
      });

      console.log('✅ All blockchain event listeners active');
    } catch (error) {
      console.error('❌ Failed to start event listeners:', error.message);
    }
  }

  getConsentTypeName(consentType) {
    const types = ['MedicalRecords', 'Prescriptions', 'LabResults', 'Appointments', 'All'];
    return types[consentType] || 'Unknown';
  }

  async stopListening() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log('🛑 Blockchain event listeners stopped');
    }
  }
}

module.exports = BlockchainListener;
