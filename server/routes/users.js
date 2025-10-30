import express from 'express';
import pool from '../src/config/database.js';

const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { walletAddress, role, email, phone } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO users (wallet_address, role, email, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [walletAddress, role || 'patient', email, phone]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// ✅ Make sure to export default
export default router;
