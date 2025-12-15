#!/usr/bin/env node

// Fix Railway Deployment Issues
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Railway Deployment Issues...\n');

try {
  // Issue 1: Fix dotenv path in server.js for Railway
  console.log('1. 🔧 Fixing dotenv configuration for Railway...');
  
  const serverPath = path.join('server', 'src', 'server.js');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Replace the problematic dotenv config line
  const oldDotenvLine = "dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });";
  const newDotenvLine = "dotenv.config();";
  
  if (serverContent.includes(oldDotenvLine)) {
    serverContent = serverContent.replace(oldDotenvLine, newDotenvLine);
    fs.writeFileSync(serverPath, serverContent);
    console.log('   ✅ Fixed dotenv configuration');
  } else {
    console.log('   ℹ️  Dotenv configuration already correct');
  }

  // Issue 2: Create a Railway-specific package.json without ES modules
  console.log('\n2. 🔧 Creating Railway-compatible package.json...');
  
  const packagePath = path.join('server', 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Remove "type": "module" for Railway compatibility
  if (packageContent.type === 'module') {
    delete packageContent.type;
    console.log('   ⚠️  Removed "type": "module" for Railway compatibility');
  }
  
  // Ensure start script is correct
  packageContent.scripts.start = 'node src/server.js';
  
  // Add engines for Railway
  packageContent.engines = {
    node: '18.x',
    npm: '9.x'
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
  console.log('   ✅ Updated package.json for Railway');

  // Issue 3: Create Railway-specific environment file
  console.log('\n3. 🔧 Creating Railway environment configuration...');
  
  const railwayEnvPath = path.join('server', '.env.railway');
  const railwayEnvContent = `# Railway Production Environment
NODE_ENV=production
PORT=3000
# Database URL will be auto-provided by Railway as DATABASE_URL
# Other environment variables should be set in Railway dashboard
`;
  
  fs.writeFileSync(railwayEnvPath, railwayEnvContent);
  console.log('   ✅ Created .env.railway file');

  // Issue 4: Update Railway configuration
  console.log('\n4. 🔧 Updating Railway configuration...');
  
  const railwayConfigPath = path.join('server', 'railway.json');
  const railwayConfig = {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "NIXPACKS",
      "buildCommand": "npm install --production"
    },
    "deploy": {
      "startCommand": "npm start",
      "healthcheckPath": "/api/health",
      "healthcheckTimeout": 300,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  };
  
  fs.writeFileSync(railwayConfigPath, JSON.stringify(railwayConfig, null, 2));
  console.log('   ✅ Updated railway.json configuration');

  console.log('\n✅ ALL FIXES APPLIED!\n');
  
  console.log('🚀 NEXT STEPS:');
  console.log('1. Commit and push these changes to GitHub');
  console.log('2. In Railway Dashboard:');
  console.log('   - Ensure Root Directory is set to "server"');
  console.log('   - Add NODE_VERSION=18 environment variable');
  console.log('   - Redeploy the service');
  console.log('3. Monitor build logs for success');
  
  console.log('\n🔗 Railway Project: https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');

} catch (error) {
  console.error('❌ Error applying fixes:', error.message);
  console.log('\n🔄 Manual fixes needed:');
  console.log('1. Remove "type": "module" from server/package.json');
  console.log('2. Change dotenv.config() in server.js');
  console.log('3. Set NODE_VERSION=18 in Railway dashboard');
}