#!/usr/bin/env node

// Diagnose Railway Deployment Errors
console.log('🔍 Railway Deployment Error Diagnosis\n');

console.log('📋 COMMON RAILWAY DEPLOYMENT ERRORS & SOLUTIONS:\n');

console.log('🚨 ERROR 1: "No package.json found"');
console.log('   CAUSE: Root directory not set correctly');
console.log('   SOLUTION: Set Root Directory to "server" in Railway dashboard');
console.log('   PATH: Settings → Source → Root Directory: server\n');

console.log('🚨 ERROR 2: "Module not found" or "Cannot resolve module"');
console.log('   CAUSE: Missing dependencies or wrong Node.js version');
console.log('   SOLUTION: Check package.json and add missing dependencies');
console.log('   ALSO: Set NODE_VERSION=18 in environment variables\n');

console.log('🚨 ERROR 3: "Port already in use" or "EADDRINUSE"');
console.log('   CAUSE: Port configuration issue');
console.log('   SOLUTION: Ensure PORT=3000 is set in environment variables');
console.log('   CHECK: server.js uses process.env.PORT || 3000\n');

console.log('🚨 ERROR 4: "Database connection failed"');
console.log('   CAUSE: Missing DATABASE_URL or wrong connection string');
console.log('   SOLUTION: Railway auto-provides DATABASE_URL for PostgreSQL');
console.log('   CHECK: Ensure PostgreSQL service is added to project\n');

console.log('🚨 ERROR 5: "Build timeout" or "Build failed"');
console.log('   CAUSE: Large dependencies or slow build process');
console.log('   SOLUTION: Optimize package.json, remove unused dependencies');
console.log('   ALSO: Check for native dependencies that need compilation\n');

console.log('🚨 ERROR 6: "Start command failed"');
console.log('   CAUSE: Wrong start command or missing start script');
console.log('   SOLUTION: Ensure package.json has "start": "node src/server.js"');
console.log('   CHECK: Verify src/server.js exists and is executable\n');

console.log('🔧 IMMEDIATE FIXES TO TRY:\n');

console.log('1. 📁 CHECK ROOT DIRECTORY:');
console.log('   - Go to Railway Dashboard → Your Service → Settings → Source');
console.log('   - Set Root Directory: server');
console.log('   - Save and redeploy\n');

console.log('2. 🔧 ADD MISSING ENVIRONMENT VARIABLES:');
console.log('   - NODE_ENV=production');
console.log('   - PORT=3000');
console.log('   - NODE_VERSION=18');
console.log('   - All other required variables\n');

console.log('3. 📦 CHECK PACKAGE.JSON:');
console.log('   - Ensure "start" script exists');
console.log('   - Verify all dependencies are listed');
console.log('   - Check for any missing peer dependencies\n');

console.log('4. 🗄️ DATABASE CONNECTION:');
console.log('   - Ensure PostgreSQL service is added');
console.log('   - DATABASE_URL should be auto-provided by Railway');
console.log('   - Check database connection code in server\n');

console.log('🎯 NEXT STEPS:');
console.log('1. Check Railway Dashboard build logs for specific error');
console.log('2. Apply the relevant fix from above');
console.log('3. Redeploy and monitor logs');
console.log('4. Test health endpoint once deployed\n');

console.log('🔗 Railway Project: https://railway.com/project/f829c48f-6bfb-42c3-8e70-054c4b52444e');
console.log('📖 Railway Docs: https://docs.railway.app/troubleshoot/fixing-common-errors');