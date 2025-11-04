const express = require('express');
const { User } = require('../models/User.js');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { walletAddress, role, specialization, email, phone } = req.body;
    
    const user = await User.create(walletAddress, role, specialization, email, phone);
    
    res.json({
      success: true,
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user by wallet address
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findByWalletAddress(walletAddress);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user profile
router.put('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const updates = req.body;
    
    const user = await User.update(walletAddress, updates);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
