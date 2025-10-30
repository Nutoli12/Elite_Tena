import pool from '../config/database.js';

export class FileMetadata {
  // Store file metadata after IPFS upload
  static async create(cid, walletAddress, originalFilename, fileSize, fileType, description = null, encryptedMetadata = null) {
    const result = await pool.query(
      `INSERT INTO file_metadata 
       (cid, wallet_address, original_filename, file_size, file_type, description, encrypted_metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [cid, walletAddress, originalFilename, fileSize, fileType, description, encryptedMetadata]
    );
    return result.rows[0];
  }

  // Get files by wallet address
  static async findByWallet(walletAddress) {
    const result = await pool.query(
      `SELECT * FROM file_metadata 
       WHERE wallet_address = $1 
       ORDER BY uploaded_at DESC`,
      [walletAddress]
    );
    return result.rows;
  }

  // Get file by CID
  static async findByCid(cid) {
    const result = await pool.query(
      'SELECT * FROM file_metadata WHERE cid = $1',
      [cid]
    );
    return result.rows[0];
  }

  // Delete file metadata
  static async delete(cid, walletAddress) {
    const result = await pool.query(
      'DELETE FROM file_metadata WHERE cid = $1 AND wallet_address = $2 RETURNING *',
      [cid, walletAddress]
    );
    return result.rows[0];
  }
}
