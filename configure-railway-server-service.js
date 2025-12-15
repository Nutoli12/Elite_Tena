#!/usr/bin/env node

// Configure Railway Server Service
const { execSync } = require('child_process');

console.log('🔧 Configuring Railway Server Service...\n');

try {
  // Link to the server service
  console.log('🔗 Linking to server service...');
  // Note: This will be interactive, user needs to select "server"
  
  console.log('\n📋 IMPORTANT: Railway Service Configuration');
  console.log('Since we created a GitHub-connected service, we need to configure it properly:');
  
  console.log('\n🎯 MANUAL STEPS NEEDED IN RAILWAY DASHBOARD:');
  console.log('1. Go to: https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');
  console.log('2. Click on the "server" service (not Postgres)');
  console.log('3. Go to Settings → Source');
  console.log('4. Verify GitHub repo is connected: Nutoli12/Elite_Tena');
  console.log('5. Set Root Directory: server');
  console.log('6. Set Branch: main (or feature/system-restructure)');
  console.log('7. Save settings');
  
  console.log('\n🔧 Environment Variables to Add:');
  console.log('Go to Variables tab and add these if missing:');
  console.log('- PORT=3000');
  console.log('- CORS_ORIGINS=https://elite-tena-healthcare.netlify.app');
  console.log('- SESSION_SECRET=elite-tena-session-secret-2024');
  console.log('- ADMIN_EMAIL=admin@elitetena.com');
  console.log('- ADMIN_PASSWORD=admin123');
  
  console.log('\n🚀 After Configuration:');
  console.log('Railway will automatically deploy from GitHub');
  console.log('The build will use the server/ directory as root');
  console.log('Your backend will be available at a Railway URL');
  
  console.log('\n⚡ Alternative: Use Railway CLI to set variables');
  console.log('After linking to server service, run:');
  console.log('npx @railway/cli variables --set "PORT=3000" --set "CORS_ORIGINS=https://elite-tena-healthcare.netlify.app"');

} catch (error) {
  console.error('❌ Error:', error.message);
}