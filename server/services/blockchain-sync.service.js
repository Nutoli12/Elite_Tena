/**
 * Blockchain Sync Service
 * Uploads demo records to real blockchain in the background
 */

import cron from 'node-cron';
import db from '../src/models/index.js';
const { MedicalRecord, Consent } = db;

class BlockchainSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = '*/5 * * * *'; // Every 5 minutes
    this.maxRetries = 3;
  }

  /**
   * Start the background sync service
   */
  start() {
    console.log('🔄 Starting Blockchain Sync Service...');
    
    // Run every 5 minutes
    cron.schedule(this.syncInterval, async () => {
      if (!this.isRunning) {
        await this.syncPendingRecords();
      }
    });

    // Also run once on startup
    setTimeout(() => this.syncPendingRecords(), 10000); // Wait 10 seconds after startup
    
    console.log('✅ Blockchain Sync Service started');
  }

  /**
   * Sync pending demo records to real blockchain
   */
  async syncPendingRecords() {
    this.isRunning = true;
    
    try {
      console.log('🔍 Checking for demo records to sync to blockchain...');
      
      // Find records with demo blockchain data
      const demoRecords = await MedicalRecord.findAll({
        where: {
          onBlockchain: true,
          blockchainTxHash: {
            [db.Sequelize.Op.like]: '0xDEMO%'
          }
        },
        limit: 5 // Process 5 at a time
      });

      if (demoRecords.length === 0) {
        console.log('✅ No demo records to sync');
        return;
      }

      console.log(`📤 Found ${demoRecords.length} demo records to sync to real blockchain`);

      // Import blockchain service
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const blockchainService = require('./blockchain.cjs');

      // Initialize blockchain service
      const initialized = await blockchainService.initialize();
      if (!initialized) {
        console.log('⚠️ Blockchain service not available - skipping sync');
        return;
      }

      // Check if we have ETH for gas
      if (!process.env.PRIVATE_KEY) {
        console.log('⚠️ No private key configured - skipping real blockchain sync');
        return;
      }

      for (const record of demoRecords) {
        await this.syncRecordToBlockchain(record, blockchainService);
      }

    } catch (error) {
      console.error('❌ Blockchain sync error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync individual record to blockchain
   */
  async syncRecordToBlockchain(record, blockchainService) {
    try {
      console.log(`🔗 Syncing record ${record.id} to real blockchain...`);

      // Check if we have consent
      const hasConsent = await blockchainService.checkActiveConsent(
        record.patientWalletAddress,
        record.doctorWalletAddress,
        blockchainService.ConsentType.MedicalRecords
      );

      if (!hasConsent) {
        console.log(`⚠️ No blockchain consent for record ${record.id} - skipping`);
        return;
      }

      // Store on real blockchain
      const blockchainResult = await blockchainService.storeMedicalRecord(
        record.patientWalletAddress,
        record.doctorWalletAddress,
        record.ipfsHash || 'QmDefaultHash' // Use existing or default IPFS hash
      );

      if (blockchainResult.success) {
        // Update record with real blockchain data
        await record.update({
          blockchainTxHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          gasUsed: blockchainResult.gasUsed,
          syncedToBlockchain: true,
          syncedAt: new Date()
        });

        console.log(`✅ Record ${record.id} synced to blockchain: ${blockchainResult.transactionHash}`);
        
        // Create notification for patient
        await this.createSyncNotification(record, blockchainResult);

      } else {
        console.log(`❌ Failed to sync record ${record.id}: ${blockchainResult.error}`);
        
        // Increment retry count
        const retryCount = (record.syncRetryCount || 0) + 1;
        await record.update({ 
          syncRetryCount: retryCount,
          lastSyncAttempt: new Date()
        });

        if (retryCount >= this.maxRetries) {
          console.log(`⚠️ Max retries reached for record ${record.id}`);
        }
      }

    } catch (error) {
      console.error(`❌ Error syncing record ${record.id}:`, error.message);
    }
  }

  /**
   * Create notification when record is synced to blockchain
   */
  async createSyncNotification(record, blockchainResult) {
    try {
      const { Notification } = db;
      
      await Notification.create({
        userId: record.patientWalletAddress,
        type: 'blockchain_sync_complete',
        title: '🔗 Record Now on Blockchain',
        message: `Your medical record "${record.title}" has been uploaded to the blockchain. You can now verify it with real blockchain proof!`,
        priority: 'medium',
        relatedId: record.id,
        metadata: {
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${blockchainResult.transactionHash}`
        }
      });

      console.log(`📧 Sync notification created for record ${record.id}`);
    } catch (error) {
      console.error('❌ Failed to create sync notification:', error.message);
    }
  }

  /**
   * Get sync status for records
   */
  async getSyncStatus() {
    try {
      const stats = await MedicalRecord.findAll({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "blockchainTxHash" LIKE \'0xDEMO%\' THEN 1 ELSE 0 END')), 'demo'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "blockchainTxHash" NOT LIKE \'0xDEMO%\' AND "onBlockchain" = true THEN 1 ELSE 0 END')), 'real'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "onBlockchain" = false THEN 1 ELSE 0 END')), 'web2only']
        ],
        raw: true
      });

      return {
        total: parseInt(stats[0].total) || 0,
        demo: parseInt(stats[0].demo) || 0,
        real: parseInt(stats[0].real) || 0,
        web2only: parseInt(stats[0].web2only) || 0
      };
    } catch (error) {
      console.error('❌ Error getting sync status:', error.message);
      return { total: 0, demo: 0, real: 0, web2only: 0 };
    }
  }

  /**
   * Manual sync trigger (for testing)
   */
  async triggerManualSync() {
    console.log('🔄 Manual blockchain sync triggered');
    await this.syncPendingRecords();
  }
}

// Export singleton
const blockchainSyncService = new BlockchainSyncService();
export default blockchainSyncService;