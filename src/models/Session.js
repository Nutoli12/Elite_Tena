const pool = require('../config/database.js');
const JWTService = require('../utils/jwt.js');

class Session {
  // Create new session
  static async create(walletAddress, token) {
    const tokenHash = JWTService.generateTokenHash(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      `INSERT INTO user_sessions (wallet_address, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [walletAddress, tokenHash, expiresAt]
    );

    return result.rows[0];
  }

  // Delete expired sessions
  static async cleanupExpired() {
    await pool.query(
      `DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP`
    );
  }
}

module.exports = { Session };
