#!/usr/bin/env node

// Railway Command-Line Deployment Script
const { execSync } = require('child_process');

console.log('🚀 Starting Railway Backend Deployment via Commands...\n');

try {
  // Step 1: Check Railway CLI status
  console.log('📡 Checking Railway connection...');
  const status = execSync('npx @railway/cli status', { encoding: 'utf8' });
  console.log(status);

  // Step 2: Add a new service with GitHub repo
  console.log('🔗 Creating backend service with GitHub connection...');
  
  // The service creation command with all necessary variables
  const createServiceCommand = `npx @railway/cli add --service elite-tena-backend --repo Nutoli12/Elite_Tena`;
  
  console.log('Running:', createServiceCommand);
  
  // Note: This will be interactive, so we'll provide instructions instead
  console.log('\n📋 MANUAL STEPS NEEDED:');
  console.log('1. The Railway CLI will prompt for repository: Enter "Nutoli12/Elite_Tena"');
  console.log('2. It will ask for environment variables. Enter these:');
  console.log('   - NODE_ENV=production');
  console.log('   - PORT=3000');
  console.log('   - JWT_SECRET=elite-tena-super-secure-jwt-secret-2024');
  console.log('   - CORS_ORIGINS=https://elite-tena-healthcare.netlify.app');
  console.log('   - SESSION_SECRET=elite-tena-session-secret-2024');
  console.log('   - ADMIN_EMAIL=admin@elitetena.com');
  console.log('   - ADMIN_PASSWORD=admin123');
  console.log('\n🎯 After service creation, Railway will automatically deploy from GitHub!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  
  console.log('\n🔄 ALTERNATIVE: Use Railway Dashboard');
  console.log('1. Go to: https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');
  console.log('2. Click "New Service" → "GitHub Repo"');
  console.log('3. Select "Elite_Tena" repository');
  console.log('4. Set Root Directory: server');
  console.log('5. Add environment variables listed above');
  console.log('6. Deploy automatically');
}