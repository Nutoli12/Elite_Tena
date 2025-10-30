import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Database imports
import { testConnection, initializeDatabase } from './config/database.js';
import { attachDatabase, databaseHealthCheck } from './middleware/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database middleware
app.use(attachDatabase);

// Enhanced health check endpoint
app.get('/health', databaseHealthCheck, async (req, res) => {
  const dbStatus = await req.db.testConnection();
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Elite-Tena Backend API',
    version: '1.0.0',
    database: dbStatus.healthy ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

// Database admin endpoint
app.get('/admin/database/status', databaseHealthCheck, async (req, res) => {
  try {
    const client = await req.db.pool.connect();
    
    // Get database statistics
    const tables = await client.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const filesCount = await client.query('SELECT COUNT(*) FROM file_metadata');
    const appointmentsCount = await client.query('SELECT COUNT(*) FROM appointments');
    
    client.release();
    
    res.json({
      status: 'healthy',
      tables: tables.rows.length,
      statistics: {
        users: parseInt(usersCount.rows[0].count),
        files: parseInt(filesCount.rows[0].count),
        appointments: parseInt(appointmentsCount.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// API routes will be added here
app.use('/api/auth', (req, res) => {
  res.json({ message: 'Auth endpoints coming soon' });
});

app.use('/api/upload', (req, res) => {
  res.json({ message: 'Upload endpoints coming soon' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('‚ùå Cannot start server without database connection');
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`
      Ìø• Elite-Tena Backend Server Started!
      Ì≥° Port: ${PORT}
      Ìºê Environment: ${process.env.NODE_ENV}
      Ì∑ÑÔ∏è  Database: Connected
      Ìµí Time: ${new Date().toISOString()}
      Ì¥ó CORS: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}
      `);
    });
  } catch (error) {
    console.error('‚ùå Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
