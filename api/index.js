// Bulletproof Vercel API Entry Point with Comprehensive CORS
import app from '../server/src/server.js';

// Comprehensive CORS middleware that handles ALL scenarios
const corsMiddleware = (req, res, next) => {
  // Set CORS headers for ALL requests
  const origin = req.headers.origin;
  
  // Allow all origins for now (can be restricted later)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, ' +
    'X-Wallet-Address, x-wallet-address, x-user-role, Access-Control-Request-Method, ' +
    'Access-Control-Request-Headers'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight request for:', req.url);
    res.status(200).end();
    return;
  }
  
  // Log all requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${origin}`);
  
  next();
};

// Apply CORS middleware BEFORE the app
app.use(corsMiddleware);

// Additional error handling for CORS
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    console.error('CORS Error:', err.message);
    res.status(200).json({ error: 'CORS configuration issue', message: err.message });
    return;
  }
  next(err);
});

export default app;
