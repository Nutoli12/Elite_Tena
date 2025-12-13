
/**
 * Minimal Server Test
 * Tests if server can start without the enhanced appointment system
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const app = express();
const PORT = process.env.PORT || 3005;

// Basic middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Minimal server is running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    enhanced_appointments: 'Not loaded yet - testing basic functionality'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});
