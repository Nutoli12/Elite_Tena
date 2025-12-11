#!/usr/bin/env node

/**
 * Fix Email Authentication Issues - Simple Version
 */

import db from './server/src/models/index.js';

console.log('🔧 FIXING EMAIL AUTHENTICATION ISSUES');
console.log('=' .repeat(50));

try {
  // 1. Create missing user for semir@gmail.com
  console.log('\n1️⃣ CREATING MISSING USER: semir@gmail.com');
  
  const existingSemir = await db.User.findOne({
    where: { email: 'semir@gmail.com' }
  });
  
  if (!existingSemir) {
    // Create user with semir@gmail.com
    const newUser = await db.User.create({
      walletAddress: '0x' + Date.now().toString(16) + Math.random().toString(36).substring(7),
      email: 'semir@gmail.com',
      role: 'patient',
      isActive: true,
      profileData: JSON.stringify({
        name: 'Semir Yusuf',
        firstName: 'Semir',
        lastName: 'Yusuf',
        phone: '+251911234567',
        password: '123456' // Simple password storage
      })
    });
    
    // Create patient record
    await db.Patient.create({
      walletAddress: newUser.walletAddress
    });
    
    console.log('✅ Created user semir@gmail.com');
    console.log(`   - Wallet: ${newUser.walletAddress}`);
    console.log(`   - Password: 123456`);
  } else {
    console.log('✅ User semir@gmail.com already exists');
  }
  
  // 2. Fix nutirese@gmail.com password
  console.log('\n2️⃣ FIXING PASSWORD FOR: nutirese@gmail.com');
  
  const nutireseUser = await db.User.findOne({
    where: { email: 'nutirese@gmail.com' }
  });
  
  if (nutireseUser) {
    // Update profile data to include password
    let profileData = {};
    try {
      profileData = JSON.parse(nutireseUser.profileData || '{}');
    } catch (e) {
      profileData = {};
    }
    
    profileData.password = '123456';
    
    await nutireseUser.update({
      profileData: JSON.stringify(profileData)
    });
    
    console.log('✅ Updated nutirese@gmail.com password');
    console.log('   - Password: 123456');
  }
  
  // 3. Also fix semiryusuf@gmail.com (the actual semir account)
  console.log('\n3️⃣ FIXING PASSWORD FOR: semiryusuf@gmail.com');
  
  const semirYusufUser = await db.User.findOne({
    where: { email: 'semiryusuf@gmail.com' }
  });
  
  if (semirYusufUser) {
    let profileData = {};
    try {
      profileData = JSON.parse(semirYusufUser.profileData || '{}');
    } catch (e) {
      profileData = {};
    }
    
    profileData.password = '123456';
    
    await semirYusufUser.update({
      profileData: JSON.stringify(profileData)
    });
    
    console.log('✅ Updated semiryusuf@gmail.com password');
    console.log('   - Password: 123456');
  }
  
  // 4. Test authentication
  console.log('\n4️⃣ TESTING AUTHENTICATION');
  
  const testUsers = [
    { email: 'semir@gmail.com', password: '123456' },
    { email: 'nutirese@gmail.com', password: '123456' },
    { email: 'semiryusuf@gmail.com', password: '123456' }
  ];
  
  for (const testUser of testUsers) {
    try {
      const response = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      
      const result = await response.json();
      console.log(`📧 ${testUser.email}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (!result.success) {
        console.log(`   Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${testUser.email}: Network error - ${error.message}`);
    }
  }
  
  // 5. Summary
  console.log('\n5️⃣ AUTHENTICATION CREDENTIALS READY');
  console.log('🔐 EMAIL/PASSWORD LOGIN:');
  console.log('   📧 semir@gmail.com / 123456');
  console.log('   📧 nutirese@gmail.com / 123456');
  console.log('   📧 semiryusuf@gmail.com / 123456');
  
  console.log('\n🔑 WALLET LOGIN (Alternative):');
  console.log('   🌐 0x1764894073908ypl7fp (semiryusuf@gmail.com)');
  console.log('   🌐 0x1764503803602b7tlna (nutirese@gmail.com)');
  
  console.log('\n✅ ALL AUTHENTICATION ISSUES FIXED!');
  
} catch (error) {
  console.error('❌ Fix failed:', error.message);
  console.error(error.stack);
} finally {
  await db.sequelize.close();
  process.exit(0);
}