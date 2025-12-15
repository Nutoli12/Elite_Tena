#!/usr/bin/env node

/**
 * Debug Lab Technician 403 Error
 * Investigates why the technician dashboard returns 403 Forbidden
 */

import axios from 'axios';
import db from './server/src/models/index.js';

const { User } = db;
const API_BASE = 'http://localhost:3003';

async function debugLabTechnician403() {
  console.log('🔍 Debugging Lab Technician 403 Error...\n');

  try {
    // Step 1: Check what users exist and their roles
    console.log('👥 Step 1: Checking user roles in database...');
    const allUsers = await User.findAll({
      attributes: ['walletAddress', 'name', 'email', 'role'],
      order: [['role', 'ASC']]
    });

    const roleCount = {};
    allUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    console.log('📊 Role distribution:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });

    // Step 2: Check for lab technicians specifically
    console.log('\n🧪 Step 2: Looking for lab technicians...');
    const labTechnicians = allUsers.filter(user => 
      user.role === 'lab_technician' || 
      user.role === 'technician' || 
      user.role.includes('lab')
    );

    if (labTechnicians.length === 0) {
      console.log('❌ No lab technicians found in database!');
      console.log('   Available roles:', Object.keys(roleCount).join(', '));
      
      // Create a test lab technician
      console.log('\n🛠️  Creating test lab technician...');
      const testTechnician = await User.create({
        walletAddress: '0xlabtechnician123456789012345678901234567890',
        email: 'lab.technician@elitetena.com',
        name: 'Test Lab Technician',
        role: 'lab_technician',
        isActive: true,
        profileData: {
          fullName: 'Test Lab Technician',
          specialization: 'Clinical Laboratory Science'
        }
      });
      
      console.log(`✅ Created lab technician: ${testTechnician.email}`);
      console.log(`   Wallet: ${testTechnician.walletAddress}`);
      
      labTechnicians.push(testTechnician);
    } else {
      console.log(`✅ Found ${labTechnicians.length} lab technicians:`);
      labTechnicians.forEach((tech, index) => {
        console.log(`   ${index + 1}. ${tech.name || tech.email} (${tech.role})`);
        console.log(`      Wallet: ${tech.walletAddress}`);
      });
    }

    // Step 3: Test API with different roles
    console.log('\n🧪 Step 3: Testing API access with different roles...');
    
    const testCases = [
      { role: 'lab_technician', wallet: labTechnicians[0]?.walletAddress },
      { role: 'technician', wallet: labTechnicians[0]?.walletAddress },
      { role: 'admin', wallet: '0xadmin123456789012345678901234567890123456' },
      { role: 'doctor', wallet: '0xdoctor12345678901234567890123456789012345' }
    ];

    for (const testCase of testCases) {
      if (!testCase.wallet) continue;
      
      console.log(`\n   Testing role: ${testCase.role}`);
      try {
        const response = await axios.get(`${API_BASE}/api/lab/technician/dashboard`, {
          headers: {
            'x-user-role': testCase.role,
            'x-wallet-address': testCase.wallet
          }
        });

        if (response.status === 200) {
          console.log(`   ✅ ${testCase.role}: SUCCESS`);
        }
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ ${testCase.role}: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
        } else {
          console.log(`   ❌ ${testCase.role}: Network error`);
        }
      }
    }

    // Step 4: Check what the frontend is actually sending
    console.log('\n🔍 Step 4: Checking frontend authentication...');
    
    // Test with common role variations
    const roleVariations = [
      'lab_technician',
      'technician', 
      'labTechnician',
      'lab-technician',
      'TECHNICIAN',
      'LAB_TECHNICIAN'
    ];

    console.log('   Testing role variations:');
    for (const role of roleVariations) {
      try {
        const response = await axios.get(`${API_BASE}/api/lab/technician/dashboard`, {
          headers: {
            'x-user-role': role,
            'x-wallet-address': labTechnicians[0]?.walletAddress || '0xtest123'
          }
        });

        if (response.status === 200) {
          console.log(`   ✅ "${role}": WORKS`);
        }
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`   ❌ "${role}": 403 Forbidden`);
        } else if (error.response) {
          console.log(`   ⚠️  "${role}": ${error.response.status}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging lab technician access:', error);
  } finally {
    await db.sequelize.close();
  }

  console.log('\n📝 Recommendations:');
  console.log('1. Ensure users have role "lab_technician" (exact match)');
  console.log('2. Check frontend is sending correct x-user-role header');
  console.log('3. Verify authentication context is working properly');
}

// Run the debug
debugLabTechnician403().catch(console.error);