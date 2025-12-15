// Test script to verify Railway backend deployment
const https = require('https');

// You'll need to update this URL after Railway deployment
const RAILWAY_URL = 'https://your-railway-url.railway.app';

console.log('🔍 Testing Railway Backend Deployment...');
console.log('URL:', RAILWAY_URL);

// Test health endpoint
function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const url = RAILWAY_URL + path;
    console.log(`\n📡 Testing ${description}: ${url}`);
    
    https.get(url, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${description} - Working!`);
          console.log('Response:', data.substring(0, 200));
        } else {
          console.log(`❌ ${description} - Error ${res.statusCode}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ ${description} - Connection Error:`, err.message);
      resolve();
    });
  });
}

async function testDeployment() {
  console.log('🚀 Starting Railway Backend Tests...\n');
  
  await testEndpoint('/api/health', 'Health Check');
  await testEndpoint('/api/test', 'Test Endpoint');
  await testEndpoint('/admin', 'Admin Panel');
  
  console.log('\n🎯 Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Update RAILWAY_URL in this script with your actual Railway URL');
  console.log('2. Update frontend environment variables in Netlify');
  console.log('3. Test the complete system');
}

// Run tests
testDeployment();