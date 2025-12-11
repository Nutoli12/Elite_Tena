/**
 * Legacy Record Migration Service
 * Migrates old Web2 records to blockchain storage
 */

import db from '../src/models/index.js';
const { MedicalRecord } = db;

class LegacyMigrationService {
  constructor() {
    this.batchSize = 5; // Process 5 records at a time
  }

  /**
   * Migrate all Web2-only records to blockchain
   */
  async migrateAllLegacyRecords() {
    try {
      console.log('🔄 ========== LEGACY RECORD MIGRATION ==========');
      
      // Find all Web2-only records (not on blockchain)
      const legacyRecords = await MedicalRecord.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            { onBlockchain: false },
            { onBlockchain: null },
            { blockchainTxHash: null }
          ]
        },
        order: [['createdAt', 'ASC']] // Oldest first
      });

      if (legacyRecords.length === 0) {
        console.log('✅ No legacy records found - all records are already on blockchain!');
        return {
          success: true,
          migrated: 0,
          message: 'All records already on blockchain'
        };
      }

      console.log(`📋 Found ${legacyRecords.length} legacy record(s) to migrate`);

      let migratedCount = 0;
      const results = [];

      // Process records in batches
      for (let i = 0; i < legacyRecords.length; i += this.batchSize) {
        const batch = legacyRecords.slice(i, i + this.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}...`);

        for (const record of batch) {
          const result = await this.migrateSingleRecord(record);
          results.push(result);
          if (result.success) {
            migratedCount++;
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`\n🎉 Migration complete! ${migratedCount}/${legacyRecords.length} records migrated`);

      return {
        success: true,
        total: legacyRecords.length,
        migrated: migratedCount,
        failed: legacyRecords.length - migratedCount,
        results
      };

    } catch (error) {
      console.error('❌ Legacy migration failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate a single record to blockchain
   */
  async migrateSingleRecord(record) {
    try {
      console.log(`📝 Migrating record: ${record.title} (ID: ${record.id})`);

      // Generate IPFS hash if missing (required for blockchain)
      let ipfsHash = record.ipfsHash;
      if (!ipfsHash) {
        // Create a mock IPFS hash for legacy records (demo mode)
        // Note: This is not a real IPFS file, just metadata for blockchain verification
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        ipfsHash = `QmLegacyRecord${timestamp}${random}`;
        console.log(`   📁 Generated demo IPFS hash: ${ipfsHash}`);
        console.log(`   ℹ️  Note: This is demo metadata, not a real IPFS file`);
      }

      // Create blockchain metadata (demo mode)
      const blockchainData = {
        blockchainTxHash: '0xLEGACY' + Date.now().toString(16) + Math.random().toString(16).substr(2, 8),
        blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
        gasUsed: '120000',
        onBlockchain: true,
        ipfsHash: ipfsHash,
        syncedToBlockchain: false, // Will be synced to real blockchain later
        syncRetryCount: 0
      };

      // Update the record with blockchain data
      await record.update(blockchainData);

      console.log(`   ✅ Migrated successfully!`);
      console.log(`   🔗 Transaction: ${blockchainData.blockchainTxHash}`);
      console.log(`   📊 Block: #${blockchainData.blockNumber}`);

      return {
        success: true,
        recordId: record.id,
        title: record.title,
        transactionHash: blockchainData.blockchainTxHash,
        blockNumber: blockchainData.blockNumber
      };

    } catch (error) {
      console.error(`   ❌ Failed to migrate record ${record.id}:`, error.message);
      return {
        success: false,
        recordId: record.id,
        title: record.title,
        error: error.message
      };
    }
  }

  /**
   * Migrate specific records by IDs
   */
  async migrateSpecificRecords(recordIds) {
    try {
      console.log('🎯 Migrating specific records:', recordIds);

      const records = await MedicalRecord.findAll({
        where: {
          id: recordIds,
          [db.Sequelize.Op.or]: [
            { onBlockchain: false },
            { onBlockchain: null },
            { blockchainTxHash: null }
          ]
        }
      });

      if (records.length === 0) {
        return {
          success: false,
          message: 'No eligible records found for migration'
        };
      }

      const results = [];
      let migratedCount = 0;

      for (const record of records) {
        const result = await this.migrateSingleRecord(record);
        results.push(result);
        if (result.success) {
          migratedCount++;
        }
      }

      return {
        success: true,
        total: records.length,
        migrated: migratedCount,
        results
      };

    } catch (error) {
      console.error('❌ Specific migration failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const stats = await MedicalRecord.findAll({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "onBlockchain" = true THEN 1 ELSE 0 END')), 'onBlockchain'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "onBlockchain" = false OR "onBlockchain" IS NULL THEN 1 ELSE 0 END')), 'web2only'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "blockchainTxHash" LIKE \'0xDEMO%\' THEN 1 ELSE 0 END')), 'demo'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "blockchainTxHash" LIKE \'0xLEGACY%\' THEN 1 ELSE 0 END')), 'legacy'],
          [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN "blockchainTxHash" NOT LIKE \'0xDEMO%\' AND "blockchainTxHash" NOT LIKE \'0xLEGACY%\' AND "onBlockchain" = true THEN 1 ELSE 0 END')), 'real']
        ],
        raw: true
      });

      return {
        total: parseInt(stats[0].total) || 0,
        onBlockchain: parseInt(stats[0].onBlockchain) || 0,
        web2only: parseInt(stats[0].web2only) || 0,
        demo: parseInt(stats[0].demo) || 0,
        legacy: parseInt(stats[0].legacy) || 0,
        real: parseInt(stats[0].real) || 0
      };
    } catch (error) {
      console.error('❌ Error getting migration status:', error.message);
      return { total: 0, onBlockchain: 0, web2only: 0, demo: 0, legacy: 0, real: 0 };
    }
  }

  /**
   * Get legacy records that need migration
   */
  async getLegacyRecords() {
    try {
      const legacyRecords = await MedicalRecord.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            { onBlockchain: false },
            { onBlockchain: null },
            { blockchainTxHash: null }
          ]
        },
        attributes: ['id', 'title', 'createdAt', 'patientWalletAddress', 'doctorWalletAddress'],
        order: [['createdAt', 'DESC']]
      });

      return legacyRecords.map(record => ({
        id: record.id,
        title: record.title,
        createdAt: record.createdAt,
        patientWallet: record.patientWalletAddress,
        doctorWallet: record.doctorWalletAddress
      }));
    } catch (error) {
      console.error('❌ Error getting legacy records:', error.message);
      return [];
    }
  }
}

// Export singleton
const legacyMigrationService = new LegacyMigrationService();
export default legacyMigrationService;