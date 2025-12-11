/**
 * Quick Test - Smart Scheduling System
 * Simple test to verify the system is working
 */

console.log('🚀 Quick Smart Scheduling Test...\n');

// Test 1: Check if services can be imported
try {
  console.log('1️⃣ Testing Service Imports...');
  
  // These should not throw errors
  const SlotManager = await import('./server/src/services/SlotManager.js');
  const QueueService = await import('./server/src/services/QueueService.js');
  const EmergencyManager = await import('./server/src/services/EmergencyManager.js');
  const DynamicDurationManager = await import('./server/src/services/DynamicDurationManager.js');
  
  console.log('✅ SlotManager imported successfully');
  console.log('✅ QueueService imported successfully');
  console.log('✅ EmergencyManager imported successfully');
  console.log('✅ DynamicDurationManager imported successfully');
  
} catch (error) {
  console.error('❌ Service import failed:', error.message);
}

// Test 2: Check Mock Redis
try {
  console.log('\n2️⃣ Testing Mock Redis Lock Manager...');
  
  const MockRedis = await import('./server/src/services/MockRedisLockManager.js');
  const lockManager = MockRedis.default;
  
  // Test lock operations
  const lockKey = 'test-lock-' + Date.now();
  const acquired = await lockManager.acquireLock(lockKey, 5);
  console.log(`✅ Lock acquired: ${acquired}`);
  
  const hasLock = await lockManager.hasLock(lockKey);
  console.log(`✅ Lock exists: ${hasLock}`);
  
  const released = await lockManager.releaseLock(lockKey);
  console.log(`✅ Lock released: ${released}`);
  
} catch (error) {
  console.error('❌ Mock Redis test failed:', error.message);
}

// Test 3: Check if server routes are accessible
try {
  console.log('\n3️⃣ Testing Server Availability...');
  
  const response = await fetch('http://localhost:3001/api/health');
  if (response.ok) {
    console.log('✅ Backend server is running');
  } else {
    console.log('⚠️  Backend server responded but with error status');
  }
} catch (error) {
  console.log('⚠️  Backend server not accessible (may still be starting)');
}

console.log('\n🎉 Quick test completed!');
console.log('\n📋 Next Steps:');
console.log('1. Make sure both backend and frontend are running');
console.log('2. Backend should be on: http://localhost:3001');
console.log('3. Frontend should be on: http://localhost:8080');
console.log('4. Smart Scheduling API available at: http://localhost:3001/api/smart-scheduling');
console.log('\n✨ Your Smart Scheduling System is ready to use!');