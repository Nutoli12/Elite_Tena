const http = require('http');

const testWallet = '0x1765465194183a78fkp';

const updateData = JSON.stringify({
  telebirrEnabled: true,
  telebirrNumber: '+251912345678',
  videoCallFee: 75.00,
  chatFee: 45.00
});

const options = {
  hostname: 'localhost',
  port: 3005,
  path: `/api/premium-services/payment-settings/${testWallet}`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(updateData)
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
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(updateData);
req.end();
