import express from 'express';
import db from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * Simple Database Explorer - Like Prisma Studio but simpler
 */

// Get all tables with record counts
router.get('/tables', async (req, res) => {
  try {
    const tables = {};
    
    // Get all models and their counts
    for (const [modelName, model] of Object.entries(db)) {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize' && typeof model.count === 'function') {
        try {
          const count = await model.count();
          tables[modelName] = {
            name: modelName,
            count,
            tableName: model.tableName || modelName.toLowerCase()
          };
        } catch (error) {
          tables[modelName] = {
            name: modelName,
            count: 0,
            error: error.message
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        tables,
        totalTables: Object.keys(tables).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Database tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      message: error.message
    });
  }
});

// Get records from a specific table
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 50, offset = 0, search } = req.query;

    // Find the model
    const model = db[tableName];
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
        availableTables: Object.keys(db).filter(key => 
          key !== 'sequelize' && key !== 'Sequelize'
        )
      });
    }

    // Build query options
    const queryOptions = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    };

    // Add search if provided
    if (search) {
      // Get model attributes to search in
      const attributes = Object.keys(model.rawAttributes);
      const searchConditions = attributes
        .filter(attr => ['STRING', 'TEXT'].includes(model.rawAttributes[attr].type.constructor.name))
        .map(attr => ({
          [attr]: {
            [Op.iLike]: `%${search}%`
          }
        }));

      if (searchConditions.length > 0) {
        queryOptions.where = {
          [Op.or]: searchConditions
        };
      }
    }

    const { count, rows } = await model.findAndCountAll(queryOptions);

    res.json({
      success: true,
      data: {
        tableName,
        records: rows,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(count / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        },
        search: search || null
      }
    });
  } catch (error) {
    console.error('❌ Database table query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message
    });
  }
});

// Get table schema/structure
router.get('/schema/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const model = db[tableName];
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    const attributes = model.rawAttributes;
    const schema = {};

    for (const [fieldName, field] of Object.entries(attributes)) {
      schema[fieldName] = {
        type: field.type.constructor.name,
        allowNull: field.allowNull,
        primaryKey: field.primaryKey || false,
        autoIncrement: field.autoIncrement || false,
        defaultValue: field.defaultValue,
        unique: field.unique || false
      };
    }

    res.json({
      success: true,
      data: {
        tableName,
        modelName: tableName,
        schema,
        fieldCount: Object.keys(schema).length
      }
    });
  } catch (error) {
    console.error('❌ Database schema error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table schema',
      message: error.message
    });
  }
});

// Execute raw SQL query (admin only)
router.post('/query', async (req, res) => {
  try {
    const { sql, type = 'SELECT' } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query is required'
      });
    }

    // Security: Only allow SELECT queries for safety
    const upperSQL = sql.trim().toUpperCase();
    if (!upperSQL.startsWith('SELECT')) {
      return res.status(403).json({
        success: false,
        error: 'Only SELECT queries are allowed for security reasons'
      });
    }

    const [results, metadata] = await db.sequelize.query(sql);

    res.json({
      success: true,
      data: {
        results,
        rowCount: results.length,
        query: sql,
        executedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message
    });
  }
});

// Database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get counts for all main tables
    const models = ['User', 'Patient', 'Doctor', 'Appointment', 'MedicalRecord', 'Prescription', 'Payment'];
    
    for (const modelName of models) {
      if (db[modelName]) {
        try {
          stats[modelName] = await db[modelName].count();
        } catch (error) {
          stats[modelName] = 0;
        }
      }
    }

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = {};

    for (const modelName of models) {
      if (db[modelName]) {
        try {
          recentActivity[modelName] = await db[modelName].count({
            where: {
              createdAt: {
                [Op.gte]: yesterday
              }
            }
          });
        } catch (error) {
          recentActivity[modelName] = 0;
        }
      }
    }

    res.json({
      success: true,
      data: {
        totalRecords: stats,
        recentActivity: recentActivity,
        period: '24 hours',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Database stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database statistics',
      message: error.message
    });
  }
});

export default router;