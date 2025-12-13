/**
 * Test Server Startup
 * Quick test to see if the server can start without errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Server Startup...\n');

// Check if we're in the right directory
if (!fs.existsSync('server') || !fs.existsSync('server/src/server.js')) {
  console.error('❌ Please run this script from the project root directory');
  console.error('   Make sure server/src/server.js exists');
  process.exit(1);
}

try {
  console.log('📦 Step 1: Checking server dependencies...');
  
  // Check if node_modules exists in server
  if (!fs.existsSync('server/node_modules')) {
    console.log('📦 Installing server dependencies...');
    execSync('cd server && npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Server dependencies already installed');
  }

  console.log('\n🔧 Step 2: Checking server configuration...');
  
  // Check if .env exists
  if (!fs.existsSync('server/.env')) {
    console.error('❌ server/.env file not found');
    console.log('💡 Create server/.env with:');
    console.log('   PORT=3005');
    console.log('   DATABASE_URL=postgresql://user:pass@localhost:5432/elitetena');
    process.exit(1);
  } else {
    console.log('✅ Environment file found');
  }

  console.log('\n🚀 Step 3: Testing server startup (dry run)...');
  
  // Try to start the server with a timeout
  try {
    console.log('🔄 Starting server...');
    console.log('   If this hangs, the server might be waiting for database connection');
    console.log('   Press Ctrl+C to stop if needed\n');
    
    // Start server in background and test if it responds
    const { spawn } = require('child_process');
    const serverProcess = spawn('node', ['src/server.js'], {
      cwd: 'server',
      stdio: 'pipe'
    });

    let serverOutput = '';
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.log(output);
      
      if (output.includes('Elite-Tena Backend Server Started Successfully')) {
        serverStarted = true;
        console.log('\n🎉 Server started successfully!');
        
        // Test the health endpoint
        setTimeout(async () => {
          try {
            const axios = require('axios');
            const response = await axios.get('http://localhost:3005/api/health', { timeout: 5000 });
            console.log('✅ Health check passed:', response.data.status);
            
            // Kill the server
            serverProcess.kill();
            console.log('\n✅ Server startup test completed successfully!');
            console.log('\n🚀 To start the server normally, run:');
            console.log('   cd server && npm start');
            console.log('   OR');
            console.log('   ./start-server-quick.bat');
            
          } catch (error) {
            console.log('⚠️  Health check failed:', error.message);
            serverProcess.kill();
          }
        }, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('❌ Server error:', error);
      
      if (error.includes('ECONNREFUSED') || error.includes('database')) {
        console.log('\n💡 Database connection issue detected.');
        console.log('   Make sure PostgreSQL is running and DATABASE_URL is correct');
      }
    });

    serverProcess.on('close', (code) => {
      if (!serverStarted) {
        console.log(`\n❌ Server exited with code ${code}`);
        console.log('\n🔧 Common issues:');
        console.log('   1. Database not running (PostgreSQL)');
        console.log('   2. Wrong DATABASE_URL in server/.env');
        console.log('   3. Missing dependencies (run: cd server && npm install)');
        console.log('   4. Port 3005 already in use');
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverStarted) {
        console.log('\n⏰ Timeout: Server taking too long to start');
        console.log('   This usually means database connection issues');
        serverProcess.kill();
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
  }

} catch (error) {
  console.error('❌ Startup test failed:', error.message);
  console.log('\n🔧 Try these steps:');
  console.log('1. cd server');
  console.log('2. npm install');
  console.log('3. npm start');
  process.exit(1);
}