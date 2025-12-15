#!/usr/bin/env node

// Railway Server Directory Deployment Script
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Railway Deployment for Server Directory...\n');

try {
  // Check current directory
  console.log('📁 Current directory:', process.cwd());
  
  // Check if we're in the server directory
  const isInServerDir = process.cwd().endsWith('server');
  console.log('📍 In server directory:', isInServerDir);
  
  if (!isInServerDir) {
    console.log('⚠️  Not in server directory. Please run from server folder.');
    process.exit(1);
  }

  // Check Railway connection
  console.log('\n📡 Checking Railway connection...');
  const status = execSync('npx @railway/cli status', { encoding: 'utf8' });
  console.log(status);

  // Check if package.json exists
  const fs = require('fs');
  if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found in server directory');
    process.exit(1);
  }

  console.log('✅ package.json found');
  
  // Check if railway.json exists
  if (!fs.existsSync('railway.json')) {
    console.log('❌ railway.json not found in server directory');
    process.exit(1);
  }

  console.log('✅ railway.json found');

  // Deploy from server directory
  console.log('\n🚀 Deploying server directory to Railway...');
  console.log('Command: npx @railway/cli up --detach');
  
  const deployResult = execSync('npx @railway/cli up --detach', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });

  console.log('\n✅ Deployment initiated!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check Railway dashboard for deployment status');
  console.log('2. Look for the service URL once deployment completes');
  console.log('3. Test: https://your-railway-url.railway.app/api/health');
  
  console.log('\n🔗 Railway Project:');
  console.log('https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');

} catch (error) {
  console.error('❌ Deployment Error:', error.message);
  
  console.log('\n🔄 Alternative Solutions:');
  console.log('1. Use Railway Dashboard method');
  console.log('2. Check Railway logs for specific errors');
  console.log('3. Verify environment variables are set');
}