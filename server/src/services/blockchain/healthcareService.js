// services/blockchain/healthcareService.js
const { ethers } = require('ethers');

class HealthcareBlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      healthcareABI,
      this.wallet
    );
  }

  async recordConsent(patientWallet, doctorWallet, permissionType, expiresAt) {
    const tx = await this.contract.recordConsent(
      patientWallet,
      doctorWallet, 
      permissionType,
      expiresAt
    );
    return await tx.wait();
  }

  async storeMedicalRecordHash(patientWallet, ipfsHash) {
    const tx = await this.contract.storeRecordHash(patientWallet, ipfsHash);
    return await tx.wait();
  }
}

module.exports = HealthcareBlockchainService;