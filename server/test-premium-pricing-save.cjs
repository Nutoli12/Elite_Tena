const http = require('http');

// Test saving premium pricing
const testWallet = '0x1765465194183a78fkp';

const updateData = JSON.stringify({
  video_call_fee: 5500,
  chat_fee: 3500
});

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/two-tier-pricing/doctor/premium-pricing',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(updateData),
    // Simulate auth header with wallet address
    'x-wallet-address': testWallet
  }
};

console.log(`🔄 Testing PUT ${options.path}`);
console.log('📝 Update data:', updateData);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📊 Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('📋 Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('📋 Raw response:', data);
    }
    
    // Now test GET to verify it was saved
    console.log('\n🔍 Verifying saved data...');
    const getOptions = {
      hostname: 'localhost',
      port: 3005,
      path: '/api/two-tier-pricing/doctor/current-pricing',
      method: 'GET',
      headers: {
        'x-wallet-address': testWallet
      }
    };
    
    const getReq = http.request(getOptions, (getRes) => {
      let getData = '';
      getRes.on('data', (chunk) => { getData += chunk; });
      getRes.on('end', () => {
        console.log(`📊 GET Status: ${getRes.statusCode}`);
        try {
          const getJson = JSON.parse(getData);
          console.log('📋 Current pricing:', JSON.stringify(getJson, null, 2));
        } catch (e) {
          console.log('📋 Raw response:', getData);
        }
      });
    });
    getReq.end();
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(updateData);
req.end();
