/**
 * Test Server Connection
 * Quick test to verify the server is responding
 */

const axios = require('axios');

async function testConnection() {
  console.log('🧪 Testing server connection...\n');
  
  try {
    console.log('📡 Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3005/api/health', { timeout: 5000 });
    console.log('✅ Health check passed:', healthResponse.data);
    
    console.log('\n📡 Testing test endpoint...');
    const testResponse = await axios.get('http://localhost:3005/api/test', { timeout: 5000 });
    console.log('✅ Test endpoint passed:', testResponse.data);
    
    console.log('\n🎉 Server is running and responding correctly!');
    console.log('🔧 The ERR_CONNECTION_REFUSED error should now be fixed.');
    console.log('\n📋 Next steps:');
    console.log('1. Keep this server running');
    console.log('2. Start your frontend (npm run dev in frontend folder)');
    console.log('3. Test the enhanced appointment booking system');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Server is not running. Start it with:');
      console.log('   cd server && node test-server.js');
      console.log('   OR');
      console.log('   cd server && npm start');
    } else {
      console.log('\n🔧 Unexpected error. Check server logs.');
    }
  }
}

testConnection();