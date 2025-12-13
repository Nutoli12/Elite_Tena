/**
 * Diagnose Server Startup Issue
 * The frontend is showing connection refused errors, meaning the server is not running
 */

console.log('🔍 DIAGNOSING SERVER STARTUP ISSUE');
console.log('==================================\n');

console.log('📋 SYMPTOMS OBSERVED:');
console.log('• Frontend: "Failed to load resource: net::ERR_CONNECTION_REFUSED"');
console.log('• API calls to :3005 are failing');
console.log('• Socket connection failures');
console.log('• 500 Internal Server Errors when server briefly connects\n');

console.log('🎯 ROOT CAUSE:');
console.log('• Server is not running or crashed during startup');
console.log('• Possible issues with the updated code causing startup failures');
console.log('• Database connection issues');
console.log('• Port 3005 not available\n');

console.log('🔧 TROUBLESHOOTING STEPS:\n');

console.log('1. 🔍 CHECK IF SERVER IS RUNNING:');
console.log('   • Open Task Manager (Ctrl+Shift+Esc)');
console.log('   • Look for Node.js processes');
console.log('   • Check if port 3005 is in use\n');

console.log('2. 🛑 KILL ANY EXISTING SERVER PROCESSES:');
console.log('   • Windows: taskkill /f /im node.exe');
console.log('   • Or close all Node.js processes in Task Manager\n');

console.log('3. 🚀 START SERVER WITH ERROR LOGGING:');
console.log('   • cd server');
console.log('   • npm start');
console.log('   • Watch for startup errors in console\n');

console.log('4. 🔍 COMMON STARTUP ISSUES TO CHECK:\n');

console.log('   a) DATABASE CONNECTION:');
console.log('      • PostgreSQL service running?');
console.log('      • Database credentials correct in server/.env?');
console.log('      • Database "elitetena" exists?\n');

console.log('   b) ENVIRONMENT VARIABLES:');
console.log('      • server/.env file exists?');
console.log('      • All required variables set?');
console.log('      • No syntax errors in .env?\n');

console.log('   c) NODE MODULES:');
console.log('      • cd server && npm install');
console.log('      • Check for missing dependencies\n');

console.log('   d) CODE SYNTAX ERRORS:');
console.log('      • Recent changes may have syntax errors');
console.log('      • Check server console for error messages\n');

console.log('5. 🧪 TEST SERVER STARTUP MANUALLY:\n');

console.log('   Step 1: Open terminal in server directory');
console.log('   Step 2: Run: npm start');
console.log('   Step 3: Look for these messages:');
console.log('      ✅ "Database connected successfully"');
console.log('      ✅ "Server running on port 3005"');
console.log('      ❌ Any error messages\n');

console.log('6. 🔄 IF SERVER STARTS BUT CRASHES:');
console.log('   • Note the error message');
console.log('   • Check if it\'s related to recent code changes');
console.log('   • May need to revert recent changes temporarily\n');

console.log('7. 🎯 EXPECTED STARTUP SEQUENCE:');
console.log('   1. Loading environment variables');
console.log('   2. Connecting to PostgreSQL database');
console.log('   3. Loading models and routes');
console.log('   4. Starting Express server on port 3005');
console.log('   5. "Server running on port 3005" message\n');

console.log('💡 QUICK FIXES TO TRY:\n');

console.log('• Restart PostgreSQL service');
console.log('• Kill all Node.js processes and restart');
console.log('• Check if another app is using port 3005');
console.log('• Verify server/.env file exists and is valid');
console.log('• Run: cd server && npm install && npm start\n');

console.log('🚨 IF SERVER WON\'T START:');
console.log('1. Copy the exact error message');
console.log('2. Check if it\'s related to the recent phone number validation changes');
console.log('3. May need to temporarily revert changes to get server running');
console.log('4. Then apply fixes more carefully\n');

console.log('🔍 NEXT STEPS:');
console.log('1. Try starting the server manually');
console.log('2. Share any error messages you see');
console.log('3. Once server starts, test the Chapa payment fix');
console.log('4. Verify payments appear in Chapa dashboard');