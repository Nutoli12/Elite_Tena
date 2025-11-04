const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Elite Tena Server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic user registration (mock)
app.post('/api/users/register', (req, res) => {
  const { walletAddress, role, email } = req.body;
  res.json({
    success: true,
    message: 'User registered successfully (mock)',
    user: {
      walletAddress,
      role,
      email,
      id: 1
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Elite Tena Server',
    endpoints: {
      health: '/api/health',
      users: {
        register: '/api/users/register (POST)'
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(' Elite Tena Server running on http://localhost:' + PORT);
  console.log(' Health check: http://localhost:' + PORT + '/api/health');
});
