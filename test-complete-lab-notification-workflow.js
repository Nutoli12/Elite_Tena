#!/usr/bin/env node

/**
 * Test Complete Lab Notification Workflow
 * Tests the entire flow from doctor creating order to lab technician receiving notification
 */

import axios from 'axios';
import db from './server/src/models/index.js';

const { User, LabWorkflowOrder, Notification } = db;
const API_BASE = 'http://localhost:3003';

async function testCompleteLabNotificationWorkflow() {
  console.log('🧪 Testing Complete Lab Notification Workflow...\n');

  try {
    // Step 1: Get a real doctor and patient
    console.log('1. Setting up test users...');
    
    const doctor = await User.findOne({
      where: { role: 'doctor' },
      attributes: ['walletAddress', 'name', 'email']
    });

    const patient = await User.findOne({
      where: { role: 'patient' },
      attributes: ['walletAddress', 'name', 'email']
    });

    const labTechnician = await User.findOne({
      where: { role: 'lab_technician' },
      attributes: ['walletAddress', 'name', 'email']
    });

    if (!doctor || !patient || !labTechnician) {
      console.log('❌ Missing required users:');
      console.log(`   Doctor: ${doctor ? '✅' : '❌'}`);
      console.log(`   Patient: ${patient ? '✅' : '❌'}`);
      console.log(`   Lab Technician: ${labTechnician ? '✅' : '❌'}`);
      return;
    }

    console.log('✅ Test users ready:');
    console.log(`   👨‍⚕️ Doctor: ${doctor.name || doctor.email}`);
    console.log(`   👤 Patient: ${patient.name || patient.email}`);
    console.log(`   🧪 Lab Technician: ${labTechnician.name || labTechnician.email}`);

    // Step 2: Check initial notification count for lab technician
    console.log('\n2. Checking initial notification count...');
    
    const initialNotificationsResponse = await axios.get(`${API_BASE}/api/notifications/unread-count`, {
      headers: {
        'x-user-role': 'lab_technician',
        'x-wallet-address': labTechnician.walletAddress
      }
    });

    const initialCount = initialNotificationsResponse.data.data.unreadCount;
    console.log(`   📧 Initial unread notifications: ${initialCount}`);

    // Step 3: Doctor creates a lab order
    console.log('\n3. Doctor creating lab order...');
    
    const labOrderData = {
      patientWalletAddress: patient.walletAddress,
      testCodes: ['CBC', 'GLU', 'LIPID'],
      priority: 'urgent',
      sampleType: 'Blood',
      specialInstructions: 'Patient is fasting. Please process urgently.',
      collectionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
    };

    const createOrderResponse = await axios.post(`${API_BASE}/api/lab/orders`, labOrderData, {
      headers: {
        'x-user-role': 'doctor',
        'x-wallet-address': doctor.walletAddress,
        'Content-Type': 'application/json'
      }
    });

    if (createOrderResponse.status === 201) {
      const createdOrder = createOrderResponse.data.data.labOrder;
      console.log(`   ✅ Lab order created: ${createdOrder.orderNumber}`);
      console.log(`   📋 Tests: ${createdOrder.testCodes.join(', ')}`);
      console.log(`   ⚡ Priority: ${createdOrder.priority}`);
      console.log(`   📧 Notifications sent: ${createOrderResponse.data.data.notificationsSent ? 'Yes' : 'No'}`);

      // Step 4: Wait a moment for notifications to be processed
      console.log('\n4. Waiting for notifications to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 5: Check if lab technician received notification
      console.log('\n5. Checking lab technician notifications...');
      
      const updatedNotificationsResponse = await axios.get(`${API_BASE}/api/notifications/unread-count`, {
        headers: {
          'x-user-role': 'lab_technician',
          'x-wallet-address': labTechnician.walletAddress
        }
      });

      const updatedCount = updatedNotificationsResponse.data.data.unreadCount;
      const newNotifications = updatedCount - initialCount;
      
      console.log(`   📧 Updated unread notifications: ${updatedCount}`);
      console.log(`   🆕 New notifications: ${newNotifications}`);

      if (newNotifications > 0) {
        console.log('   ✅ Lab technician received notification!');

        // Step 6: Get the actual notifications
        console.log('\n6. Fetching notification details...');
        
        const notificationsResponse = await axios.get(`${API_BASE}/api/notifications?limit=5`, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': labTechnician.walletAddress
          }
        });

        const notifications = notificationsResponse.data.data.notifications;
        const labOrderNotifications = notifications.filter(n => 
          n.type === 'new_lab_order' || n.type === 'urgent_test'
        );

        if (labOrderNotifications.length > 0) {
          const notification = labOrderNotifications[0];
          console.log('   📧 Latest lab notification:');
          console.log(`      Title: ${notification.title}`);
          console.log(`      Type: ${notification.type}`);
          console.log(`      Priority: ${notification.priority}`);
          console.log(`      Created: ${new Date(notification.createdAt).toLocaleString()}`);
          console.log(`      Message Preview: ${notification.message.substring(0, 100)}...`);

          if (notification.data) {
            console.log(`      Order Number: ${notification.data.orderNumber}`);
            console.log(`      Patient: ${notification.data.patientName}`);
            console.log(`      Doctor: ${notification.data.doctorName}`);
            console.log(`      Tests: ${notification.data.testNames || notification.data.testCodes.join(', ')}`);
          }
        }

        // Step 7: Test lab technician dashboard to see if order appears
        console.log('\n7. Checking lab technician dashboard...');
        
        const dashboardResponse = await axios.get(`${API_BASE}/api/lab/technician/dashboard`, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': labTechnician.walletAddress
          }
        });

        if (dashboardResponse.status === 200) {
          const dashboard = dashboardResponse.data.data;
          console.log('   ✅ Dashboard accessible');
          console.log(`   📊 Pending orders: ${dashboard.workQueue.pendingCount}`);
          console.log(`   📊 Processing orders: ${dashboard.workQueue.processingCount}`);
          console.log(`   📊 Recent activity entries: ${dashboard.recentActivity.length}`);
        }

        // Step 8: Test work queue to see if order appears
        console.log('\n8. Checking technician work queue...');
        
        const queueResponse = await axios.get(`${API_BASE}/api/lab/technician/queue`, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': labTechnician.walletAddress
          }
        });

        if (queueResponse.status === 200) {
          const queue = queueResponse.data.data;
          console.log(`   📋 Orders in queue: ${queue.orders.length}`);
          
          const newOrder = queue.orders.find(order => order.orderNumber === createdOrder.orderNumber);
          if (newOrder) {
            console.log(`   ✅ New order found in work queue: ${newOrder.orderNumber}`);
          } else {
            console.log(`   ⚠️  New order not yet in work queue (may need status update)`);
          }
        }

      } else {
        console.log('   ❌ Lab technician did not receive notification');
        
        // Debug: Check if notifications were created in database
        const dbNotifications = await Notification.findAll({
          where: {
            userId: labTechnician.walletAddress.toLowerCase(),
            type: { [db.Sequelize.Op.in]: ['new_lab_order', 'urgent_test'] }
          },
          order: [['createdAt', 'DESC']],
          limit: 5
        });

        console.log(`   🔍 Debug: Found ${dbNotifications.length} lab notifications in database`);
        if (dbNotifications.length > 0) {
          console.log(`      Latest: ${dbNotifications[0].title} (${dbNotifications[0].createdAt})`);
        }
      }

    } else {
      console.log('   ❌ Failed to create lab order');
      console.log(`      Status: ${createOrderResponse.status}`);
      console.log(`      Response: ${JSON.stringify(createOrderResponse.data)}`);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      console.log(`   Error: ${error.response.data?.error || 'No error details'}`);
    } else {
      console.log('❌ Network error:', error.message);
    }
  } finally {
    await db.sequelize.close();
  }

  console.log('\n🏁 Test completed!');
  console.log('\n📝 Expected Workflow:');
  console.log('1. Doctor creates lab order ✅');
  console.log('2. System sends notification to all lab technicians ✅');
  console.log('3. Lab technician receives real-time notification ✅');
  console.log('4. Order appears in technician work queue ✅');
  console.log('5. Technician can process the order ✅');
}

// Run the test
testCompleteLabNotificationWorkflow().catch(console.error);