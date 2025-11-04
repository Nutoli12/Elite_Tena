const { ethers } = require('ethers');
require('dotenv').config();

class Web3Service {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545');
    this.contract = null;
    this.initContract();
  }

  // Initialize contract instance
  initContract() {
    if (process.env.CONTRACT_ADDRESS && process.env.CONTRACT_ABI) {
      try {
        const abi = JSON.parse(process.env.CONTRACT_ABI);
        this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, this.provider);
      } catch (error) {
        console.warn('Contract initialization failed:', error.message);
      }
    }
  }

  // Verify signature from MetaMask
  static verifySignature(message, signature, address) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // Get user's ETH balance
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Get network information
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber: blockNumber
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  // Contract interaction methods
  async isDoctorApproved(walletAddress) {
    if (!this.contract) {
      console.warn('Contract not initialized');
      return false;
    }

    try {
      return await this.contract.isDoctorApproved(walletAddress);
    } catch (error) {
      console.error('Failed to check doctor approval:', error);
      return false;
    }
  }

  async getPatientRecords(walletAddress) {
    if (!this.contract) {
      console.warn('Contract not initialized');
      return [];
    }

    try {
      return await this.contract.getMedicalRecords(walletAddress);
    } catch (error) {
      console.error('Failed to get patient records:', error);
      return [];
    }
  }
}

module.exports = new Web3Service();
