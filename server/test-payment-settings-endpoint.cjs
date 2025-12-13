const http = require('http');

const testWallet = '0x1765465194183a78fkp';

const options = {
  hostname: 'localhost',
  port: 3005,
  path: `/api/premium-services/payment-settings/${testWallet}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`🔍 Testing GET ${options.path}`);

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
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
