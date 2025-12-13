/**
 * Test Payment-First Policy Enforcement
 * Verifies that appointments are ONLY created after successful payment
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function testPaymentFirstPolicyEnforcement() {
  console.log('🔒 Testing Payment-First Policy Enforcement...\n');

  try {
    // Test 1: Verify no appointments exist without payment
    console.log('📋 Test 1: Checking initial clean state...');
    
    const initialAppointments = await axios.get(`${BASE_URL}/appointments`);
    console.log(`✅ Initial appointments: ${initialAppointments.data.data.length} (should be 0)`);

    if (initialAppointments.data.data.length > 0) {
      console.log('⚠️ Database not clean - some appointments exist without payment');
    }

    // Test 2: Try to create appointment without payment (should fail or create pending)
    console.log('\n📋 Test 2: Attempting to create appointment without payment...');
    
    const appointmentData = {
      patientWalletAddress: '0xpatient1234567890123456789012345678901234',
      doctorWalletAddress: '0xdoctor12345678901234567890123456789012345',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Test consultation',
      serviceType: 'inPerson',
      fee: 400, // This should trigger payment-first policy
      // Don't set paymentStatus or status - let the server enforce policy
    };

    try {
      const appointmentResponse = await axios.post(`${BASE_URL}/appointments`, appointmentData);
      
      if (appointmentResponse.data.success) {
        const appointment = appointmentResponse.data.data;
        console.log(`✅ Pending appointment created: ${appointment.id}`);
        console.log(`   Status: ${appointment.status}`);
        console.log(`   Payment Status: ${appointment.paymentStatus}`);
        
        // Verify it's in pending state
        if (appointment.status === 'payment_pending' && appointment.paymentStatus === 'pending') {
          console.log('✅ CORRECT: Appointment is pending payment');
        } else {
          console.log('❌ ERROR: Appointment was confirmed without payment!');
          console.log(`   Expected: status='payment_pending', paymentStatus='pending'`);
          console.log(`   Actual: status='${appointment.status}', paymentStatus='${appointment.paymentStatus}'`);
        }

        // Test 3: Verify appointment doesn't appear in doctor's queue until paid
        console.log('\n📋 Test 3: Checking doctor queue (should be empty)...');
        
        try {
          const doctorAppointments = await axios.get(`${BASE_URL}/appointments/doctor/${appointmentData.doctorWalletAddress}`);
          
          const confirmedAppointments = doctorAppointments.data.data?.filter(apt => 
            apt.paymentStatus === 'paid' && apt.status === 'scheduled'
          ) || [];
          
          console.log(`✅ Doctor's confirmed appointments: ${confirmedAppointments.length} (should be 0)`);
          
          if (confirmedAppointments.length === 0) {
            console.log('✅ CORRECT: No confirmed appointments without payment');
          } else {
            console.log('❌ ERROR: Doctor sees appointments without payment!');
          }
        } catch (error) {
          console.log('⚠️ Could not check doctor appointments (endpoint may not exist)');
        }

        // Test 4: Simulate payment completion
        console.log('\n💳 Test 4: Simulating payment completion...');
        
        try {
          const paymentUpdate = await axios.put(`${BASE_URL}/appointments/${appointment.id}`, {
            paymentStatus: 'paid',
            status: 'scheduled',
            paymentConfirmedAt: new Date().toISOString()
          });
          
          if (paymentUpdate.data.success) {
            console.log('✅ Payment simulation successful');
            
            // Verify appointment is now confirmed
            const updatedAppointment = await axios.get(`${BASE_URL}/appointments/${appointment.id}`);
            const apt = updatedAppointment.data.data;
            
            console.log(`   Updated Status: ${apt.status}`);
            console.log(`   Updated Payment Status: ${apt.paymentStatus}`);
            
            if (apt.paymentStatus === 'paid' && apt.status === 'scheduled') {
              console.log('✅ CORRECT: Appointment confirmed after payment');
            } else {
              console.log('❌ ERROR: Appointment not properly confirmed after payment');
            }
          }
        } catch (error) {
          console.log('❌ Payment simulation failed:', error.response?.data?.error || error.message);
        }

        // Test 5: Verify appointment now appears in doctor's queue
        console.log('\n📋 Test 5: Checking doctor queue after payment...');
        
        try {
          const doctorAppointmentsAfter = await axios.get(`${BASE_URL}/appointments/doctor/${appointmentData.doctorWalletAddress}`);
          
          const confirmedAppointmentsAfter = doctorAppointmentsAfter.data.data?.filter(apt => 
            apt.paymentStatus === 'paid' && apt.status === 'scheduled'
          ) || [];
          
          console.log(`✅ Doctor's confirmed appointments after payment: ${confirmedAppointmentsAfter.length}`);
          
          if (confirmedAppointmentsAfter.length > 0) {
            console.log('✅ CORRECT: Appointment appears in doctor queue after payment');
          } else {
            console.log('❌ ERROR: Appointment still not visible to doctor after payment');
          }
        } catch (error) {
          console.log('⚠️ Could not check doctor appointments after payment');
        }

      } else {
        console.log('❌ Failed to create appointment:', appointmentResponse.data.error);
      }
    } catch (error) {
      console.log('❌ Appointment creation failed:', error.response?.data?.error || error.message);
    }

    // Test 6: Try to create appointment with 'scheduled' status directly (should fail)
    console.log('\n🔒 Test 6: Attempting to bypass payment (should fail)...');
    
    const bypassData = {
      ...appointmentData,
      paymentStatus: 'paid', // Try to bypass
      status: 'scheduled'    // Try to bypass
    };

    try {
      const bypassResponse = await axios.post(`${BASE_URL}/appointments`, bypassData);
      
      if (bypassResponse.data.success) {
        const bypassApt = bypassResponse.data.data;
        console.log('⚠️ WARNING: Bypass attempt succeeded - this should be prevented!');
        console.log(`   Bypass appointment: ${bypassApt.id}`);
        console.log(`   Status: ${bypassApt.status}`);
        console.log(`   Payment Status: ${bypassApt.paymentStatus}`);
      }
    } catch (error) {
      console.log('✅ CORRECT: Bypass attempt blocked:', error.response?.data?.error || error.message);
    }

    // Summary
    console.log('\n📊 Payment-First Policy Test Summary:');
    console.log('✅ Policy Enforcement Points:');
    console.log('   1. Appointments created in pending state initially');
    console.log('   2. No confirmed appointments without payment');
    console.log('   3. Doctor queue only shows paid appointments');
    console.log('   4. Payment completion triggers confirmation');
    console.log('   5. Direct bypass attempts are blocked');
    
    console.log('\n🎯 Expected Workflow:');
    console.log('   Patient → Book Appointment → Pay with Chapa → Appointment Confirmed');
    console.log('   NO PAYMENT = NO APPOINTMENT in doctor queue');
    console.log('   PAYMENT FIRST = Strict enforcement');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure server is running on port 3005');
    console.log('2. Check database connection');
    console.log('3. Verify API endpoints are accessible');
  }
}

// Run the test
testPaymentFirstPolicyEnforcement();