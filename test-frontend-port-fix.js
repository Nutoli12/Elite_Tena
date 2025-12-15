#!/usr/bin/env node

console.log('🔧 Testing Frontend Port Configuration Fix...\n');

const fs = require('fs');
const path = require('path');

// Check frontend .env file
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(frontendEnvPath)) {
  const envContent = fs.readFileSync(frontendEnvPath, 'utf8');
  console.log('📁 Frontend .env file contents:');
  console.log('----------------------------------------');
  envContent.split('\n').forEach((line, index) => {
    if (line.includes('VITE_API')) {
      console.log(`${index + 1}: ${line}`);
    }
  });
  console.log('----------------------------------------\n');
  
  // Check if it contains the correct port
  if (envContent.includes('localhost:3003')) {
    console.log('✅ Frontend .env file correctly configured for port 3003');
  } else if (envContent.includes('localhost:3005')) {
    console.log('❌ Frontend .env file still has port 3005 - needs manual fix');
  } else {
    console.log('⚠️  Frontend .env file port configuration unclear');
  }
} else {
  console.log('❌ Frontend .env file not found');
}

console.log('\n🎯 Next Steps:');
console.log('1. Restart the frontend development server');
console.log('2. The frontend will now connect to port 3003');
console.log('3. Test login with: doctor@test.com / password123');
console.log('\n💡 Commands to restart frontend:');
console.log('   cd frontend');
console.log('   npm run dev');