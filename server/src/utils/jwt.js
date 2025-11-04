const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'elite-tena-secret-key-change-in-production';
    this.expiresIn = '24h';
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Generate hash of token for secure storage
  static generateTokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Extract wallet address from token
  getWalletAddressFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      return decoded.walletAddress;
    } catch (error) {
      return null;
    }
  }

  // Generate nonce for wallet authentication
  generateNonce(walletAddress) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = 'Sign this message to authenticate with Elite Tena. Nonce: ' + nonce;
    
    return {
      nonce,
      message,
      expiresAt: Date.now() + 300000 // 5 minutes
    };
  }
}

module.exports = new JWTService();
