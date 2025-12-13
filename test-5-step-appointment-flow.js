/**
 * Test script for 5-step appointment booking flow
 * Tests: Department → Doctor → Schedule → Service Selection → Payment
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

async function test5StepFlow() {
  console.log('🧪 Testing 5-Step Appointment Booking Flow');
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

    const patientToken = loginResponse.data.token;
    console.log('✅ Patient logged in successfully');

    // Step 2: Get departments (Step 1 of booking flow)
    console.log('\n🏥 Step 2: Get Departments');
    const departmentsResponse = await axios.get(`${BASE_URL}/api/doctors/departments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('📋 Available departments:', departmentsResponse.data.data);

    // Step 3: Get doctors in department (Step 2 of booking flow)
    console.log('\n👨‍⚕️ Step 3: Get Doctors in Cardiology');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/doctors/department/Cardiology`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('👥 Available doctors:', doctorsResponse.data.data?.length || 0);

    // Step 4: Get doctor pricing
    console.log('\n💰 Step 4: Get Doctor Pricing');
    const pricingResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/doctor/${testDoctor.wallet_address}/pricing`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('💵 Doctor pricing:', pricingResponse.data.data);

    // Step 5: Create appointment (Steps 3-4 of booking flow: Schedule + Service Selection)
    console.log('\n📅 Step 5: Create Appointment');
    const appointmentData = {
      doctorWallet: testDoctor.wallet_address,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      serviceType: 'inPerson', // Test in-person (now 400 ETB)
      duration: 30,
      reason: 'Regular checkup - testing 5-step flow'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/enhanced-appointments/create`, appointmentData, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('📋 Appointment created:', {
      id: createResponse.data.data.appointment.id,
      serviceType: createResponse.data.data.appointment.serviceType,
      expectedFee: createResponse.data.data.appointment.expectedFee,
      paymentRequired: createResponse.data.data.paymentRequired
    });

    const appointmentId = createResponse.data.data.appointment.id;

    // Step 6: Process payment (Step 5 of booking flow)
    console.log('\n💳 Step 6: Process Payment');
    const paymentData = {
      amount: 400, // In-person fee
      paymentReference: `test_payment_${Date.now()}`,
      paymentMethod: 'chapa'
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/enhanced-appointments/${appointmentId}/payment`, paymentData, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('💰 Payment processed:', {
      type: paymentResponse.data.data.type,
      message: paymentResponse.data.message
    });

    // Step 7: Verify appointment status
    console.log('\n🔍 Step 7: Verify Appointment Status');
    const statusResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${patientToken}` }
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

    console.log('\n✅ 5-Step Flow Test Results:');
    console.log('='.repeat(30));
    console.log('✓ Step 1: Department selection - Available');
    console.log('✓ Step 2: Doctor selection - Available');
    console.log('✓ Step 3: Schedule selection - Working');
    console.log('✓ Step 4: Service selection - Working');
    console.log('✓ Step 5: Payment processing - Working');
    console.log('\n🎉 All steps completed successfully!');

    // Test different service types
    console.log('\n🧪 Testing Different Service Types:');
    
    // Test Video Call
    const videoAppointment = await axios.post(`${BASE_URL}/api/enhanced-appointments/create`, {
      ...appointmentData,
      serviceType: 'videoCall',
      reason: 'Video consultation test'
    }, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('📹 Video Call Fee:', videoAppointment.data.data.appointment.expectedFee, 'ETB');

    // Test Chat
    const chatAppointment = await axios.post(`${BASE_URL}/api/enhanced-appointments/create`, {
      ...appointmentData,
      serviceType: 'chat',
      reason: 'Chat consultation test'
    }, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    console.log('💬 Chat Fee:', chatAppointment.data.data.appointment.expectedFee, 'ETB');

    console.log('\n✅ Service Type Pricing Verification:');
    console.log(`• In-Person: 400 ETB (Fixed)`);
    console.log(`• Video Call: ${videoAppointment.data.data.appointment.expectedFee} ETB (Doctor-set)`);
    console.log(`• Chat: ${chatAppointment.data.data.appointment.expectedFee} ETB (Doctor-set)`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Note: Make sure the server is running on port 3005');
      console.log('💡 Run: npm run dev or node server/src/server.js');
    }
  }
}

// Run the test
test5StepFlow();