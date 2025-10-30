import pool from '../config/database.js';

// Middleware to check database connection
export const databaseHealthCheck = async (req, res, next) => {
  try {
    const client = await pool.connect();
    client.release();
    next();
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      error: 'Database unavailable',
      message: 'Please try again later'
    });
  }
};

// Middleware to attach database models to request
export const attachDatabase = (req, res, next) => {
  req.db = {
    pool,
    testConnection: async () => {
      try {
        const client = await pool.connect();
        client.release();
        return { healthy: true };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    }
  };
  next();
};
