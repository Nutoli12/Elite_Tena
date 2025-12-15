/**
 * Debug Script: Doctor-Lab Connection
 * 
 * This script will thoroughly test the connection between:
 * 1. Doctor creating orders
 * 2. Lab technician receiving orders
 * 3. Backend API endpoints
 * 4. Database storage and retrieval
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

async function debugDoctorLabConnection() {
  console.log('🔍 DEBUGGING DOCTOR-LAB CONNECTION');
  console.log('===================================\n');

  try {
    // STEP 1: Test basic API connectivity
    console.log('1️⃣ Testing basic API connectivity...');
    
    try {
      const healthCheck = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server connectivity issue:', error.message);
      return;
    }

    // STEP 2: Test lab API endpoints
    console.log('\n2️⃣ Testing lab API endpoints...');
    
    try {
      const catalogResponse = await axios.get(`${LAB_API_URL}/catalog`);
      console.log('✅ Lab catalog endpoint working');
      console.log(`   Available tests: ${catalogResponse.data.data?.tests?.length || 0}`);
    } catch (error) {
      console.log('❌ Lab catalog endpoint failed:', error.message);
      if (error.response?.data) {
        console.log('   Error details:', error.response.data);
      }
    }

    // STEP 3: Test doctor authentication
    console.log('\n3️⃣ Testing doctor authentication...');
    
    try {
      const doctorTestResponse = await axios.get(`${LAB_API_URL}/orders`, {
        headers: getAuthHeaders('doctor', DOCTOR_WALLET)
      });
      console.log('✅ Doctor authentication working');
      console.log(`   Doctor can access orders endpoint`);
    } catch (error) {
      console.log('❌ Doctor authentication failed:', error.message);
      if (error.response?.data) {
        console.log('   Error details:', error.response.data);
      }
    }

    // STEP 4: Test lab technician authentication
    console.log('\n4️⃣ Testing lab technician authentication...');
    
    try {
      const technicianTestResponse = await axios.get(`${LAB_API_URL}/orders`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      console.log('✅ Lab technician authentication working');
      console.log(`   Technician can access orders endpoint`);
    } catch (error) {
      console.log('❌ Lab technician authentication failed:', error.message);
      if (error.response?.data) {
        console.log('   Error details:', error.response.data);
      }
    }

    // STEP 5: Check existing orders in database
    console.log('\n5️⃣ Checking existing orders in database...');
    
    try {
      const allOrdersResponse = await axios.get(`${LAB_API_URL}/orders`, {
        headers: getAuthHeaders('admin', DOCTOR_WALLET) // Use admin role to see all
      });
      
      const allOrders = allOrdersResponse.data.data?.labOrders || [];
      console.log(`✅ Found ${allOrders.length} total orders in database`);
      
      if (allOrders.length > 0) {
        console.log('   Recent orders:');
        allOrders.slice(0, 3).forEach((order, index) => {
          console.log(`     ${index + 1}. #${order.orderNumber} - ${order.status} - ${order.priority} - ${order.testCodes?.join(', ')}`);
          console.log(`        Patient: ${order.patientWalletAddress}`);
          console.log(`        Doctor: ${order.doctorWalletAddress}`);
          console.log(`        Created: ${order.createdAt}`);
        });
      }
    } catch (error) {
      console.log('❌ Failed to check existing orders:', error.message);
    }

    // STEP 6: Test doctor creating a new order
    console.log('\n6️⃣ Testing doctor creating new order...');
    
    const testOrderData = {
      patientWalletAddress: PATIENT_WALLET,
      testCodes: ['CBC', 'GLUCOSE'],
      priority: 'urgent',
      sampleType: 'blood',
      specialInstructions: 'DEBUG TEST ORDER - Please process immediately'
    };

    try {
      const createOrderResponse = await axios.post(`${LAB_API_URL}/orders`, testOrderData, {
        headers: getAuthHeaders('doctor', DOCTOR_WALLET)
      });
      
      if (createOrderResponse.data.success) {
        const newOrder = createOrderResponse.data.data.labOrder;
        console.log('✅ Doctor successfully created order');
        console.log(`   Order #: ${newOrder.orderNumber}`);
        console.log(`   Order ID: ${newOrder.id}`);
        console.log(`   Status: ${newOrder.status}`);
        console.log(`   Patient: ${newOrder.patientWalletAddress}`);
        console.log(`   Doctor: ${newOrder.doctorWalletAddress}`);
        
        // STEP 7: Immediately check if lab technician can see this order
        console.log('\n7️⃣ Testing if lab technician can see the new order...');
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const technicianOrdersResponse = await axios.get(`${LAB_API_URL}/orders`, {
          params: { status: 'pending' },
          headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
        });
        
        const technicianOrders = technicianOrdersResponse.data.data?.labOrders || [];
        const foundOrder = technicianOrders.find(order => order.id === newOrder.id);
        
        if (foundOrder) {
          console.log('✅ Lab technician CAN see the new order!');
          console.log(`   Order visible in technician queue: YES`);
          console.log(`   Order #: ${foundOrder.orderNumber}`);
          console.log(`   Status: ${foundOrder.status}`);
          console.log(`   Patient info: ${foundOrder.patient?.firstName || 'N/A'} ${foundOrder.patient?.lastName || 'N/A'}`);
          console.log(`   Doctor info: ${foundOrder.doctor?.firstName || 'N/A'} ${foundOrder.doctor?.lastName || 'N/A'}`);
        } else {
          console.log('❌ Lab technician CANNOT see the new order!');
          console.log(`   Total orders visible to technician: ${technicianOrders.length}`);
          console.log('   This indicates a filtering or permission issue');
          
          // Debug: Check what orders the technician can see
          if (technicianOrders.length > 0) {
            console.log('   Orders technician CAN see:');
            technicianOrders.forEach((order, index) => {
              console.log(`     ${index + 1}. #${order.orderNumber} - ${order.status} - Doctor: ${order.doctorWalletAddress}`);
            });
          }
        }
        
        // STEP 8: Test technician dashboard endpoint
        console.log('\n8️⃣ Testing technician dashboard endpoint...');
        
        try {
          const dashboardResponse = await axios.get(`${LAB_API_URL}/technician/dashboard`, {
            headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
          });
          
          if (dashboardResponse.data.success) {
            const dashboardData = dashboardResponse.data.data;
            console.log('✅ Technician dashboard endpoint working');
            console.log(`   Pending orders count: ${dashboardData.workQueue?.pendingCount || 0}`);
            console.log(`   Processing orders count: ${dashboardData.workQueue?.processingCount || 0}`);
            console.log(`   Completed today: ${dashboardData.statistics?.completedToday || 0}`);
            
            if (dashboardData.workQueue?.pendingOrders) {
              console.log(`   Pending orders in dashboard: ${dashboardData.workQueue.pendingOrders.length}`);
            }
          } else {
            console.log('❌ Technician dashboard returned error:', dashboardResponse.data.message);
          }
        } catch (error) {
          console.log('❌ Technician dashboard endpoint failed:', error.message);
          if (error.response?.data) {
            console.log('   Error details:', error.response.data);
          }
        }
        
        // STEP 9: Test technician queue endpoint
        console.log('\n9️⃣ Testing technician queue endpoint...');
        
        try {
          const queueResponse = await axios.get(`${LAB_API_URL}/technician/queue`, {
            headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
          });
          
          if (queueResponse.data.success) {
            const queueData = queueResponse.data.data;
            console.log('✅ Technician queue endpoint working');
            console.log(`   Orders in queue: ${queueData.count || 0}`);
            
            if (queueData.orders && queueData.orders.length > 0) {
              console.log('   Queue orders:');
              queueData.orders.slice(0, 3).forEach((order, index) => {
                console.log(`     ${index + 1}. #${order.orderNumber} - ${order.status} - ${order.priority}`);
              });
            }
          } else {
            console.log('❌ Technician queue returned error:', queueResponse.data.message);
          }
        } catch (error) {
          console.log('❌ Technician queue endpoint failed:', error.message);
          if (error.response?.data) {
            console.log('   Error details:', error.response.data);
          }
        }
        
      } else {
        console.log('❌ Doctor failed to create order:', createOrderResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Doctor order creation failed:', error.message);
      if (error.response?.data) {
        console.log('   Error details:', error.response.data);
      }
    }

    // STEP 10: Check database models and relationships
    console.log('\n🔟 Summary of findings...');
    console.log('========================');
    
    console.log('✅ Completed connection debugging');
    console.log('📋 Check the results above to identify the issue');
    console.log('🔧 Common issues to look for:');
    console.log('   - Authentication headers not being sent correctly');
    console.log('   - Database relationships not properly set up');
    console.log('   - Filtering logic excluding orders');
    console.log('   - User role permissions blocking access');
    console.log('   - Missing patient/doctor information in orders');

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', error.response.data);
    }
  }
}

// Run the debug
debugDoctorLabConnection().catch(console.error);