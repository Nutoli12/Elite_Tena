import express from 'express';

const router = express.Router();

/**
 * Get blockchain sync status
 */
router.get('/status', async (req, res) => {
  try {
    const { default: blockchainSyncService } = await import('../../services/blockchain-sync.service.js');
    const status = await blockchainSyncService.getSyncStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        syncEnabled: !!process.env.PRIVATE_KEY,
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * Trigger manual sync (for testing)
 */
router.post('/trigger', async (req, res) => {
  try {
    const { default: blockchainSyncService } = await import('../../services/blockchain-sync.service.js');
    
    // Trigger sync in background
    blockchainSyncService.triggerManualSync().catch(error => {
      console.error('Manual sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Blockchain sync triggered',
      note: 'Sync is running in background. Check status endpoint for progress.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync',
      message: error.message
    });
  }
});

/**
 * Get detailed sync information for a specific record
 */
router.get('/record/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { default: db } = await import('../models/index.js');
    const { MedicalRecord } = db;
    
    const record = await MedicalRecord.findByPk(id, {
      attributes: [
        'id', 'title', 'onBlockchain', 'blockchainTxHash', 'blockNumber', 
        'gasUsed', 'syncedToBlockchain', 'syncedAt', 'syncRetryCount', 
        'lastSyncAttempt', 'createdAt'
      ]
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
    
    const syncInfo = {
      recordId: record.id,
      title: record.title,
      createdAt: record.createdAt,
      blockchain: {
        onBlockchain: record.onBlockchain,
        transactionHash: record.blockchainTxHash,
        blockNumber: record.blockNumber,
        gasUsed: record.gasUsed,
        isDemo: record.blockchainTxHash?.startsWith('0xDEMO'),
        isReal: record.blockchainTxHash && !record.blockchainTxHash.startsWith('0xDEMO')
      },
      sync: {
        syncedToBlockchain: record.syncedToBlockchain,
        syncedAt: record.syncedAt,
        retryCount: record.syncRetryCount || 0,
        lastAttempt: record.lastSyncAttempt,
        status: record.syncedToBlockchain ? 'synced' : 
                record.blockchainTxHash?.startsWith('0xDEMO') ? 'pending' : 'not_applicable'
      }
    };
    
    res.json({
      success: true,
      data: syncInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get record sync info',
      message: error.message
    });
  }
});

export default router;