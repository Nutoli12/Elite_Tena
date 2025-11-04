import express from 'express';
import { Web3Service } from '../utils/web3.js';
import { JWTService } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Store nonces temporarily (in production, use Redis)
const authNonces = new Map();

// Step 1: Request authentication challenge
router.post('/challenge', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !Web3Service.isValidAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address',
        message: 'Please provide a valid Ethereum wallet address'
      });
    }

    // Generate and store nonce
    const nonce = Web3Service.generateNonce();
    authNonces.set(walletAddress, {
      nonce,
      timestamp: Date.now()
    });

    // Clean old nonces (older than 10 minutes)
    const now = Date.now();
    for (const [addr, data] of authNonces.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        authNonces.delete(addr);
      }
    }

    const message = Web3Service.createAuthMessage(nonce);

    res.json({
      success: true,
      message,
      nonce
    });

  } catch (error) {
    console.error('Challenge generation failed:', error);
    res.status(500).json({
      error: 'Challenge generation failed',
      message: error.message
    });
  }
});

// Step 2: Verify signature and authenticate
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Wallet address and signature are required'
      });
    }

    // Get stored nonce
    const nonceData = authNonces.get(walletAddress);
    if (!nonceData) {
      return res.status(400).json({
        error: 'Invalid challenge',
        message: 'Please request a new authentication challenge'
      });
    }

    // Clean up used nonce
    authNonces.delete(walletAddress);

    const message = Web3Service.createAuthMessage(nonceData.nonce);

    // Verify signature
    const isValid = Web3Service.verifySignature(message, signature, walletAddress);
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Signature verification failed'
      });
    }

    // Get user role from blockchain
    const blockchainRole = await Web3Service.getUserRole(walletAddress);
    
    // Create or update user in database
    let user = await User.findByWallet(walletAddress);
    
    if (!user) {
      // Create new user based on blockchain role
      user = await User.create(
        walletAddress, 
        blockchainRole === 'unregistered' ? 'patient' : blockchainRole
      );
    } else {
      // Update last login
      await User.updateLastLogin(walletAddress);
    }

    // Generate JWT token
    const tokenPayload = {
      walletAddress,
      role: user.role,
      specialization: user.specialization
    };

    const token = JWTService.generateToken(tokenPayload);

    // Create session in database
    await Session.create(walletAddress, token);

    res.json({
      success: true,
      token,
      user: {
        walletAddress: user.wallet_address,
        role: user.role,
        specialization: user.specialization,
        email: user.email,
        phone: user.phone,
        registered: blockchainRole !== 'unregistered'
      },
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Step 3: Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.replace('Bearer ', '');
    
    await Session.delete(token);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout failed:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

// Step 4: Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findByWallet(req.user.walletAddress);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Get blockchain status
    const blockchainRole = await Web3Service.getUserRole(req.user.walletAddress);
    const isDoctorApproved = req.user.role === 'doctor' ? 
      await Web3Service.isDoctorApproved(req.user.walletAddress) : null;

    res.json({
      user: {
        walletAddress: user.wallet_address,
        role: user.role,
        specialization: user.specialization,
        email: user.email,
        phone: user.phone,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        blockchainStatus: {
          registered: blockchainRole !== 'unregistered',
          role: blockchainRole,
          doctorApproved: isDoctorApproved
        }
      }
    });

  } catch (error) {
    console.error('Profile fetch failed:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: error.message
    });
  }
});

// Step 5: Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email, phone, specialization } = req.body;

    const updatedUser = await User.updateProfile(req.user.walletAddress, {
      email,
      phone,
      specialization
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: error.message
    });
  }
});

// Step 6: Validate token (for frontend to check if still valid)
router.get('/validate', requireAuth, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export default router;
