import pool from '../config/database.js';

export class User {
  // Create new user
  static async create(walletAddress, role = 'patient', specialization = null, email = null, phone = null) {
    try {
      const result = await pool.query(
        `INSERT INTO users (wallet_address, role, specialization, email, phone) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [walletAddress, role, specialization, email, phone]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('User already exists');
      }
      throw error;
    }
  }

  // Find user by wallet address
  static async findByWallet(walletAddress) {
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0];
  }

  // Update user last login
  static async updateLastLogin(walletAddress) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE wallet_address = $1',
      [walletAddress]
    );
  }

  // Get all doctors
  static async getDoctors() {
    const result = await pool.query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
      ['doctor']
    );
    return result.rows;
  }

  // Update user profile
  static async updateProfile(walletAddress, updates) {
    const { email, phone, specialization } = updates;
    const result = await pool.query(
      `UPDATE users 
       SET email = COALESCE($2, email), 
           phone = COALESCE($3, phone),
           specialization = COALESCE($4, specialization),
           updated_at = CURRENT_TIMESTAMP
       WHERE wallet_address = $1 
       RETURNING *`,
      [walletAddress, email, phone, specialization]
    );
    return result.rows[0];
  }
}
