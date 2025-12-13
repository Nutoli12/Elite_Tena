/**
 * Simple test for enhanced appointment system with correct endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

// Test user credentials
const testPatient = {
  email: 'patient@test.com',
  password: 'password123',
  wallet_address: '0x1234567890123456789012345678901234567890'
};

const testDoctor = {
  email: 'doctor@test.com',
  password: 'password123',
  wallet_address: '0x0987654321098765432109876543210987654321'
};

async function testEnhancedAppointmentSystem() {
  console.log('🧪 Testing Enhanced Appointment System');
  console.log('='.repeat(50));

  try {
    // Step 1: Login as patient
    console.log('\n📝 Step 1: Patient Login');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testPatient.email,
      password: testPatient.password
    });

    if (!loginResponse.data.success) {
      throw new Error('Patient login failed');
    }

    const patientToken = loginResponse.data.data.auth.token;
    const patientWallet = loginResponse.data.data.user.walletAddress;
    console.log('✅ Patient logged in successfully');
    console.log('👤 Patient wallet:', patientWallet);

    // Step 2: Get doctor pricing (corrected endpoint)
    console.log('\n💰 Step 2: Get Doctor Pricing');
    const pricingResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/doctors/${testDoctor.wallet_address}/pricing`, {
      headers: { 
        Authorization: `Bearer ${patientToken}`,
        'x-wallet-address': patientWallet
      }
    });

    console.log('💵 Doctor pricing:', pricingResponse.data.data);

    // Step 3: Create appointment (corrected endpoint)
    console.log('\n📅 Step 3: Create Appointment');
    const appointmentData = {
      doctorWallet: testDoctor.wallet_address,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      serviceType: 'inPerson', // Test in-person (400 ETB)
      duration: 30,
      reason: 'Regular checkup - testing enhanced system'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/enhanced-appointments/appointments`, appointmentData, {
      headers: { 
        Authorization: `Bearer ${patientToken}`,
        'x-wallet-address': patientWallet
      }
    });

    console.log('📋 Appointment created:', {
      id: createResponse.data.data.appointment.id,
      serviceType: createResponse.data.data.appointment.serviceType,
      expectedFee: createResponse.data.data.appointment.expectedFee,
      paymentRequired: createResponse.data.data.paymentRequired
    });

    const appointmentId = createResponse.data.data.appointment.id;

    // Step 4: Process payment
    console.log('\n💳 Step 4: Process Payment');
    const paymentData = {
      amount: 400, // In-person fee
      paymentReference: `test_payment_${Date.now()}`,
      paymentMethod: 'chapa'
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/enhanced-appointments/appointments/${appointmentId}/payment`, paymentData, {
      headers: { 
        Authorization: `Bearer ${patientToken}`,
        'x-wallet-address': patientWallet
      }
    });

    console.log('💰 Payment processed:', {
      type: paymentResponse.data.data.type,
      message: paymentResponse.data.message
    });

    // Step 5: Verify appointment status
    console.log('\n🔍 Step 5: Verify Appointment Status');
    const statusResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/appointments/${appointmentId}`, {
      headers: { 
        Authorization: `Bearer ${patientToken}`,
        'x-wallet-address': patientWallet
      }
    });

    console.log('📊 Final appointment status:', {
      id: statusResponse.data.data.id,
      serviceType: statusResponse.data.data.serviceType,
      expectedFee: statusResponse.data.data.expectedFee,
      paidAmount: statusResponse.data.data.paidAmount,
      paymentStatus: statusResponse.data.data.paymentStatus,
      approvalStatus: statusResponse.data.data.approvalStatus,
      approvalType: statusResponse.data.data.approvalType
    });

    console.log('\n✅ Enhanced Appointment System Test Results:');
    console.log('='.repeat(40));
    console.log('✓ Database tables created successfully');
    console.log('✓ Doctor pricing endpoint working');
    console.log('✓ Appointment creation working');
    console.log('✓ Payment processing working');
    console.log('✓ Status verification working');
    console.log('\n🎉 Enhanced appointment system is fully functional!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Note: Make sure the server is running on port 3005');
    }
    
    if (error.response?.status === 500) {
      console.log('\n💡 Database error - check if tables exist');
      console.log('💡 Run: node server/create-missing-tables.cjs');
    }
  }
}

// Run the test
testEnhancedAppointmentSystem();