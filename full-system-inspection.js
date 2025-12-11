#!/usr/bin/env node

/**
 * Full System Inspection - Check why specific emails are not working
 */

import db from './server/src/models/index.js';

const problematicEmails = ['semir@gmail.com', 'nutirese@gmail.com'];

console.log('🔍 FULL SYSTEM INSPECTION - Email Authentication Issues');
console.log('=' .repeat(60));

try {
  // 1. Check if users exist with these emails
  console.log('\n1️⃣ CHECKING USER EXISTENCE:');
  for (const email of problematicEmails) {
    const user = await db.User.findOne({
      where: { email: email.toLowerCase() }
    });
    
    if (user) {
      console.log(`✅ ${email}: User EXISTS`);
      console.log(`   - Wallet: ${user.walletAddress}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Profile: ${user.profileData}`);
    } else {
      console.log(`❌ ${email}: User NOT FOUND`);
    }
  }
  
  // 2. Check similar emails (typos)
  console.log('\n2️⃣ CHECKING SIMILAR EMAILS:');
  const allUsers = await db.User.findAll({
    attributes: ['email', 'walletAddress', 'role', 'isActive']
  });
  
  for (const email of problematicEmails) {
    console.log(`\n🔍 Looking for emails similar to: ${email}`);
    const similarEmails = allUsers.filter(user => 
      user.email.includes(email.split('@')[0]) || 
      user.email.includes(email.split('@')[1])
    );
    
    if (similarEmails.length > 0) {
      similarEmails.forEach(user => {
        console.log(`   📧 Found: ${user.email} (${user.role}) - ${user.walletAddress}`);
      });
    } else {
      console.log(`   ❌ No similar emails found`);
    }
  }
  
  // 3. Check authentication endpoints
  console.log('\n3️⃣ TESTING AUTHENTICATION ENDPOINTS:');
  
  // Test login endpoint
  try {
    const response = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'semir@gmail.com',
        password: 'test123'
      })
    });
    
    const result = await response.json();
    console.log(`📡 Login test for semir@gmail.com:`, result.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result.success) {
      console.log(`   Error: ${result.message || result.error}`);
    }
  } catch (error) {
    console.log(`❌ Login endpoint test failed: ${error.message}`);
  }
  
  // 4. Check wallet-based authentication
  console.log('\n4️⃣ CHECKING WALLET-BASED AUTHENTICATION:');
  const walletsToCheck = [
    '0x1764894073908ypl7fp', // semir's wallet
    '0x1764503803602b7tlna'  // nutirese's wallet
  ];
  
  for (const wallet of walletsToCheck) {
    const user = await db.User.findOne({
      where: { walletAddress: wallet.toLowerCase() }
    });
    
    if (user) {
      console.log(`✅ Wallet ${wallet}: User found`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
    } else {
      console.log(`❌ Wallet ${wallet}: User NOT FOUND`);
    }
  }
  
  // 5. Check database constraints and indexes
  console.log('\n5️⃣ CHECKING DATABASE CONSTRAINTS:');
  
  const tableInfo = await db.sequelize.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `);
  
  console.log('📋 Users table structure:');
  tableInfo[0].forEach(col => {
    console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  });
  
  // 6. Check authentication controller logic
  console.log('\n6️⃣ CHECKING AUTHENTICATION LOGIC:');
  
  // Test email normalization
  const testEmails = ['Semir@Gmail.com', 'NUTIRESE@GMAIL.COM', 'semir@gmail.com'];
  testEmails.forEach(email => {
    const normalized = email.toLowerCase();
    console.log(`📧 ${email} → ${normalized}`);
  });
  
  // 7. Check recent login attempts (if logs exist)
  console.log('\n7️⃣ CHECKING RECENT ACTIVITY:');
  
  const recentUsers = await db.User.findAll({
    where: {
      updatedAt: {
        [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    attributes: ['email', 'walletAddress', 'updatedAt'],
    order: [['updatedAt', 'DESC']],
    limit: 10
  });
  
  console.log('🕒 Recent user activity (last 24h):');
  recentUsers.forEach(user => {
    console.log(`   - ${user.email}: ${user.updatedAt}`);
  });
  
  // 8. Check password hashing (if applicable)
  console.log('\n8️⃣ CHECKING PASSWORD SYSTEM:');
  
  const usersWithPasswords = await db.User.findAll({
    where: {
      email: {
        [db.Sequelize.Op.in]: problematicEmails.map(e => e.toLowerCase())
      }
    },
    attributes: ['email', 'walletAddress', 'role']
  });
  
  console.log('🔐 Password system status:');
  if (usersWithPasswords.length === 0) {
    console.log('   ❌ No users found with problematic emails');
  } else {
    usersWithPasswords.forEach(user => {
      console.log(`   - ${user.email}: User exists, check password system`);
    });
  }
  
  // 9. Final recommendations
  console.log('\n9️⃣ RECOMMENDATIONS:');
  console.log('🔧 To fix email authentication issues:');
  console.log('   1. Verify users exist in database');
  console.log('   2. Check email case sensitivity');
  console.log('   3. Verify password hashing');
  console.log('   4. Test authentication endpoints');
  console.log('   5. Check frontend-backend communication');
  
} catch (error) {
  console.error('❌ Inspection failed:', error.message);
  console.error(error.stack);
} finally {
  await db.sequelize.close();
  process.exit(0);
}