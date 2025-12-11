/**
 * Quick Fix for WebSocket Connection Issues
 * Updates socket configuration for better stability
 */

import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Fixing WebSocket connection issues...');

// Fix 1: Update server socket configuration
const serverPath = 'server/src/server.js';
let serverContent = readFileSync(serverPath, 'utf8');

// Add better socket configuration
const socketConfigFix = `
// Socket.IO configuration with better error handling
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Allow fallback to polling
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true
});

// Better error handling for socket connections
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, 'Reason:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });
});`;

// Replace socket configuration if it exists
if (serverContent.includes('new Server(server')) {
  const startMarker = 'const io = new Server(server';
  const endMarker = '});';
  
  const startIndex = serverContent.indexOf(startMarker);
  if (startIndex !== -1) {
    // Find the end of the socket configuration
    let braceCount = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < serverContent.length; i++) {
      const char = serverContent[i];
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 2; // Include the closing });
          break;
        }
      }
    }
    
    const beforeSocket = serverContent.substring(0, startIndex);
    const afterSocket = serverContent.substring(endIndex);
    serverContent = beforeSocket + socketConfigFix + afterSocket;
    
    writeFileSync(serverPath, serverContent);
    console.log('✅ Updated server socket configuration');
  }
}

console.log('✅ WebSocket fixes applied!');
console.log('🚀 Restart your server to apply the fixes.');
console.log('💡 The socket connection should be more stable now.');