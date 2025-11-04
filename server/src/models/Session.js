const pool = require('../config/database.js');
const JWTService = require('../utils/jwt.js');

class Session {
  // Create new session
  static async create(walletAddress, token) {
    const tokenHash = JWTService.generateTokenHash(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      'INSERT INTO user_sessions (wallet_address, token_hash, expires_at) VALUES (, , ) RETURNING *',
      [walletAddress, tokenHash, expiresAt]
    );
    return result.rows[0];
  }

  // Find active session by token
  static async findByToken(token) {
    const tokenHash = JWTService.generateTokenHash(token);
    
    const result = await pool.query(
      'SELECT * FROM user_sessions WHERE token_hash =  AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1',
      [tokenHash]
    );
    return result.rows[0];
  }

  // Validate token (alias for findByToken for compatibility)
  static async validate(token) {
    return this.findByToken(token);
  }

  // Find active sessions by wallet address
  static async findByWalletAddress(walletAddress) {
    const result = await pool.query(
      'SELECT * FROM user_sessions WHERE wallet_address =  AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC',
      [walletAddress]
    );
    return result.rows;
  }

  // Invalidate session (logout)
  static async invalidate(token) {
    const tokenHash = JWTService.generateTokenHash(token);
    
    const result = await pool.query(
      'UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE token_hash =  AND expires_at > CURRENT_TIMESTAMP RETURNING *',
      [tokenHash]
    );
    return result.rows[0];
  }

  // Invalidate all sessions for a wallet address
  static async invalidateAll(walletAddress) {
    const result = await pool.query(
      'UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE wallet_address =  AND expires_at > CURRENT_TIMESTAMP RETURNING *',
      [walletAddress]
    );
    return result.rows;
  }

  // Clean up expired sessions
  static async cleanupExpired() {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP RETURNING *'
    );
    return result.rows;
  }
}

module.exports = { Session };
