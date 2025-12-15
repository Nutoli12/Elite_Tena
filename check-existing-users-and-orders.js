/**
 * Check Existing Users and Orders
 * See what users and orders exist in the database
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

async function checkExistingUsersAndOrders() {
  console.log('🔍 Checking Existing Users and Orders...\n');

  try {
    // Step 1: Try to get all lab orders to see what exists
    console.log('📋 Step 1: Checking existing lab orders...');
    
    // Try with different user roles to see what we can access
    const testWallets = [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012',
      '0x4567890123456789012345678901234567890123',
      '0x5678901234567890123456789012345678901234'
    ];

    for (const wallet of testWallets) {
      console.log(`\n🔍 Testing wallet: ${wallet.slice(0, 10)}...${wallet.slice(-6)}`);
      
      // Try as different roles
      const roles = ['admin', 'doctor', 'lab_technician', 'patient'];
      
      for (const role of roles) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/lab/orders`, {
            headers: {
              'x-wallet-address': wallet,
              'x-user-role': role
            }
          });

          if (response.data.success) {
            const orders = response.data.data.labOrders || [];
            console.log(`   ✅ ${role}: ${orders.length} orders accessible`);
            
            if (orders.length > 0) {
              console.log(`      Recent orders:`);
              orders.slice(0, 3).forEach((order, index) => {
                console.log(`        ${index + 1}. ${order.orderNumber} - ${order.status}`);
                console.log(`           Patient: ${order.patient?.name || order.patient?.firstName || 'Unknown'}`);
                console.log(`           Doctor: ${order.doctor?.name || order.doctor?.firstName || 'Unknown'}`);
              });
            }
            
            // If we found a working doctor, try to create an order
            if (role === 'doctor' && orders.length >= 0) {
              console.log(`\n   🧪 Trying to create order as this doctor...`);
              try {
                const createResponse = await axios.post(`${API_BASE_URL}/api/lab/orders`, {
                  patientWalletAddress: wallet, // Use same wallet as patient for testing
                  testCodes: ['GLUCOSE', 'CBC'],
                  priority: 'urgent',
                  sampleType: 'blood',
                  specialInstructions: 'Test order to check queue display'
                }, {
                  headers: {
                    'x-wallet-address': wallet,
                    'x-user-role': role
                  }
                });

                if (createResponse.data.success) {
                  const newOrder = createResponse.data.data.labOrder;
                  console.log(`   ✅ Order created: ${newOrder.orderNumber}`);
                  
                  // Now check if it appears in technician queue
                  console.log(`\n   📥 Checking if order appears in technician queue...`);
                  const queueResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/queue`, {
                    headers: {
                      'x-wallet-address': wallet,
                      'x-user-role': 'lab_technician'
                    }
                  });

                  if (queueResponse.data.success) {
                    const queueOrders = queueResponse.data.data.orders || [];
                    console.log(`   📊 Queue has ${queueOrders.length} orders`);
                    
                    const foundOrder = queueOrders.find(o => o.orderNumber === newOrder.orderNumber);
                    if (foundOrder) {
                      console.log(`   ✅ NEW ORDER FOUND IN QUEUE!`);
                      console.log(`      Order: ${foundOrder.orderNumber}`);
                      console.log(`      Status: ${foundOrder.status}`);
                      console.log(`      Patient: ${foundOrder.patient?.name || 'Unknown'}`);
                      console.log(`      Doctor: ${foundOrder.doctor?.name || 'Unknown'}`);
                    } else {
                      console.log(`   ❌ Order not found in queue`);
                      console.log(`      Expected: ${newOrder.orderNumber}`);
                      console.log(`      Queue orders: ${queueOrders.map(o => o.orderNumber).join(', ')}`);
                    }
                  }
                  
                  return; // Exit after successful test
                }
              } catch (createError) {
                console.log(`   ❌ Failed to create order: ${createError.response?.data?.message || createError.message}`);
              }
            }
          }
        } catch (error) {
          console.log(`   ❌ ${role}: ${error.response?.data?.message || error.message}`);
        }
      }
    }

    // Step 2: Check what's in the technician queue directly
    console.log(`\n🔬 Step 2: Direct technician queue check...`);
    
    for (const wallet of testWallets) {
      try {
        const queueResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/queue`, {
          headers: {
            'x-wallet-address': wallet,
            'x-user-role': 'lab_technician'
          }
        });

        if (queueResponse.data.success) {
          const orders = queueResponse.data.data.orders || [];
          console.log(`✅ Technician queue (${wallet.slice(-6)}): ${orders.length} orders`);
          
          if (orders.length > 0) {
            orders.forEach((order, index) => {
              console.log(`   ${index + 1}. ${order.orderNumber} - ${order.status} - ${order.priority}`);
              console.log(`      Patient: ${order.patient?.name || 'Unknown'}`);
              console.log(`      Doctor: ${order.doctor?.name || 'Unknown'}`);
            });
          }
          break; // Found working technician
        }
      } catch (error) {
        // Continue to next wallet
      }
    }

    // Step 3: Check technician dashboard
    console.log(`\n📊 Step 3: Direct technician dashboard check...`);
    
    for (const wallet of testWallets) {
      try {
        const dashboardResponse = await axios.get(`${API_BASE_URL}/api/lab/technician/dashboard`, {
          headers: {
            'x-wallet-address': wallet,
            'x-user-role': 'lab_technician'
          }
        });

        if (dashboardResponse.data.success) {
          const dashboard = dashboardResponse.data.data;
          console.log(`✅ Technician dashboard (${wallet.slice(-6)}):`);
          console.log(`   Pending orders: ${dashboard.workQueue?.pendingCount || 0}`);
          console.log(`   Processing orders: ${dashboard.workQueue?.processingCount || 0}`);
          
          if (dashboard.workQueue?.pendingOrders?.length > 0) {
            console.log(`   Pending order details:`);
            dashboard.workQueue.pendingOrders.forEach((order, index) => {
              console.log(`     ${index + 1}. ${order.orderNumber} - ${order.status}`);
            });
          }
          break; // Found working technician
        }
      } catch (error) {
        // Continue to next wallet
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkExistingUsersAndOrders();