/**
 * Check Appointment Wallet Addresses
 * Find the correct wallet addresses for testing
 */

const axios = require('axios');

async function checkAppointmentWalletAddresses() {
  console.log('🔍 CHECKING APPOINTMENT WALLET ADDRESSES');
  console.log('========================================\n');

  const baseURL = 'http://localhost:3005';

  try {
    // Get all appointments
    const response = await axios.get(`${baseURL}/api/appointments`);

    if (response.data.success) {
      const appointments = response.data.data;
      console.log(`Found ${appointments.length} appointments\n`);

      appointments.forEach((apt, index) => {
        console.log(`📅 Appointment ${index + 1}:`);
        console.log(`   ID: ${apt.id}`);
        console.log(`   Patient Wallet: ${apt.patientWalletAddress || 'Not set'}`);
        console.log(`   Doctor Wallet: ${apt.doctorWalletAddress || 'Not set'}`);
        console.log(`   Fee: ${apt.fee} ETB`);
        console.log(`   Payment Method: ${apt.paymentMethod || 'Not set'}`);
        console.log(`   Payment Status: ${apt.paymentStatus || 'Not set'}`);
        console.log(`   Status: ${apt.status || 'Not set'}`);
        console.log('');
      });

      // Find a good appointment for testing
      const testableAppointment = appointments.find(apt => 
        apt.fee > 0 && 
        apt.patientWalletAddress && 
        apt.paymentStatus === 'pending'
      );

      if (testableAppointment) {
        console.log('🎯 RECOMMENDED TEST APPOINTMENT:');
        console.log(`   ID: ${testableAppointment.id}`);
        console.log(`   Patient Wallet: ${testableAppointment.patientWalletAddress}`);
        console.log(`   Fee: ${testableAppointment.fee} ETB`);
        console.log('\n📋 Test Command:');
        console.log(`curl -X POST http://localhost:3005/api/chapa-payment/initialize \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{`);
        console.log(`    "appointmentId": "${testableAppointment.id}",`);
        console.log(`    "patientWallet": "${testableAppointment.patientWalletAddress}"`);
        console.log(`  }'`);
      } else {
        console.log('⚠️ No suitable appointments found for testing');
        console.log('All appointments either have no fee, no wallet address, or are already paid');
      }

    } else {
      console.log('❌ Failed to get appointments:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

checkAppointmentWalletAddresses();