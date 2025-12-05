import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';

// AdminJS imports
import { admin, adminRouter } from './admin.js';

// Route imports - ADDED NEW ROUTES
import healthRouter from './routes/health.js';
import authRoutes from './routes/auth.js';
import consentRoutes from './routes/consent.js';
import patientRoutes from './routes/patients.js';
import doctorRoutes from './routes/doctors.js';
import medicalRecordRoutes from './routes/medicalRecords.js';
import labTechnicianRoutes from './routes/labTechnicians.js';
import pharmacistRoutes from './routes/pharmacists.js';
import adminRoutes from './routes/admin.js';
import prescriptionRoutes from './routes/prescriptions.js';
import labResultRoutes from './routes/labResults.js';
import appointmentRoutes from './routes/appointment.js';
import paymentRoutes from './routes/payment.js';
import fileUploadRoutes from './routes/fileUpload.js';
import notificationRoutes from './routes/notifications.js';
import premiumServiceRoutes from './routes/premiumService.js';
import consultationRoutes from './routes/consultation.js';
import { initializeSocket } from './services/socketService.js';

// Services (using require for CommonJS modules)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ipfsService = require('../services/ipfs.cjs');
const blockchainService = require('../services/blockchain.cjs');

// Database and configuration
import db from './models/index.js';
import { testConnection } from './config/database.js';

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3003;
const isProduction = process.env.NODE_ENV === 'production';
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

// Create Express app
const app = express();

// ========== MIDDLEWARE CONFIGURATION ==========

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for development
}));

// CORS configuration - Allow all origins in development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Wallet-Address'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight for 10 minutes
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ========== ADMINJS CONFIGURATION ==========
// AdminJS is configured in admin.js and imported above
// IMPORTANT: AdminJS must be mounted BEFORE body-parser middleware
app.use(admin.options.rootPath, adminRouter);

// Body parsing - MUST come after AdminJS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  name: 'elitetena.sid',
  secret: process.env.SESSION_SECRET || process.env.ADMIN_COOKIE_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  rolling: true
}));

// ========== ROUTES ==========

