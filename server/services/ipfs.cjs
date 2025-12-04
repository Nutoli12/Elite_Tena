const pinataSDK = require('@pinata/sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * IPFS Service - Handles encrypted file storage on IPFS via Pinata
 * Integrates with blockchain and database for complete data management
 */
class IPFSService {
  constructor() {
    this.pinata = null;
    this.initialized = false;
    
    // Encryption settings
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
  }

  /**
   * Initialize Pinata connection
   * Supports both JWT and API Key/Secret authentication
   */
  async initialize() {
    try {
      // Check for JWT first (recommended)
      const jwt = process.env.PINATA_JWT;
      
      if (jwt) {
        // Use JWT authentication
        this.pinata = new pinataSDK({ pinataJWTKey: jwt });
        console.log('🔐 Using Pinata JWT authentication');
      } else {
        // Fall back to API Key/Secret
        const apiKey = process.env.PINATA_API_KEY;
        const secretKey = process.env.PINATA_SECRET_KEY;

        if (!apiKey || !secretKey) {
          console.warn('⚠️ IPFS Service: Pinata credentials not found in .env');
          console.warn('   Add PINATA_JWT or (PINATA_API_KEY + PINATA_SECRET_KEY) to enable IPFS');
          return false;
        }

        this.pinata = new pinataSDK(apiKey, secretKey);
        console.log('🔑 Using Pinata API Key authentication');
      }
      
      // Test connection
      await this.pinata.testAuthentication();
      
      this.initialized = true;
      console.log('✅ IPFS Service initialized (Pinata)');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IPFS service:', error.message);
      return false;
    }
  }

  /**
   * Generate encryption key from patient and doctor wallets
   */
  generateEncryptionKey(patientWallet, doctorWallet, salt) {
    const keyMaterial = `${patientWallet.toLowerCase()}_${doctorWallet.toLowerCase()}_${process.env.ENCRYPTION_SECRET || 'default-secret'}`;
    return crypto.pbkdf2Sync(keyMaterial, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt file buffer
   */
  encryptFile(fileBuffer, patientWallet, doctorWallet) {
    try {
      // Generate salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive encryption key
      const key = this.generateEncryptionKey(patientWallet, doctorWallet, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      
      // Get auth tag
      const tag = cipher.getAuthTag();
      
      // Combine: salt + iv + tag + encrypted data
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      
      return {
        encryptedBuffer: result,
        metadata: {
          algorithm: this.algorithm,
          saltLength: this.saltLength,
          ivLength: this.ivLength,
          tagLength: this.tagLength
        }
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file buffer
   */
  decryptFile(encryptedBuffer, patientWallet, doctorWallet) {
    try {
      // Extract components
      let offset = 0;
      const salt = encryptedBuffer.slice(offset, offset + this.saltLength);
      offset += this.saltLength;
      
      const iv = encryptedBuffer.slice(offset, offset + this.ivLength);
      offset += this.ivLength;
      
      const tag = encryptedBuffer.slice(offset, offset + this.tagLength);
      offset += this.tagLength;
      
      const encrypted = encryptedBuffer.slice(offset);
      
      // Derive decryption key
      const key = this.generateEncryptionKey(patientWallet, doctorWallet, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt file - invalid credentials or corrupted data');
    }
  }

  /**
   * Upload encrypted medical file to IPFS
   */
  async uploadMedicalFile(fileBuffer, patientWallet, doctorWallet, metadata = {}) {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      console.log('📤 Uploading file to IPFS...');
      console.log('   Patient:', patientWallet);
      console.log('   Doctor:', doctorWallet);
      console.log('   Size:', fileBuffer.length, 'bytes');

      // 1. Encrypt file
      const { encryptedBuffer, metadata: encryptionMetadata } = this.encryptFile(
        fileBuffer,
        patientWallet,
        doctorWallet
      );

      // 2. Create readable stream from buffer
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(encryptedBuffer);

      // 3. Prepare metadata
      const pinataMetadata = {
        name: metadata.filename || `medical-file-${Date.now()}`,
        keyvalues: {
          patient: patientWallet.toLowerCase(),
          doctor: doctorWallet.toLowerCase(),
          fileType: metadata.fileType || 'application/octet-stream',
          originalSize: fileBuffer.length.toString(),
          encryptedSize: encryptedBuffer.length.toString(),
          uploadDate: new Date().toISOString(),
          recordType: metadata.recordType || 'medical_record',
          encrypted: 'true'
        }
      };

      const pinataOptions = {
        pinataMetadata,
        pinataOptions: {
          cidVersion: 1
        }
      };

      // 4. Upload to IPFS via Pinata
      const result = await this.pinata.pinFileToIPFS(bufferStream, pinataOptions);

      console.log('✅ File uploaded to IPFS');
      console.log('   CID:', result.IpfsHash);
      console.log('   Size:', result.PinSize, 'bytes');

      return {
        cid: result.IpfsHash,
        size: result.PinSize,
        timestamp: result.Timestamp,
        encryptionMetadata,
        metadata: pinataMetadata.keyvalues
      };
    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt medical file from IPFS
   */
  async retrieveMedicalFile(cid, patientWallet, doctorWallet) {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      console.log('📥 Retrieving file from IPFS...');
      console.log('   CID:', cid);

      // 1. Download from IPFS via Pinata gateway
      const axios = require('axios');
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const encryptedBuffer = Buffer.from(response.data);

      console.log('   Downloaded:', encryptedBuffer.length, 'bytes');

      // 2. Decrypt file
      const decryptedBuffer = this.decryptFile(
        encryptedBuffer,
        patientWallet,
        doctorWallet
      );

      console.log('✅ File retrieved and decrypted');
      console.log('   Decrypted size:', decryptedBuffer.length, 'bytes');

      return decryptedBuffer;
    } catch (error) {
      console.error('❌ IPFS retrieval failed:', error);
      throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
    }
  }

  /**
   * Get file metadata from Pinata
   */
  async getFileMetadata(cid) {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      const filters = {
        ipfs_pin_hash: cid
      };

      const result = await this.pinata.pinList(filters);
      
      if (result.rows.length === 0) {
        throw new Error('File not found on IPFS');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Unpin file from IPFS (delete)
   */
  async unpinFile(cid) {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      await this.pinata.unpin(cid);
      console.log('✅ File unpinned from IPFS:', cid);
      return true;
    } catch (error) {
      console.error('Failed to unpin file:', error);
      throw error;
    }
  }

  /**
   * Pin existing file (ensure it stays on IPFS)
   */
  async pinFile(cid) {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      await this.pinata.pinByHash(cid);
      console.log('✅ File pinned on IPFS:', cid);
      return true;
    } catch (error) {
      console.error('Failed to pin file:', error);
      throw error;
    }
  }

  /**
   * Get total pinned storage usage
   */
  async getStorageUsage() {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized');
    }

    try {
      const result = await this.pinata.pinList({
        status: 'pinned',
        pageLimit: 1000
      });

      const totalSize = result.rows.reduce((sum, pin) => sum + pin.size, 0);
      const totalFiles = result.count;

      return {
        totalFiles,
        totalSize,
        totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      throw error;
    }
  }

  /**
   * Test IPFS connection
   */
  async testConnection() {
    if (!this.initialized) {
      return { success: false, message: 'IPFS service not initialized' };
    }

    try {
      await this.pinata.testAuthentication();
      return { success: true, message: 'IPFS connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate IPFS gateway URL
   */
  getGatewayUrl(cid) {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  /**
   * Verify file integrity
   */
  async verifyFileIntegrity(cid, expectedSize) {
    try {
      const metadata = await this.getFileMetadata(cid);
      return metadata.size === expectedSize;
    } catch (error) {
      console.error('Failed to verify file integrity:', error);
      return false;
    }
  }
}

// Export singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService;
