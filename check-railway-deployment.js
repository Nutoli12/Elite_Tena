#!/usr/bin/env node

// Check Railway Deployment Status
const { execSync } = require('child_process');

console.log('🔍 Checking Railway Deployment Status...\n');

try {
  // Check project status
  console.log('📊 Project Status:');
  const status = execSync('npx @railway/cli status', { encoding: 'utf8' });
  console.log(status);

  // Try to get deployment info
  console.log('🚀 Recent Deployments:');
  try {
    const deployments = execSync('npx @railway/cli deployment list', { encoding: 'utf8' });
    console.log(deployments);
  } catch (e) {
    console.log('Could not fetch deployment list');
  }

  // Open Railway dashboard
  console.log('🌐 Opening Railway Dashboard...');
  execSync('npx @railway/cli open', { stdio: 'inherit' });

  console.log('\n✅ NEXT STEPS:');
  console.log('1. Check the Railway dashboard that just opened');
  console.log('2. Look for your backend service deployment');
  console.log('3. Copy the Railway URL (like https://your-app.railway.app)');
  console.log('4. Test the health endpoint: https://your-url.railway.app/api/health');
  
  console.log('\n🔗 Your Railway Project:');
  console.log('https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');

} catch (error) {
  console.error('❌ Error:', error.message);
}