#!/usr/bin/env node

// Test Railway Server Deployment
const https = require('https');
const { execSync } = require('child_process');

console.log('🔍 Testing Railway Server Deployment...\n');

// Common Railway URL patterns for our project
const possibleUrls = [
  'https://server-production-f829.up.railway.app',
  'https://elite-tena-server-production.up.railway.app',
  'https://elite-tena-production.up.railway.app',
  'https://server-production.up.railway.app'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`🌐 Testing: ${url}`);
    
    const healthUrl = url + '/api/health';
    https.get(healthUrl, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`   ✅ SUCCESS! Backend is live at: ${url}`);
          console.log(`   Response: ${data.substring(0, 100)}`);
          resolve({ success: true, url, data });
        } else {
          console.log(`   ❌ Failed with status ${res.statusCode}`);
          resolve({ success: false, url });
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Connection error: ${err.message}`);
      resolve({ success: false, url });
    });
  });
}

async function findWorkingUrl() {
  console.log('🔍 Searching for working Railway URL...\n');
  
  for (const url of possibleUrls) {
    const result = await testUrl(url);
    if (result.success) {
      return result;
    }
    console.log(''); // Empty line for readability
  }
  
  return null;
}

async function checkDeploymentStatus() {
  try {
    console.log('📊 Checking Railway deployment status...');
    const deployments = execSync('npx @railway/cli deployment list', { encoding: 'utf8' });
    console.log(deployments);
  } catch (error) {
    console.log('Could not fetch deployment status');
  }
}

async function main() {
  // Check deployment status first
  await checkDeploymentStatus();
  
  console.log('\n' + '='.repeat(50));
  
  // Try to find working URL
  const workingUrl = await findWorkingUrl();
  
  if (workingUrl) {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log(`✅ Backend URL: ${workingUrl.url}`);
    console.log(`✅ Health Check: ${workingUrl.url}/api/health`);
    console.log(`✅ Admin Panel: ${workingUrl.url}/admin`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update Netlify environment variables with this URL');
    console.log('2. Test the complete system');
  } else {
    console.log('\n⏳ Deployment may still be in progress...');
    console.log('\n🔗 Check Railway Dashboard:');
    console.log('https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');
    
    console.log('\n💡 The deployment URL will be available once build completes.');
  }
}

main().catch(console.error);