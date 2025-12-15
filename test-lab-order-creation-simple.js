import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';
const LAB_API_URL = `${API_BASE_URL}/api/lab`;

async function testLabOrderCreation() {
  try {
    console.log('🧪 Testing Lab Order Creation...');
    
    // Test user (doctor)
    const doctorHeaders = {
      'X-Wallet-Address': '0x4567890123456789012345678901234567890123',
      'X-User-Role': 'doctor',
      'Content-Type': 'application/json'
    };

    // Test 1: Get lab catalog
    console.log('\n📋 Step 1: Getting lab catalog...');
    const catalogResponse = await axios.get(`${LAB_API_URL}/catalog`);
    console.log('✅ Lab catalog loaded successfully');
    console.log(`   Available tests: ${catalogResponse.data.data.tests.length}`);

    // Test 2: Create lab order
    console.log('\n👨‍⚕️ Step 2: Creating lab order...');
    const orderData = {
      patientWalletAddress: '0x3456789012345678901234567890123456789012',
      testCodes: ['CBC', 'GLU'],
      priority: 'routine',
      sampleType: 'blood',
      specialInstructions: 'Patient is fasting'
    };

    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    const orderResponse = await axios.post(`${LAB_API_URL}/orders`, orderData, {
      headers: doctorHeaders
    });
    
    console.log('✅ Lab order created successfully!');
    console.log(`   Order Number: ${orderResponse.data.data.labOrder.orderNumber}`);
    console.log(`   Order ID: ${orderResponse.data.data.labOrder.id}`);
    console.log(`   Tests: ${orderResponse.data.data.labOrder.testCodes.join(', ')}`);
    console.log(`   Status: ${orderResponse.data.data.labOrder.status}`);
    
    // Test 3: Get orders list
    console.log('\n📋 Step 3: Getting orders list...');
    const ordersResponse = await axios.get(`${LAB_API_URL}/orders`, {
      headers: doctorHeaders
    });
    
    console.log('✅ Orders list retrieved successfully');
    console.log(`   Total orders: ${ordersResponse.data.data.labOrders.length}`);
    
    console.log('\n🎉 Lab Order Creation Test SUCCESSFUL!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLabOrderCreation();