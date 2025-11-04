const pool = require('../config/database.js');

class User {
  // Create new user
  static async create(walletAddress, role = 'patient', specialization = null, email = null, phone = null) { 
    try {
      const result = await pool.query(
        'INSERT INTO users (wallet_address, role, specialization, email, phone) VALUES (, , , , ) RETURNING *',
        [walletAddress, role, specialization, email, phone]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  }

  // Find user by wallet address
  static async findByWalletAddress(walletAddress) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE wallet_address = ',
        [walletAddress]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Error finding user: ' + error.message);
    }
  }

  // Update user profile
  static async update(walletAddress, updates) {
    try {
      const { email, phone, specialization } = updates;
      const result = await pool.query(
        'UPDATE users SET email = COALESCE(, email), phone = COALESCE(, phone), specialization = COALESCE(, specialization), updated_at = CURRENT_TIMESTAMP WHERE wallet_address =  RETURNING *',
        [walletAddress, email, phone, specialization]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  }

  // Get all users by role
  static async findByRole(role) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE role =  ORDER BY created_at DESC',
        [role]
      );
      return result.rows;
    } catch (error) {
      throw new Error('Error finding users by role: ' + error.message);
    }
  }
}

module.exports = { User };
