/**
 * Test Single Appointment Creation - Debug Payment-First Policy
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testSingleAppointmentCreation() {
  console.log('🔍 Testing Single Appointment Creation...\n');

  try {
    // Test creating appointment with fee
    console.log('📋 Creating appointment with 400 ETB fee...');
    
    const appointmentData = {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Test consultation with fee',
      serviceType: 'inPerson',
      fee: 400 // This should trigger payment-first policy
    };

    console.log('📤 Sending request with data:', appointmentData);

    const response = await axios.post(`${BASE_URL}/appointments`, appointmentData);
    
    if (response.data.success) {
      const appointment = response.data.data;
      console.log('\n✅ Appointment created successfully:');
      console.log(`   ID: ${appointment.id}`);
      console.log(`   Status: ${appointment.status}`);
      console.log(`   Payment Status: ${appointment.paymentStatus}`);
      console.log(`   Fee: ${appointment.fee}`);
      console.log(`   Service Type: ${appointment.serviceType}`);
      
      // Check if it follows payment-first policy
      if (appointment.fee > 0 && appointment.paymentStatus === 'pending') {
        if (appointment.status === 'payment_pending') {
          console.log('\n✅ CORRECT: Payment-first policy enforced');
        } else {
          console.log('\n❌ ERROR: Payment-first policy NOT enforced');
          console.log(`   Expected status: 'payment_pending'`);
          console.log(`   Actual status: '${appointment.status}'`);
        }
      }
    } else {
      console.log('❌ Failed to create appointment:', response.data.error);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSingleAppointmentCreation();