/**
 * Check Logged In Patient - Find which patient has appointments
 */

const axios = require('axios');

async function checkLoggedInPatient() {
  console.log('🔍 CHECKING PATIENTS AND THEIR APPOINTMENTS\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. Get all users
    console.log('👥 1. GETTING ALL PATIENT USERS\n');
    
    // Get appointments first to find patients with appointments
    const appointmentsResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (appointmentsResponse.data.success) {
      const appointments = appointmentsResponse.data.data;
      
      // Get unique patient wallets
      const patientsWithAppointments = [...new Set(appointments.map(apt => apt.patientWalletAddress))];
      
      console.log('📋 PATIENTS WITH APPOINTMENTS:');
      console.log('================================');
      
      for (const patientWallet of patientsWithAppointments) {
        const patientAppointments = appointments.filter(apt => apt.patientWalletAddress === patientWallet);
        
        console.log(`\n👤 Patient: ${patientWallet}`);
        console.log(`   Appointments: ${patientAppointments.length}`);
        
        patientAppointments.forEach(apt => {
          console.log(`   📅 ${apt.id.substring(0, 8)}...`);
          console.log(`      Doctor: ${apt.displayDoctor || apt.appointedWith?.name || 'Unknown'}`);
          console.log(`      Date: ${new Date(apt.appointmentDate).toLocaleString()}`);
          console.log(`      Status: ${apt.status}`);
          console.log(`      Payment: ${apt.paymentStatus}`);
          console.log(`      Fee: ${apt.fee} ETB`);
        });
      }
      
      console.log('\n\n🔑 TO SEE YOUR APPOINTMENTS:');
      console.log('============================');
      console.log('1. Check which wallet address you\'re logged in with');
      console.log('2. It should match one of the patients above');
      console.log('3. If you\'re logged in as a different patient, you won\'t see these appointments');
      
      console.log('\n📱 HOW TO CHECK YOUR WALLET ADDRESS:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Console tab');
      console.log('3. Type: localStorage.getItem("user")');
      console.log('4. Look for the "walletAddress" field');
      
      console.log('\n💡 IF YOUR WALLET DOESN\'T MATCH:');
      console.log('1. Log out and log in with the correct account');
      console.log('2. Or book a new appointment with your current account');
      
      // Show which patients have paid appointments
      console.log('\n\n✅ PATIENTS WITH PAID APPOINTMENTS:');
      const paidAppointments = appointments.filter(apt => apt.paymentStatus === 'paid');
      const patientsWithPaidAppointments = [...new Set(paidAppointments.map(apt => apt.patientWalletAddress))];
      
      patientsWithPaidAppointments.forEach(patient => {
        const count = paidAppointments.filter(apt => apt.patientWalletAddress === patient).length;
        console.log(`   ${patient}: ${count} paid appointment(s)`);
      });
      
    } else {
      console.log('❌ Failed to get appointments:', appointmentsResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkLoggedInPatient();