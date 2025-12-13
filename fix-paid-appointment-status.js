/**
 * Fix Paid Appointment Status
 * Ensure all paid appointments have status 'scheduled' instead of 'pending'
 */

const axios = require('axios');

async function fixPaidAppointmentStatus() {
  console.log('🔧 FIXING PAID APPOINTMENT STATUS\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. Get all appointments
    const response = await axios.get(`${baseURL}/api/appointments`);
    
    if (!response.data.success) {
      console.log('❌ Failed to get appointments:', response.data.error);
      return;
    }
    
    const appointments = response.data.data;
    console.log(`Found ${appointments.length} appointments`);
    
    // 2. Find paid appointments with wrong status
    const paidWithWrongStatus = appointments.filter(apt => 
      apt.paymentStatus === 'paid' && apt.status !== 'scheduled' && apt.status !== 'confirmed'
    );
    
    console.log(`\nFound ${paidWithWrongStatus.length} paid appointments with wrong status:`);
    
    for (const apt of paidWithWrongStatus) {
      console.log(`\n📋 Appointment: ${apt.id}`);
      console.log(`   Current Status: ${apt.status}`);
      console.log(`   Payment Status: ${apt.paymentStatus}`);
      console.log(`   Fee: ${apt.fee} ETB`);
      
      // Fix the status
      console.log('   🔧 Updating status to "scheduled"...');
      
      try {
        const updateResponse = await axios.put(`${baseURL}/api/appointments/${apt.id}`, {
          status: 'scheduled'
        });
        
        if (updateResponse.data.success) {
          console.log('   ✅ Status updated successfully');
        } else {
          console.log('   ❌ Failed to update:', updateResponse.data.error);
        }
      } catch (error) {
        console.log('   ❌ Error updating:', error.response?.data?.error || error.message);
      }
    }
    
    // 3. Verify the fix
    console.log('\n📋 VERIFYING FIX...\n');
    
    const verifyResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (verifyResponse.data.success) {
      const verifiedAppointments = verifyResponse.data.data;
      
      console.log('All appointments after fix:');
      verifiedAppointments.forEach((apt, index) => {
        console.log(`  ${index + 1}. ID: ${apt.id.substring(0, 8)}...`);
        console.log(`     Status: ${apt.status}`);
        console.log(`     Payment: ${apt.paymentStatus}`);
        console.log(`     Fee: ${apt.fee} ETB`);
      });
      
      // Check if all paid appointments now have correct status
      const stillWrong = verifiedAppointments.filter(apt => 
        apt.paymentStatus === 'paid' && apt.status !== 'scheduled' && apt.status !== 'confirmed'
      );
      
      if (stillWrong.length === 0) {
        console.log('\n✅ All paid appointments now have correct status!');
      } else {
        console.log(`\n⚠️ ${stillWrong.length} appointments still have wrong status`);
      }
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Refresh your browser');
    console.log('2. Go to the Appointments page');
    console.log('3. Your paid appointments should now be visible');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixPaidAppointmentStatus();