import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export class IPFSService {
  private useJWT: boolean;

  constructor() {
    this.useJWT = !!PINATA_JWT;
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(file: File, metadata?: { name?: string; keyvalues?: Record<string, string> }) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      const pinataMetadata = {
        name: metadata?.name || file.name,
        keyvalues: metadata?.keyvalues || {},
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      // Add options
      const pinataOptions = {
        cidVersion: 1,
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      // Upload to Pinata
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: this.useJWT
            ? {
                Authorization: `Bearer ${PINATA_JWT}`,
              }
            : {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_KEY,
              },
          maxBodyLength: Infinity,
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const ipfsUrl = `${PINATA_GATEWAY}${ipfsHash}`;

      return {
        success: true,
        ipfsHash,
        ipfsUrl,
        size: file.size,
        timestamp: response.data.Timestamp,
      };
    } catch (error: any) {
      console.error('Error uploading to IPFS:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJSON(data: any, name?: string) {
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: data,
          pinataMetadata: {
            name: name || 'healthcare-data.json',
          },
          pinataOptions: {
            cidVersion: 1,
          },
        },
        {
          headers: this.useJWT
            ? {
                Authorization: `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json',
              }
            : {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_KEY,
                'Content-Type': 'application/json',
              },
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const ipfsUrl = `${PINATA_GATEWAY}${ipfsHash}`;

      return {
        success: true,
        ipfsHash,
        ipfsUrl,
        timestamp: response.data.Timestamp,
      };
    } catch (error: any) {
      console.error('Error uploading JSON to IPFS:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Retrieve file from IPFS
   */
  async getFile(ipfsHash: string) {
    try {
      const url = `${PINATA_GATEWAY}${ipfsHash}`;
      const response = await axios.get(url);
      return {
        success: true,
        data: response.data,
        url,
      };
    } catch (error: any) {
      console.error('Error retrieving from IPFS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get IPFS URL for a hash
   */
  getIPFSUrl(ipfsHash: string): string {
    return `${PINATA_GATEWAY}${ipfsHash}`;
  }

  /**
   * Unpin file from Pinata (optional - for cleanup)
   */
  async unpinFile(ipfsHash: string) {
    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
        headers: this.useJWT
          ? {
              Authorization: `Bearer ${PINATA_JWT}`,
            }
          : {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error unpinning from IPFS:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
