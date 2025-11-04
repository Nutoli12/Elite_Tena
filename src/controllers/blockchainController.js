const Web3Service = require('../utils/web3.js');

class BlockchainController {
  // Get blockchain status
  async getStatus(req, res) {
    try {
      const networkInfo = await Web3Service.getNetworkInfo();
      
      if (!networkInfo) {
        return res.status(500).json({
          success: false,
          message: 'Cannot connect to blockchain'
        });
      }

      res.json({
        success: true,
        network: networkInfo.name,
        chainId: networkInfo.chainId,
        blockNumber: networkInfo.blockNumber,
        status: 'Connected'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Blockchain connection error: ' + error.message
      });
    }
  }

  // Verify signature endpoint
  async verifySignature(req, res) {
    try {
      const { message, signature, walletAddress } = req.body;

      if (!message || !signature || !walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: message, signature, walletAddress'
        });
      }

      const isValid = Web3Service.verifySignature(message, signature, walletAddress);

      res.json({
        success: true,
        isValid: isValid,
        walletAddress: walletAddress
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Signature verification failed: ' + error.message
      });
    }
  }

  // Get wallet balance
  async getBalance(req, res) {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const balance = await Web3Service.getBalance(walletAddress);

      res.json({
        success: true,
        walletAddress: walletAddress,
        balance: balance,
        currency: 'ETH'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get balance: ' + error.message
      });
    }
  }

  // Check if doctor is approved on blockchain
  async checkDoctorApproval(req, res) {
    try {
      const { walletAddress } = req.params;

      const isApproved = await Web3Service.isDoctorApproved(walletAddress);

      res.json({
        success: true,
        walletAddress: walletAddress,
        isApproved: isApproved
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check doctor approval: ' + error.message
      });
    }
  }
}

module.exports = new BlockchainController();
