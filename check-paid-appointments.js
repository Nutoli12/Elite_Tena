/**
 * Check Paid Appointments - Debug why they're not showing
 */

const axios = require('axios');

async function checkPaidAppointments() {
  console.log('🔍 CHECKING PAID APPOINTMENTS\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. Get all appointments directly from database
    console.log('📋 1. CHECKING ALL APPOINTMENTS IN DATABASE\n');
    
    const response = await axios.get(`${baseURL}/api/db-status`);
    console.log('Database status:', response.data);
    
    // 2. Try to get appointments without filters
    console.log('\n📋 2. GETTING ALL APPOINTMENTS (NO FILTERS)\n');
    
    try {
      const allAppointments = await axios.get(`${baseURL}/api/appointments`);
      
      if (allAppointments.data.success) {
        const appointments = allAppointments.data.data;
        console.log(`Found ${appointments.length} appointments`);
        
        appointments.forEach((apt, index) => {
          console.log(`\nAppointment ${index + 1}:`);
          console.log(`  ID: ${apt.id}`);
          console.log(`  Patient: ${apt.patientWalletAddress}`);
          console.log(`  Doctor: ${apt.doctorWalletAddress}`);
          console.log(`  Fee: ${apt.fee} ETB`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Payment Status: ${apt.paymentStatus}`);
          console.log(`  Chapa Transaction: ${apt.chapa_transaction_id || 'None'}`);
          console.log(`  Payment Confirmed At: ${apt.paymentConfirmedAt || 'Not confirmed'}`);
        });
        
        // Count by status
        const statusCounts = {};
        const paymentStatusCounts = {};
        
        appointments.forEach(apt => {
          statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
          paymentStatusCounts[apt.paymentStatus] = (paymentStatusCounts[apt.paymentStatus] || 0) + 1;
        });
        
        console.log('\n📊 STATUS SUMMARY:');
        console.log('Appointment Status:', statusCounts);
        console.log('Payment Status:', paymentStatusCounts);
        
        // Check for appointments that should be visible
        const paidAppointments = appointments.filter(apt => apt.paymentStatus === 'paid');
        const pendingPaymentAppointments = appointments.filter(apt => apt.paymentStatus === 'pending');
        
        console.log(`\n💰 Paid appointments: ${paidAppointments.length}`);
        console.log(`⏳ Pending payment appointments: ${pendingPaymentAppointments.length}`);
        
        // Check if paid appointments have correct status
        paidAppointments.forEach((apt, index) => {
          console.log(`\n✅ Paid Appointment ${index + 1}:`);
          console.log(`  ID: ${apt.id}`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Should be visible: ${apt.status !== 'payment_pending' ? 'YES' : 'NO - status is payment_pending!'}`);
        });
        
      } else {
        console.log('❌ Failed to get appointments:', allAppointments.data.error);
      }
    } catch (error) {
      console.log('❌ Error getting appointments:', error.response?.data || error.message);
    }
    
    // 3. Check specific patient's appointments
    console.log('\n📋 3. CHECKING PATIENT APPOINTMENTS\n');
    
    const patientWallet = '0x1765212874227cyqjkd';
    
    try {
      const patientAppointments = await axios.get(`${baseURL}/api/appointments`, {
        params: {
          userRole: 'patient',
          userId: patientWallet
        }
      });
      
      if (patientAppointments.data.success) {
        console.log(`Found ${patientAppointments.data.data.length} appointments for patient ${patientWallet}`);
        
        patientAppointments.data.data.forEach((apt, index) => {
          console.log(`\nPatient Appointment ${index + 1}:`);
          console.log(`  ID: ${apt.id}`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Payment Status: ${apt.paymentStatus}`);
          console.log(`  Fee: ${apt.fee}`);
        });
      } else {
        console.log('❌ Failed to get patient appointments:', patientAppointments.data.error);
      }
    } catch (error) {
      console.log('❌ Error getting patient appointments:', error.response?.data || error.message);
    }
    
    // 4. Identify the issue
    console.log('\n🔍 4. DIAGNOSIS\n');
    
    console.log('The issue is likely one of these:');
    console.log('1. Appointment status is "payment_pending" even after payment');
    console.log('2. Payment status is not being updated to "paid" after Chapa payment');
    console.log('3. The query filter is excluding valid appointments');
    console.log('4. Patient wallet address mismatch (case sensitivity)');
    
    console.log('\n💡 SOLUTION:');
    console.log('After payment, the appointment should have:');
    console.log('  - status: "scheduled" or "confirmed" (NOT "payment_pending")');
    console.log('  - paymentStatus: "paid"');
    console.log('  - paymentConfirmedAt: <timestamp>');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkPaidAppointments();