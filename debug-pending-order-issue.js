/**
 * Debug Pending Order Issue
 * Check why the pending order isn't showing in technician queue
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

async function debugPendingOrderIssue() {
  console.log('🔍 Debugging Pending Order Issue...\n');

  try {
    // Step 1: Get all orders as admin to see the pending one
    console.log('📋 Step 1: Getting all orders as admin...');
    
    const adminResponse = await axios.get(`${API_BASE_URL}/api/lab/orders`, {
      headers: {
        'x-wallet-address': '0x1234567890123456789012345678901234567890',
        'x-user-role': 'admin'
      }
    });

    if (adminResponse.data.success) {
      const orders = adminResponse.data.data.labOrders || [];
      console.log(`✅ Found ${orders.length} total orders`);
      
      // Find the pending order
      const pendingOrders = orders.filter(order => order.status === 'pending');
      console.log(`📋 Pending orders: ${pendingOrders.length}`);
      
      if (pendingOrders.length > 0) {
        const pendingOrder = pendingOrders[0];
        console.log(`\n🔍 Pending Order Details:`);
        console.log(`   Order Number: ${pendingOrder.orderNumber}`);
        console.log(`   Status: ${pendingOrder.status}`);
        console.log(`   Patient: ${pendingOrder.patient?.name || 'Unknown'}`);
        console.log(`   Doctor: ${pendingOrder.doctor?.name || 'Unknown'}`);
        console.log(`   Test Codes: ${pendingOrder.testCodes?.join(', ') || 'None'}`);
        console.log(`   Created: ${pendingOrder.createdAt}`);
        console.log(`   Priority: ${pendingOrder.priority}`);
        
        // Step 2: Check technician queue with different parameters
        console.log(`\n🔬 Step 2: Testing technician queue with different filters...`);
        
        // Test 1: No filters
        try {
          const queueResponse1 = await axios.get(`${API_BASE_URL}/api/lab/technician/queue`, {
            headers: {
              'x-wallet-address': '0x1234567890123456789012345678901234567890',
              'x-user-role': 'lab_technician'
            }
          });
          
          if (queueResponse1.data.success) {
            const queueOrders = queueResponse1.data.data.orders || [];
            console.log(`   ✅ No filters: ${queueOrders.length} orders`);
            
            const foundPending = queueOrders.find(o => o.orderNumber === pendingOrder.orderNumber);
            if (foundPending) {
              console.log(`   ✅ FOUND pending order in queue!`);
            } else {
              console.log(`   ❌ Pending order NOT found in queue`);
              console.log(`   Queue orders: ${queueOrders.map(o => `${o.orderNumber}(${o.status})`).join(', ')}`);
            }
          }
        } catch (error) {
          console.log(`   ❌ No filters failed: ${error.response?.data?.message || error.message}`);
        }
        
        // Test 2: Specific status filter
        try {
          const queueResponse2 = await axios.get(`${API_BASE_URL}/api/lab/technician/queue?status=pending`, {
            headers: {
              'x-wallet-address': '0x1234567890123456789012345678901234567890',
              'x-user-role': 'lab_technician'
            }
          });
          
          if (queueResponse2.data.success) {
            const queueOrders = queueResponse2.data.data.orders || [];
            console.log(`   ✅ Status=pending: ${queueOrders.length} orders`);
            
            if (queueOrders.length > 0) {
              queueOrders.forEach((order, index) => {
                console.log(`     ${index + 1}. ${order.orderNumber} - ${order.status}`);
              });
            }
          }
        } catch (error) {
          console.log(`   ❌ Status=pending failed: ${error.response?.data?.message || error.message}`);
        }
        
        // Test 3: Check if patient/doctor associations are working
        console.log(`\n👥 Step 3: Checking patient/doctor associations...`);
        
        try {
          const orderResponse = await axios.get(`${API_BASE_URL}/api/lab/orders/${pendingOrder.id}`, {
            headers: {
              'x-wallet-address': '0x1234567890123456789012345678901234567890',
              'x-user-role': 'admin'
            }
          });
          
          if (orderResponse.data.success) {
            const fullOrder = orderResponse.data.data.labOrder;
            console.log(`   ✅ Full order details:`);
            console.log(`     Patient wallet: ${fullOrder.patientWalletAddress}`);
            console.log(`     Doctor wallet: ${fullOrder.doctorWalletAddress}`);
            console.log(`     Patient object: ${JSON.stringify(fullOrder.patient, null, 2)}`);
            console.log(`     Doctor object: ${JSON.stringify(fullOrder.doctor, null, 2)}`);
          }
        } catch (error) {
          console.log(`   ❌ Full order fetch failed: ${error.response?.data?.message || error.message}`);
        }
      } else {
        console.log(`❌ No pending orders found`);
      }
      
      // Show all order statuses
      console.log(`\n📊 All order statuses:`);
      const statusCounts = {};
      orders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugPendingOrderIssue();