const { ethers } = require('ethers');
require('dotenv').config();

class Web3Service {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initProvider();
    this.initContract();
  }

  // Initialize provider with better error handling
  initProvider() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
      
      // Create provider with polling disabled to prevent filter errors
      this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        polling: false, // Disable automatic polling
        batchMaxCount: 1 // Reduce batch size
      });

      // Set up error handling
      this.provider.on('error', (error) => {
        console.warn('Web3 Provider Error (non-critical):', error.message);
        // Don't throw - just log the error
      });

      console.log('✅ Web3 Provider initialized successfully');
    } catch (error) {
      console.warn('⚠️ Web3 Provider initialization failed:', error.message);
      this.provider = null;
    }
  }

  // Initialize contract instance
  initContract() {
    if (process.env.CONTRACT_ADDRESS && process.env.CONTRACT_ABI && this.provider) {
      try {
        const abi = JSON.parse(process.env.CONTRACT_ABI);
        this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, this.provider);
        console.log('✅ Smart Contract initialized successfully');
      } catch (error) {
        console.warn('⚠️ Contract initialization failed:', error.message);
        this.contract = null;
      }
    } else {
      console.warn('⚠️ Contract not initialized - missing CONTRACT_ADDRESS, CONTRACT_ABI, or provider');
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

  // Get user's ETH balance with retry logic
  async getBalance(address) {
    if (!this.provider) {
      console.warn('Provider not available for balance check');
      return '0';
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.warn('Failed to get balance (non-critical):', error.message);
      return '0';
    }
  }

  // Get network information with timeout
  async getNetworkInfo() {
    if (!this.provider) {
      console.warn('Provider not available for network info');
      return null;
    }

    try {
      // Add timeout to prevent hanging
      const networkPromise = this.provider.getNetwork();
      const blockPromise = this.provider.getBlockNumber();
      
      const [network, blockNumber] = await Promise.race([
        Promise.all([networkPromise, blockPromise]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network request timeout')), 5000)
        )
      ]);
      
      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber: blockNumber
      };
    } catch (error) {
      console.warn('Failed to get network info (non-critical):', error.message);
      return null;
    }
  }

  // Contract interaction methods with better error handling
  async isDoctorApproved(walletAddress) {
    if (!this.contract) {
      console.warn('Contract not available for doctor approval check');
      return false;
    }

    try {
      return await this.contract.isDoctorApproved(walletAddress);
    } catch (error) {
      console.warn('Failed to check doctor approval (non-critical):', error.message);
      return false;
    }
  }

  async getPatientRecords(walletAddress) {
    if (!this.contract) {
      console.warn('Contract not available for patient records');
      return [];
    }

    try {
      return await this.contract.getMedicalRecords(walletAddress);
    } catch (error) {
      console.warn('Failed to get patient records (non-critical):', error.message);
      return [];
    }
  }

  // Health check method
  async isHealthy() {
    if (!this.provider) {
      return false;
    }

    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Reconnect method
  async reconnect() {
    console.log('🔄 Attempting to reconnect Web3 provider...');
    this.initProvider();
    this.initContract();
  }
}

module.exports = new Web3Service();
