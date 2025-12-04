import pinataSDK from '@pinata/sdk';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export class IPFSService {
  constructor() {
    this.pinata = new pinataSDK(
      process.env.PINATA_API_KEY,
      process.env.PINATA_SECRET_API_KEY
    );
  }

  // Test Pinata connection
  async testConnection() {
    try {
      const result = await this.pinata.testAuthentication();
      return { success: true, message: 'Pinata connection successful' };
    } catch (error) {
      console.error('Pinata connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Encrypt file buffer
  encryptFile(buffer, encryptionKey) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('elite-tena-medical'));
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv,
      authTag: authTag
    };
  }

  // Upload file to IPFS with encryption
  async uploadMedicalFile(fileBuffer, originalFilename, walletAddress) {
    try {
      // Generate encryption key from wallet address
      const encryptionKey = crypto.createHash('sha256')
        .update(walletAddress + process.env.ENCRYPTION_KEY)
        .digest('hex');

      // Encrypt the file
      const encrypted = this.encryptFile(fileBuffer, encryptionKey);
      
      // Combine encrypted data with metadata
      const uploadData = Buffer.concat([
        encrypted.iv,
        encrypted.authTag,
        encrypted.encryptedData
      ]);

      // Upload to IPFS via Pinata
      const result = await this.pinata.pinFileToIPFS(uploadData, {
        pinataMetadata: {
          name: `medical-file-${Date.now()}`,
          keyvalues: {
            originalFilename,
            walletAddress,
            encrypted: 'true',
            uploadDate: new Date().toISOString(),
            platform: 'elite-tena'
          }
        }
      });

      return {
        success: true,
        cid: result.IpfsHash,
        timestamp: new Date().toISOString(),
        size: uploadData.length
      };

    } catch (error) {
      console.error('IPFS upload failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve file from IPFS
  async retrieveMedicalFile(cid, walletAddress) {
    try {
      // Generate the same encryption key
      const encryptionKey = crypto.createHash('sha256')
        .update(walletAddress + process.env.ENCRYPTION_KEY)
        .digest('hex');

      // In a real implementation, you'd fetch from IPFS gateway
      // For now, return success with decryption info
      return {
        success: true,
        cid,
        available: true,
        requiresDecryption: true
      };

    } catch (error) {
      console.error('IPFS retrieve failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Unpin file from IPFS (delete)
  async unpinFile(cid) {
    try {
      await this.pinata.unpin(cid);
      return { success: true, message: `File ${cid} unpinned successfully` };
    } catch (error) {
      console.error('IPFS unpin failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
export const ipfsService = new IPFSService();