app.use('/health', healthRouter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/lab-technicians', labTechnicianRoutes);
app.use('/api/pharmacists', pharmacistRoutes);
app.use('/api/pharmacy', pharmacistRoutes); // Alias for pharmacists
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', fileUploadRoutes); // File upload routes (IPFS)
app.use('/api/notifications', notificationRoutes); // Notification routes
app.use('/api/premium-services', premiumServiceRoutes); // Premium service routes (peer-to-peer)
app.use('/api/consultations', consultationRoutes); // Consultation routes

// Enhanced health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();

    const userCount = await db.User.count().catch(() => 0);
    const appointmentCount = await db.Appointment.count().catch(() => 0);
    const fileCount = await db.FileMetadata.count().catch(() => 0);

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Elite-Tena Backend API',
      version: '1.0.0',
      database: dbStatus ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      statistics: {
        users: userCount,
        appointments: appointmentCount,
        files: fileCount
      },
      endpoints: {
        admin: `http://localhost:${PORT}/admin`,
        api: `http://localhost:${PORT}/api`,
        health: `http://localhost:${PORT}/health`
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    await db.sequelize.authenticate();

    const [userCount, appointmentCount, fileCount, sessionCount] = await Promise.all([
      db.User.count().catch(() => 0),
      db.Appointment.count().catch(() => 0),
      db.FileMetadata.count().catch(() => 0),
      db.Session?.count?.().catch(() => 0) || Promise.resolve(0)
    ]);

    res.json({
      status: 'connected',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
      statistics: {
        users: userCount,
        appointments: appointmentCount,
        files: fileCount,
        sessions: sessionCount
      },
      models: Object.keys(db).filter(key => !['sequelize', 'Sequelize'].includes(key)),
      connection: {
        host: db.sequelize.config.host,
        port: db.sequelize.config.port,
        database: db.sequelize.config.database,
        dialect: db.sequelize.config.dialect
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL'
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    adminPanel: `http://localhost:${PORT}/admin`,
    database: {
      models: Object.keys(db).filter(key => !['sequelize', 'Sequelize'].includes(key))
    }
  });
});

// 404 handler - UPDATED WITH NEW ENDPOINTS
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      // Health & Status
      'GET /api/health',
      'GET /api/db-status',
      'GET /api/test',

      // Authentication
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/profile',

      // Admin
      'GET /api/admin/stats',
      'GET /api/admin/analytics',
      'GET /api/admin/audit-logs',
      'GET /api/admin/users',
      'GET /api/admin/users/:walletAddress',
      'PATCH /api/admin/users/:walletAddress/status',
      'DELETE /api/admin/users/:walletAddress',

      // Consent
      'POST /api/consent/grant',
      'POST /api/consent/revoke',
      'GET /api/consent/:patientWallet',

      // Patients
      'GET /api/patients',
      'GET /api/patients/:walletAddress',

      // Doctors
      'GET /api/doctors',
      'GET /api/doctors/:walletAddress',

      // Appointments
      'GET /api/appointments',
      'GET /api/appointments/doctor/:doctorWallet',
      'GET /api/appointments/patient/:patientWallet',
      'GET /api/appointments/:id',
      'POST /api/appointments',
      'PUT /api/appointments/:id',
      'PATCH /api/appointments/:id/cancel',
      'DELETE /api/appointments/:id',

      // Medical Records
      'GET /api/medical-records/:patientWallet',
      'POST /api/medical-records',
      'POST /api/medical-records/:patientWallet',
      'PUT /api/medical-records/:id',
      'DELETE /api/medical-records/:id',

      // Prescriptions
      'GET /api/prescriptions',
      'GET /api/prescriptions/patient/:patientWallet',
      'GET /api/prescriptions/:id',
      'POST /api/prescriptions',
      'PUT /api/prescriptions/:id',
      'DELETE /api/prescriptions/:id',

      // Lab Results
      'GET /api/lab-results',
      'GET /api/lab-results/:id',
      'POST /api/lab-results',
      'PUT /api/lab-results/:id',
      'DELETE /api/lab-results/:id',

      // Lab Technicians
      'GET /api/lab-technicians',
      'POST /api/lab-technicians/upload-result',

      // Pharmacists
      'GET /api/pharmacists',
      'POST /api/pharmacists/dispense',

      // Payments
      'POST /api/payments/initialize',
      'GET /api/payments',
      'GET /api/payments/:id',
      'PATCH /api/payments/:id/status'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name && err.name.includes('Sequelize')) {
    return res.status(400).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== SERVER STARTUP ==========
const startServer = async () => {
  try {
    console.log('🚀 Starting Elite-Tena Backend Server...\n');

    console.log('1. Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('❌ Cannot start server without database connection');
    }
    console.log('✅ Database connection established');

    console.log('🔗 Initializing database associations...');
    if (typeof db.associate === 'function') {
      db.associate();
    }
    console.log('✅ Database associations initialized successfully');

    console.log('2. Syncing database models...');
    await db.sequelize.sync({
      force: false,
      alter: false  // Disabled to prevent PostgreSQL syntax errors with column type changes
    });
    console.log('✅ Database models synchronized');

    console.log('3. Checking admin user...');
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    if (adminWallet) {
      const [adminUser, created] = await db.User.findOrCreate({
        where: { walletAddress: adminWallet.toLowerCase() },
        defaults: {
          role: 'admin',
          email: process.env.ADMIN_EMAIL || 'admin@elitetena.com',
          isActive: true
        }
      });
      console.log(`✅ Admin user: ${adminUser.walletAddress} (${created ? 'created' : 'exists'})`);
    }

    console.log('4. Initializing services...');
    // Initialize IPFS service
    const ipfsReady = await ipfsService.initialize();
    if (ipfsReady) {
      console.log('✅ IPFS service initialized');
    } else {
      console.log('⚠️  IPFS service not available (check .env for Pinata credentials)');
    }

    // Initialize blockchain service (optional)
    if (process.env.CONTRACT_ADDRESS && process.env.BLOCKCHAIN_RPC_URL) {
      const blockchainReady = await blockchainService.initialize();
      if (blockchainReady) {
        blockchainService.setupEventListeners(db);
        console.log('✅ Blockchain service initialized');
      }
    } else {
      console.log('⚠️  Blockchain service not configured (optional)');
    }

    const server = app.listen(PORT, () => {
      console.log('\n🎉 Elite-Tena Backend Server Started Successfully!');
      console.log('📊 Server Information:');
      console.log(`   📍 Port: ${PORT}`);
      console.log(`   🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🗄️  Database: Connected`);
      console.log(`   👑 Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`   🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
      console.log(`   📈 DB Status: http://localhost:${PORT}/api/db-status`);
      console.log('\n✅ Backend is ready for frontend integration!');
    });

    // Initialize Socket.IO
    const io = initializeSocket(server);
    console.log('🔌 Socket.IO initialized');

    return server;

  } catch (error) {
    console.error('\n❌ Failed to start server:');
    console.error('Error:', error.message);
    process.exit(1);
  }
};

startServer().catch(error => {
  console.error('💥 Critical error during startup:', error);
  process.exit(1);
});

export default app;