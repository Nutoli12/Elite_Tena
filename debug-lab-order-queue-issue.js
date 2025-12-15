/**
 * Debug Lab Order Queue Issue
 * Check why doctor-assigned orders are not appearing in technician queue
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

// Test users
const testUsers = {
  doctor: {
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'doctor',
    name: 'Dr. Test Doctor'
  },
  patient: {
    walletAddress: '0x2345678901234567890123456789012345678901',
    role: 'patient',
    name: 'Test Patient'
  },
  technician: {
    walletAddress: '0x3456789012345678901234567890123456789012',
    role: 'lab_technician',
    name: 'Test Technician'
  }
};

async function debugLabOrderQueue() {
  console.log('🔍 Debugging Lab Order Queue Issue...\n');

  try {
    // Step 1: Check if there are any lab orders in the database
    console.log('📋 Step 1: Checking all lab orders in database...');
    const allOrdersResponse = await axios.get(`${API_BASE_URL}/api/lab/orders`, {
      headers: {
        'x-wallet-address': testUsers.technician.walletAddress,
        'x-user-role': 'admin' // Use admin to see all orders
      }
    });

    if (allOrdersResponse.data.success) {
      const allOrders = allOrdersResponse.data.data.labOrders || [];
      console.log(`✅ Found ${allOrders.length} total lab orders in database`);
      
      if (allOrders.length > 0) {
        console.log('\n📊 Order Status Breakdown:');
        const statusCounts = {};
        allOrders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count} orders`);
        });

        console.log('\n📝 Recent Orders:');
        allOrders.slice(0, 5).forEach((order, index) => {
          console.log(`   ${index + 1}. Order #${order.orderNumber}`);
          console.log(`      Status: ${order.status}`);
          console.log(`      Priority: ${order.priority}`);
          console.log(`      Patient: ${order.patient?.firstName || 'Unknown'} ${order.patient?.lastName || ''}`);
          console.log(`      Doctor: ${order.doctor?.firstName || 'Unknown'} ${order.doctor?.lastName || ''}`);
          console.log(`      Created: ${new Date(order.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Failed to fetch lab orders');
    }

    // Step 2: Check technician dashboard data
    console.log('🔬 Step 2: Checking technician dashboard data...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/dashboard`, {
      headers: {
        'x-wallet-address': testUsers.technician.walletAddress,
        'x-user-role': testUsers.technician.role
      }
    });

    if (dashboardResponse.data.success) {
      const dashboardData = dashboardResponse.data.data;
      console.log('✅ Technician dashboard data loaded');
      console.log(`   Pending orders: ${dashboardData.workQueue?.pendingCount || 0}`);
      console.log(`   Processing orders: ${dashboardData.workQueue?.processingCount || 0}`);
      
      if (dashboardData.workQueue?.pendingOrders) {
        console.log(`   Pending orders details: ${dashboardData.workQueue.pendingOrders.length} orders`);
        dashboardData.workQueue.pendingOrders.forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.orderNumber} - ${order.status}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch technician dashboard data');
    }

    // Step 3: Check technician queue endpoint
    console.log('\n📥 Step 3: Checking technician queue endpoint...');
    const queueResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/queue`, {
      headers: {
        'x-wallet-address': testUsers.technician.walletAddress,
        'x-user-role': testUsers.technician.role
      }
    });

    if (queueResponse.data.success) {
      const queueData = queueResponse.data.data;
      console.log(`✅ Queue endpoint returned ${queueData.orders?.length || 0} orders`);
      
      if (queueData.orders && queueData.orders.length > 0) {
        console.log('   Queue orders:');
        queueData.orders.forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.orderNumber} - Status: ${order.status}`);
        });
      } else {
        console.log('   ⚠️  No orders in technician queue');
      }
    } else {
      console.log('❌ Failed to fetch technician queue');
    }

    // Step 4: Check orders with specific status filters
    console.log('\n🔍 Step 4: Checking orders by status...');
    
    const statusesToCheck = ['pending', 'collected', 'processing'];
    
    for (const status of statusesToCheck) {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/lab/orders?status=${status}`, {
        headers: {
          'x-wallet-address': testUsers.technician.walletAddress,
          'x-user-role': testUsers.technician.role
        }
      });

      if (statusResponse.data.success) {
        const orders = statusResponse.data.data.labOrders || [];
        console.log(`   ${status.toUpperCase()}: ${orders.length} orders`);
        
        if (orders.length > 0) {
          orders.slice(0, 3).forEach(order => {
            console.log(`     - ${order.orderNumber} (${order.priority})`);
          });
        }
      }
    }

    // Step 5: Create a test order to see if it appears
    console.log('\n🧪 Step 5: Creating a test lab order...');
    const testOrderResponse = await axios.post(`${API_BASE_URL}/api/lab/orders`, {
      patientWalletAddress: testUsers.patient.walletAddress,
      testCodes: ['GLUCOSE', 'CBC'],
      priority: 'urgent',
      sampleType: 'blood',
      specialInstructions: 'Test order for debugging queue issue'
    }, {
      headers: {
        'x-wallet-address': testUsers.doctor.walletAddress,
        'x-user-role': testUsers.doctor.role
      }
    });

    if (testOrderResponse.data.success) {
      const newOrder = testOrderResponse.data.data.labOrder;
      console.log(`✅ Test order created: ${newOrder.orderNumber}`);
      console.log(`   Status: ${newOrder.status}`);
      console.log(`   Priority: ${newOrder.priority}`);

      // Wait a moment then check if it appears in queue
      console.log('\n⏳ Waiting 2 seconds then checking queue again...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedQueueResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/queue`, {
        headers: {
          'x-wallet-address': testUsers.technician.walletAddress,
          'x-user-role': testUsers.technician.role
        }
      });

      if (updatedQueueResponse.data.success) {
        const updatedQueue = updatedQueueResponse.data.data;
        console.log(`📥 Updated queue has ${updatedQueue.orders?.length || 0} orders`);
        
        const newOrderInQueue = updatedQueue.orders?.find(o => o.orderNumber === newOrder.orderNumber);
        if (newOrderInQueue) {
          console.log(`✅ New test order found in queue!`);
        } else {
          console.log(`❌ New test order NOT found in queue`);
          console.log(`   Expected order: ${newOrder.orderNumber}`);
          console.log(`   Queue orders: ${updatedQueue.orders?.map(o => o.orderNumber).join(', ') || 'none'}`);
        }
      }
    } else {
      console.log('❌ Failed to create test order');
    }

    console.log('\n🔍 Debug Summary:');
    console.log('1. Check total orders in database');
    console.log('2. Check technician dashboard data');
    console.log('3. Check technician queue endpoint');
    console.log('4. Check orders by status');
    console.log('5. Create test order and verify it appears');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response?.data) {
      console.error('   Server response:', error.response.data);
    }
  }
}

// Run the debug
debugLabOrderQueue();