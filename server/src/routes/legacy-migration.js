import express from 'express';

const router = express.Router();

/**
 * Get migration status
 */
router.get('/status', async (req, res) => {
  try {
    const { default: legacyMigrationService } = await import('../../services/legacy-migration.service.js');
    const status = await legacyMigrationService.getMigrationStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        migrationAvailable: status.web2only > 0,
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
      message: error.message
    });
  }
});

/**
 * Get legacy records that need migration
 */
router.get('/records', async (req, res) => {
  try {
    const { default: legacyMigrationService } = await import('../../services/legacy-migration.service.js');
    const records = await legacyMigrationService.getLegacyRecords();
    
    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get legacy records',
      message: error.message
    });
  }
});

/**
 * Migrate all legacy records
 */
router.post('/migrate-all', async (req, res) => {
  try {
    const { default: legacyMigrationService } = await import('../../services/legacy-migration.service.js');
    
    // Run migration in background
    legacyMigrationService.migrateAllLegacyRecords().then(result => {
      console.log('Migration completed:', result);
    }).catch(error => {
      console.error('Migration failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Legacy record migration started',
      note: 'Migration is running in background. Check status endpoint for progress.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start migration',
      message: error.message
    });
  }
});

/**
 * Migrate specific records
 */
router.post('/migrate-specific', async (req, res) => {
  try {
    const { recordIds } = req.body;
    
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'recordIds array is required'
      });
    }

    const { default: legacyMigrationService } = await import('../../services/legacy-migration.service.js');
    const result = await legacyMigrationService.migrateSpecificRecords(recordIds);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success 
        ? `Successfully migrated ${result.migrated}/${result.total} records`
        : result.message || 'Migration failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to migrate specific records',
      message: error.message
    });
  }
});

export default router;