import express from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  verifySignature,
  connectWallet,
  verifyWallet,
  getNonce
} from '../controllers/authController.js';

const router = express.Router();

// Existing auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.post('/verify-signature', verifySignature);

// 🔐 NEW: Wallet Authentication Endpoints
router.post('/wallet/connect', connectWallet);
router.post('/wallet/verify', verifyWallet);
router.get('/wallet/nonce/:walletAddress', getNonce);

// Simple info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Elite-Tena Web3 Authentication API',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'POST /api/auth/logout',
      'GET /api/auth/profile',
      'POST /api/auth/verify-signature',
      '🔐 POST /api/auth/wallet/connect',
      '🔐 POST /api/auth/wallet/verify', 
      '🔐 GET /api/auth/wallet/nonce/:walletAddress'
    ]
  });
});

export default router;
