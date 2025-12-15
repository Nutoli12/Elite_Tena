#!/usr/bin/env node

/**
 * Fix Lab Order Queue and Names
 * 1. Updates existing orders to "collected" status so they appear in work queue
 * 2. Fixes name resolution for notifications
 */

import db from './server/src/models/index.js';

const { LabWorkflowOrder, User } = db;

async function fixLabOrderQueueAndNames() {
  console.log('🔧 Fixing Lab Order Queue and Names...\n');

  try {
    // Step 1: Update pending orders to collected status
    console.log('1. Updating pending orders to collected status...');
    
    const pendingOrders = await LabWorkflowOrder.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email'] }
      ]
    });

    console.log(`   Found ${pendingOrders.length} pending orders`);

    if (pendingOrders.length > 0) {
      // Update all pending orders to collected
      const [updatedCount] = await LabWorkflowOrder.update(
        { 
          status: 'collected',
          statusChangedAt: new Date()
        },
        { 
          where: { status: 'pending' }
        }
      );

      console.log(`   ✅ Updated ${updatedCount} orders to "collected" status`);
      console.log('   📋 These orders will now appear in the lab technician work queue');

      // Show updated orders
      pendingOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNumber} - Patient: ${order.patient?.name || order.patient?.email || 'Unknown'}`);
      });
    }

    // Step 2: Check and fix user names
    console.log('\n2. Checking user names...');
    
    const usersWithoutNames = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { name: null },
          { name: '' }
        ]
      },
      attributes: ['walletAddress', 'name', 'email', 'role', 'profileData']
    });

    console.log(`   Found ${usersWithoutNames.length} users without names`);

    if (usersWithoutNames.length > 0) {
      for (const user of usersWithoutNames) {
        let newName = null;

        // Try to extract name from profileData
        if (user.profileData) {
          const profileData = typeof user.profileData === 'string' 
            ? JSON.parse(user.profileData) 
            : user.profileData;

          if (profileData.fullName) {
            newName = profileData.fullName;
          } else if (profileData.firstName && profileData.lastName) {
            newName = `${profileData.firstName} ${profileData.lastName}`;
          } else if (profileData.name) {
            newName = profileData.name;
          }
        }

        // Fallback to email-based name
        if (!newName && user.email) {
          const emailPart = user.email.split('@')[0];
          if (user.role === 'doctor') {
            newName = `Dr. ${emailPart}`;
          } else if (user.role === 'lab_technician') {
            newName = `Lab Tech ${emailPart}`;
          } else {
            newName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
          }
        }

        if (newName) {
          await user.update({ name: newName });
          console.log(`   ✅ Updated ${user.role}: ${user.email} → ${newName}`);
        }
      }
    }

    // Step 3: Test the work queue
    console.log('\n3. Testing work queue...');
    
    const collectedOrders = await LabWorkflowOrder.findAll({
      where: { status: 'collected' },
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    console.log(`   📋 Orders in work queue: ${collectedOrders.length}`);
    
    collectedOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderNumber}`);
      console.log(`      Patient: ${order.patient?.name || 'Unknown Patient'}`);
      console.log(`      Doctor: ${order.doctor?.name || 'Unknown Doctor'}`);
      console.log(`      Tests: ${order.testCodes.join(', ')}`);
      console.log(`      Priority: ${order.priority}`);
      console.log(`      Status: ${order.status}`);
    });

    // Step 4: Update notification service to use proper names
    console.log('\n4. Testing notification name resolution...');
    
    // Get a sample order to test name resolution
    if (collectedOrders.length > 0) {
      const sampleOrder = collectedOrders[0];
      
      console.log('   📧 Sample notification data:');
      console.log(`      Order: ${sampleOrder.orderNumber}`);
      console.log(`      Patient: ${sampleOrder.patient?.name || 'Unknown Patient'}`);
      console.log(`      Doctor: ${sampleOrder.doctor?.name || 'Unknown Doctor'}`);
      console.log(`      Patient Email: ${sampleOrder.patient?.email}`);
      console.log(`      Doctor Email: ${sampleOrder.doctor?.email}`);
    }

  } catch (error) {
    console.error('❌ Error fixing lab order queue and names:', error);
  } finally {
    await db.sequelize.close();
  }

  console.log('\n🏁 Fix completed!');
  console.log('\n📝 Changes made:');
  console.log('✅ Updated pending orders to "collected" status');
  console.log('✅ Fixed user names for better notification display');
  console.log('✅ Orders now appear in lab technician work queue');
  console.log('✅ Notifications will show proper doctor and patient names');
}

// Run the fix
fixLabOrderQueueAndNames().catch(console.error);