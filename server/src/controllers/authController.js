const { Session } = require('../models/Session.js');
const { User } = require('../models/User.js');
const JWTService = require('../utils/jwt.js');
const Web3Service = require('../utils/web3.js');

class AuthController {
  // Generate nonce for wallet authentication
  async generateNonce(req, res) {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const nonceData = JWTService.generateNonce(walletAddress);

      res.json({
        success: true,
        nonce: nonceData.nonce,
        message: nonceData.message,
        expiresAt: nonceData.expiresAt
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate nonce: ' + error.message
      });
    }
  }

  // Authenticate with wallet signature
  async authenticate(req, res) {
    try {
      const { walletAddress, signature, message } = req.body;

      if (!walletAddress || !signature || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: walletAddress, signature, message'
        });
      }

      // Verify signature
      const isValid = Web3Service.verifySignature(message, signature, walletAddress);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      // Check if user exists, create if not
      let user = await User.findByWalletAddress(walletAddress);
      if (!user) {
        user = await User.create(walletAddress, 'patient');
      }

      // Generate JWT token
      const token = JWTService.generateToken({
        walletAddress: user.wallet_address,
        role: user.role,
        userId: user.id
      });

      // Create session
      await Session.create(walletAddress, token);

      res.json({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: {
          walletAddress: user.wallet_address,
          role: user.role,
          email: user.email,
          specialization: user.specialization
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authentication failed: ' + error.message
      });
    }
  }

  // Logout - invalidate session
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      await Session.invalidate(token);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed: ' + error.message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const walletAddress = req.walletAddress;

      const user = await User.findByWalletAddress(walletAddress);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          walletAddress: user.wallet_address,
          role: user.role,
          email: user.email,
          phone: user.phone,
          specialization: user.specialization,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get profile: ' + error.message
      });
    }
  }
}

module.exports = new AuthController();
