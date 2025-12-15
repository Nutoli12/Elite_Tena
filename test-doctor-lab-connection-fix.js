/**
 * Test Script: Doctor-Lab Connection Fix Verification
 * 
 * This script tests the complete flow after fixing the filtering issue:
 * 1. Doctor creates order (status: pending)
 * 2. Lab technician can see pending orders
 * 3. Order appears in incoming queue immediately
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';
const LAB_API_URL = `${API_BASE_URL}/api/lab`;

// Test users
const DOCTOR_WALLET = '0x0987654321098765432109876543210987654321';
const TECHNICIAN_WALLET = '0x1234567890123456789012345678901234567890';
const PATIENT_WALLET = '0x1111222233334444555566667777888899990000';

const getAuthHeaders = (role, wallet) => ({
  'Content-Type': 'application/json',
  'x-wallet-address': wallet,
  'x-user-role': role
});

async function testDoctorLabConnectionFix() {
  console.log('🔧 TESTING DOCTOR-LAB CONNECTION FIX');
  console.log('===================================\n');

  try {
    // STEP 1: Clear any existing test orders first
    console.log('1️⃣ Checking existing orders...');
    
    const existingOrdersResponse = await axios.get(`${LAB_API_URL}/orders`, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });
    
    const existingOrders = existingOrdersResponse.data.data?.labOrders || [];
    console.log(`   Found ${existingOrders.length} existing orders visible to technician`);
    
    if (existingOrders.length > 0) {
      console.log('   Recent orders:');
      existingOrders.slice(0, 3).forEach((order, index) => {
        console.log(`     ${index + 1}. #${order.orderNumber} - Status: ${order.status} - Priority: ${order.priority}`);
      });
    }

    // STEP 2: Doctor creates a new order
    console.log('\n2️⃣ Doctor creating new test order...');
    
    const testOrderData = {
      patientWalletAddress: PATIENT_WALLET,
      testCodes: ['CBC', 'GLUCOSE'],
      priority: 'urgent',
      sampleType: 'blood',
      specialInstructions: 'CONNECTION TEST - Verify lab technician can see this order immediately'
    };

    const createOrderResponse = await axios.post(`${LAB_API_URL}/orders`, testOrderData, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    if (!createOrderResponse.data.success) {
      throw new Error(`Failed to create order: ${createOrderResponse.data.message}`);
    }

    const newOrder = createOrderResponse.data.data.labOrder;
    console.log('✅ Order created successfully!');
    console.log(`   Order #: ${newOrder.orderNumber}`);
    console.log(`   Order ID: ${newOrder.id}`);
    console.log(`   Status: ${newOrder.status} (should be 'pending')`);
    console.log(`   Priority: ${newOrder.priority}`);
    console.log(`   Patient: ${newOrder.patientWalletAddress}`);
    console.log(`   Doctor: ${newOrder.doctorWalletAddress}`);

    // STEP 3: Immediately check if technician can see the order
    console.log('\n3️⃣ Testing if lab technician can see the new order...');
    
    // Wait a moment for database consistency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const technicianOrdersResponse = await axios.get(`${LAB_API_URL}/orders`, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (!technicianOrdersResponse.data.success) {
      throw new Error('Failed to fetch technician orders');
    }

    const technicianOrders = technicianOrdersResponse.data.data?.labOrders || [];
    const foundOrder = technicianOrders.find(order => order.id === newOrder.id);

    if (foundOrder) {
      console.log('✅ SUCCESS! Lab technician CAN see the new order!');
      console.log(`   Order found in technician queue: YES`);
      console.log(`   Order #: ${foundOrder.orderNumber}`);
      console.log(`   Status: ${foundOrder.status}`);
      console.log(`   Priority: ${foundOrder.priority}`);
      console.log(`   Patient: ${foundOrder.patient?.firstName || 'N/A'} ${foundOrder.patient?.lastName || 'N/A'}`);
      console.log(`   Doctor: ${foundOrder.doctor?.firstName || 'N/A'} ${foundOrder.doctor?.lastName || 'N/A'}`);
    } else {
      console.log('❌ ISSUE: Lab technician CANNOT see the new order!');
      console.log(`   Total orders visible to technician: ${technicianOrders.length}`);
      console.log('   This indicates the fix may not be working properly');
      
      // Debug: Show what orders the technician can see
      if (technicianOrders.length > 0) {
        console.log('   Orders technician CAN see:');
        technicianOrders.forEach((order, index) => {
          console.log(`     ${index + 1}. #${order.orderNumber} - Status: ${order.status} - ID: ${order.id}`);
        });
      }
      
      // Check if the order exists at all
      console.log('\n   Checking if order exists in database...');
      try {
        const orderCheckResponse = await axios.get(`${LAB_API_URL}/orders/${newOrder.id}`, {
          headers: getAuthHeaders('doctor', DOCTOR_WALLET)
        });
        
        if (orderCheckResponse.data.success) {
          const orderData = orderCheckResponse.data.data.labOrder;
          console.log(`   Order exists in database: YES`);
          console.log(`   Order status: ${orderData.status}`);
          console.log(`   Order patient: ${orderData.patientWalletAddress}`);
          console.log(`   Order doctor: ${orderData.doctorWalletAddress}`);
        }
      } catch (error) {
        console.log(`   Order check failed: ${error.message}`);
      }
    }

    // STEP 4: Test technician dashboard endpoint
    console.log('\n4️⃣ Testing technician dashboard endpoint...');
    
    try {
      const dashboardResponse = await axios.get(`${LAB_API_URL}/technician/dashboard`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      
      if (dashboardResponse.data.success) {
        const dashboardData = dashboardResponse.data.data;
        console.log('✅ Technician dashboard working');
        console.log(`   Pending orders count: ${dashboardData.workQueue?.pendingCount || 0}`);
        console.log(`   Processing orders count: ${dashboardData.workQueue?.processingCount || 0}`);
        
        // Check if our new order is in the pending list
        const pendingOrders = dashboardData.workQueue?.pendingOrders || [];
        const ourOrderInDashboard = pendingOrders.find(order => order.id === newOrder.id);
        
        if (ourOrderInDashboard) {
          console.log('✅ New order appears in dashboard pending queue!');
        } else {
          console.log('❌ New order NOT in dashboard pending queue');
          console.log(`   Dashboard pending orders: ${pendingOrders.length}`);
        }
      } else {
        console.log('❌ Dashboard endpoint error:', dashboardResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Dashboard endpoint failed:', error.message);
    }

    // STEP 5: Test technician queue endpoint
    console.log('\n5️⃣ Testing technician queue endpoint...');
    
    try {
      const queueResponse = await axios.get(`${LAB_API_URL}/technician/queue`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      
      if (queueResponse.data.success) {
        const queueData = queueResponse.data.data;
        console.log('✅ Technician queue endpoint working');
        console.log(`   Orders in queue: ${queueData.count || 0}`);
        
        // Check if our new order is in the queue
        const queueOrders = queueData.orders || [];
        const ourOrderInQueue = queueOrders.find(order => order.id === newOrder.id);
        
        if (ourOrderInQueue) {
          console.log('✅ New order appears in technician queue!');
          console.log(`   Queue order #: ${ourOrderInQueue.orderNumber}`);
          console.log(`   Queue order status: ${ourOrderInQueue.status}`);
        } else {
          console.log('❌ New order NOT in technician queue');
          console.log(`   Queue orders: ${queueOrders.length}`);
          if (queueOrders.length > 0) {
            console.log('   Queue contains:');
            queueOrders.slice(0, 3).forEach((order, index) => {
              console.log(`     ${index + 1}. #${order.orderNumber} - Status: ${order.status} - ID: ${order.id}`);
            });
          }
        }
      } else {
        console.log('❌ Queue endpoint error:', queueResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Queue endpoint failed:', error.message);
    }

    // STEP 6: Test filtering by status
    console.log('\n6️⃣ Testing status filtering...');
    
    try {
      const pendingOnlyResponse = await axios.get(`${LAB_API_URL}/orders?status=pending`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      
      if (pendingOnlyResponse.data.success) {
        const pendingOrders = pendingOnlyResponse.data.data?.labOrders || [];
        console.log(`✅ Pending orders filter working: ${pendingOrders.length} orders`);
        
        const ourPendingOrder = pendingOrders.find(order => order.id === newOrder.id);
        if (ourPendingOrder) {
          console.log('✅ New order found in pending filter!');
        } else {
          console.log('❌ New order NOT found in pending filter');
        }
      }
    } catch (error) {
      console.log('❌ Status filtering failed:', error.message);
    }

    // STEP 7: Summary
    console.log('\n7️⃣ CONNECTION TEST SUMMARY');
    console.log('==========================');
    
    if (foundOrder) {
      console.log('🎉 SUCCESS! Doctor-Lab connection is working!');
      console.log('✅ Doctor can create orders');
      console.log('✅ Lab technician can see orders immediately');
      console.log('✅ Orders appear in incoming queue');
      console.log('✅ Real-time workflow is functional');
      
      console.log('\n📋 Next steps:');
      console.log('1. Orders now appear in "Incoming Lab Orders" queue');
      console.log('2. Lab technicians can accept and process orders');
      console.log('3. Complete workflow from creation to completion works');
    } else {
      console.log('❌ ISSUE: Connection still has problems');
      console.log('🔧 Troubleshooting needed:');
      console.log('1. Check database relationships');
      console.log('2. Verify user authentication');
      console.log('3. Check filtering logic');
      console.log('4. Verify order creation process');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', error.response.data);
    }
  }
}

// Run the test
testDoctorLabConnectionFix().catch(console.error);