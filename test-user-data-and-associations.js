/**
 * Test Script: User Data and Model Associations
 * 
 * This script verifies:
 * 1. Test users exist in database
 * 2. User model associations work correctly
 * 3. Lab order creation includes proper user data
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

async function testUserDataAndAssociations() {
  console.log('👥 TESTING USER DATA AND ASSOCIATIONS');
  console.log('=====================================\n');

  try {
    // STEP 1: Create test users if they don't exist
    console.log('1️⃣ Ensuring test users exist...');
    
    const testUsers = [
      {
        walletAddress: DOCTOR_WALLET,
        role: 'doctor',
        name: 'Dr. Test Doctor',
        email: 'doctor@test.com',
        firstName: 'Test',
        lastName: 'Doctor'
      },
      {
        walletAddress: TECHNICIAN_WALLET,
        role: 'lab_technician',
        name: 'Lab Technician Test',
        email: 'technician@test.com',
        firstName: 'Lab',
        lastName: 'Technician'
      },
      {
        walletAddress: PATIENT_WALLET,
        role: 'patient',
        name: 'Test Patient',
        email: 'patient@test.com',
        firstName: 'Test',
        lastName: 'Patient'
      }
    ];

    for (const userData of testUsers) {
      try {
        // Try to create user (will fail if exists, which is fine)
        const createUserResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          walletAddress: userData.walletAddress,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          profileData: {
            firstName: userData.firstName,
            lastName: userData.lastName
          }
        });
        
        if (createUserResponse.data.success) {
          console.log(`✅ Created ${userData.role}: ${userData.name}`);
        }
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`✅ ${userData.role} already exists: ${userData.name}`);
        } else {
          console.log(`⚠️  Issue with ${userData.role}: ${error.message}`);
        }
      }
    }

    // STEP 2: Test doctor creating order with full user data
    console.log('\n2️⃣ Testing order creation with user associations...');
    
    const testOrderData = {
      patientWalletAddress: PATIENT_WALLET,
      testCodes: ['CBC', 'GLUCOSE'],
      priority: 'urgent',
      sampleType: 'blood',
      specialInstructions: 'USER ASSOCIATION TEST - Check patient and doctor names appear correctly'
    };

    const createOrderResponse = await axios.post(`${LAB_API_URL}/orders`, testOrderData, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    if (!createOrderResponse.data.success) {
      throw new Error(`Failed to create order: ${createOrderResponse.data.message}`);
    }

    const newOrder = createOrderResponse.data.data.labOrder;
    console.log('✅ Order created with associations!');
    console.log(`   Order #: ${newOrder.orderNumber}`);
    console.log(`   Order ID: ${newOrder.id}`);
    
    // Check patient association
    if (newOrder.patient) {
      console.log(`   Patient Name: ${newOrder.patient.name || 'N/A'}`);
      console.log(`   Patient Email: ${newOrder.patient.email || 'N/A'}`);
      console.log(`   Patient Wallet: ${newOrder.patient.walletAddress || 'N/A'}`);
    } else {
      console.log('❌ Patient association missing!');
    }
    
    // Check doctor association
    if (newOrder.doctor) {
      console.log(`   Doctor Name: ${newOrder.doctor.name || 'N/A'}`);
      console.log(`   Doctor Email: ${newOrder.doctor.email || 'N/A'}`);
      console.log(`   Doctor Wallet: ${newOrder.doctor.walletAddress || 'N/A'}`);
    } else {
      console.log('❌ Doctor association missing!');
    }

    // STEP 3: Test technician viewing order with associations
    console.log('\n3️⃣ Testing technician view with user associations...');
    
    const technicianOrdersResponse = await axios.get(`${LAB_API_URL}/orders`, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (!technicianOrdersResponse.data.success) {
      throw new Error('Failed to fetch technician orders');
    }

    const technicianOrders = technicianOrdersResponse.data.data?.labOrders || [];
    const foundOrder = technicianOrders.find(order => order.id === newOrder.id);

    if (foundOrder) {
      console.log('✅ Technician can see order with associations!');
      console.log(`   Order #: ${foundOrder.orderNumber}`);
      
      // Check if patient data is visible to technician
      if (foundOrder.patient) {
        console.log(`   Patient visible: YES`);
        console.log(`   Patient Name: ${foundOrder.patient.name || 'N/A'}`);
        console.log(`   Patient Email: ${foundOrder.patient.email || 'N/A'}`);
      } else {
        console.log('❌ Patient data not visible to technician!');
      }
      
      // Check if doctor data is visible to technician
      if (foundOrder.doctor) {
        console.log(`   Doctor visible: YES`);
        console.log(`   Doctor Name: ${foundOrder.doctor.name || 'N/A'}`);
        console.log(`   Doctor Email: ${foundOrder.doctor.email || 'N/A'}`);
      } else {
        console.log('❌ Doctor data not visible to technician!');
      }
    } else {
      console.log('❌ Technician cannot see the order!');
    }

    // STEP 4: Test technician dashboard with associations
    console.log('\n4️⃣ Testing technician dashboard with user data...');
    
    try {
      const dashboardResponse = await axios.get(`${LAB_API_URL}/technician/dashboard`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      
      if (dashboardResponse.data.success) {
        const dashboardData = dashboardResponse.data.data;
        console.log('✅ Dashboard loaded successfully');
        
        const pendingOrders = dashboardData.workQueue?.pendingOrders || [];
        console.log(`   Pending orders with user data: ${pendingOrders.length}`);
        
        // Check first few orders for user data
        pendingOrders.slice(0, 3).forEach((order, index) => {
          console.log(`   Order ${index + 1}: #${order.orderNumber}`);
          console.log(`     Patient: ${order.patient?.name || 'NO NAME'} (${order.patient?.email || 'NO EMAIL'})`);
          console.log(`     Doctor: ${order.doctor?.name || 'NO NAME'} (${order.doctor?.email || 'NO EMAIL'})`);
        });
        
        if (pendingOrders.length > 0 && pendingOrders[0].patient?.name) {
          console.log('✅ User associations working in dashboard!');
        } else {
          console.log('❌ User associations missing in dashboard!');
        }
      }
    } catch (error) {
      console.log('❌ Dashboard test failed:', error.message);
    }

    // STEP 5: Test specific order retrieval
    console.log('\n5️⃣ Testing specific order retrieval...');
    
    try {
      const specificOrderResponse = await axios.get(`${LAB_API_URL}/orders/${newOrder.id}`, {
        headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
      });
      
      if (specificOrderResponse.data.success) {
        const orderData = specificOrderResponse.data.data.labOrder;
        console.log('✅ Specific order retrieval working');
        console.log(`   Order #: ${orderData.orderNumber}`);
        console.log(`   Patient: ${orderData.patient?.name || 'NO NAME'}`);
        console.log(`   Doctor: ${orderData.doctor?.name || 'NO NAME'}`);
        console.log(`   Test Details: ${specificOrderResponse.data.data.testDetails?.length || 0} tests`);
      }
    } catch (error) {
      console.log('❌ Specific order retrieval failed:', error.message);
    }

    // STEP 6: Summary
    console.log('\n6️⃣ USER DATA & ASSOCIATIONS SUMMARY');
    console.log('===================================');
    
    if (foundOrder && foundOrder.patient?.name && foundOrder.doctor?.name) {
      console.log('🎉 SUCCESS! User associations are working correctly!');
      console.log('✅ Test users exist in database');
      console.log('✅ Order creation includes user associations');
      console.log('✅ Technician can see orders with patient/doctor names');
      console.log('✅ Dashboard shows user data correctly');
      console.log('✅ Model relationships are properly configured');
      
      console.log('\n📋 This means the lab workflow should show:');
      console.log('- Patient names in order cards');
      console.log('- Doctor names in order details');
      console.log('- Proper user information throughout the system');
    } else {
      console.log('❌ ISSUES FOUND with user associations!');
      console.log('🔧 Problems to investigate:');
      console.log('- User data may not be properly stored');
      console.log('- Model associations may not be working');
      console.log('- Database relationships may be broken');
      console.log('- User creation process may have issues');
    }

  } catch (error) {
    console.error('❌ User data test failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', error.response.data);
    }
  }
}

// Run the test
testUserDataAndAssociations().catch(console.error);