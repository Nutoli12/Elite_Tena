import express from 'express';
import pool from '../config/database.js';
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const { walletAddress, role = 'patient', email, phone } = req.body;

  if (!walletAddress) return res.status(400).json({ error: 'walletAddress is required' });

  try {
    await pool.query(
      `INSERT INTO users (wallet_address, role, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [walletAddress, role, email, phone]
    );
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user by wallet address
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export { router as default };
