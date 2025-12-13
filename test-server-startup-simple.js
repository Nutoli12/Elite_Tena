/**
 * Simple Server Startup Test
 * Tests if the server can start without errors
 */

const { spawn } = require('child_process');
const axios = require('axios');

async function testServerStartup() {
  console.log('🧪 TESTING SERVER STARTUP');
  console.log('=========================\n');

  console.log('📋 Step 1: Check if server is already running...');
  
  try {
    const response = await axios.get('http://localhost:3005/health', { timeout: 2000 });
    console.log('✅ Server is already running!');
    console.log('Response:', response.data);
    console.log('\n🎯 Server is working. The issue might be with specific endpoints.');
    console.log('Try testing the Chapa payment endpoint now.');
    return;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running (connection refused)');
    } else {
      console.log('⚠️ Server responded with error:', error.message);
    }
  }

  console.log('\n📋 Step 2: Attempting to start server...');
  console.log('💡 You need to manually start the server in a separate terminal:');
  console.log('   1. Open new terminal/command prompt');
  console.log('   2. cd server');
  console.log('   3. npm start');
  console.log('   4. Watch for startup messages\n');

  console.log('🔍 WHAT TO LOOK FOR WHEN STARTING SERVER:\n');

  console.log('✅ SUCCESSFUL STARTUP MESSAGES:');
  console.log('   • "Loading environment variables..."');
  console.log('   • "Database connected successfully"');
  console.log('   • "Server running on port 3005"');
  console.log('   • No error messages\n');

  console.log('❌ COMMON ERROR MESSAGES:');
  console.log('   • "ECONNREFUSED" → Database not running');
  console.log('   • "EADDRINUSE" → Port 3005 already in use');
  console.log('   • "SyntaxError" → Code syntax error');
  console.log('   • "MODULE_NOT_FOUND" → Missing dependencies\n');

  console.log('🔧 SOLUTIONS FOR COMMON ERRORS:\n');

  console.log('1. DATABASE CONNECTION ERROR:');
  console.log('   • Start PostgreSQL service');
  console.log('   • Check database credentials in server/.env');
  console.log('   • Verify database "elitetena" exists\n');

  console.log('2. PORT IN USE ERROR:');
  console.log('   • Kill existing Node processes: taskkill /f /im node.exe');
  console.log('   • Or change port in server/.env\n');

  console.log('3. MISSING DEPENDENCIES:');
  console.log('   • cd server && npm install\n');

  console.log('4. SYNTAX ERROR:');
  console.log('   • Check the error message for file and line number');
  console.log('   • May be related to recent phone number validation changes\n');

  console.log('🚀 MANUAL STARTUP COMMANDS:');
  console.log('   cd server');
  console.log('   npm install  # Install dependencies');
  console.log('   npm start    # Start server\n');

  console.log('⏱️ Waiting 10 seconds for you to start the server manually...');
  
  // Wait and test again
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('\n📋 Step 3: Testing server connection again...');
  
  try {
    const response = await axios.get('http://localhost:3005/health', { timeout: 5000 });
    console.log('🎉 SUCCESS! Server is now running!');
    console.log('Response:', response.data);
    
    // Test Chapa endpoint
    console.log('\n📋 Step 4: Testing Chapa payment endpoint...');
    try {
      const chapaTest = await axios.get('http://localhost:3005/api/chapa-payment/test');
      console.log('✅ Chapa routes working:', chapaTest.data);
      
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Server is running successfully');
      console.log('2. Test making a payment to see if Chapa integration works');
      console.log('3. Check if payments appear in Chapa dashboard');
      console.log('4. Run: node check-payment-status-detailed.js');
      
    } catch (chapaError) {
      console.log('⚠️ Chapa endpoint error:', chapaError.response?.status, chapaError.message);
    }
    
  } catch (error) {
    console.log('❌ Server still not responding after 10 seconds');
    console.log('Error:', error.message);
    
    console.log('\n🆘 TROUBLESHOOTING:');
    console.log('1. Check the server terminal for error messages');
    console.log('2. Make sure you ran "cd server && npm start"');
    console.log('3. Verify PostgreSQL is running');
    console.log('4. Check if port 3005 is available');
  }
}

testServerStartup().catch(console.error);