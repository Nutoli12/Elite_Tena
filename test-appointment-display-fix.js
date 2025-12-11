/**
 * Test script to verify appointment display shows doctor names instead of wallet addresses
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004/api';

async function testAppointmentDisplay() {
  console.log('🧪 ========== TESTING APPOINTMENT DISPLAY FIX ==========');
  
  try {
    // Test patient appointment fetch with enhanced data
    const testPatientWallet = '0x1764894073908ypl7fp'; // Semir's wallet
    
    console.log('📋 Testing patient appointment fetch...');
    const response = await axios.get(`${BASE_URL}/appointments`, {
      params: {
        userRole: 'patient',
        userId: testPatientWallet
      }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      console.log('✅ Found appointments with enhanced data:');
      
      response.data.data.forEach((apt, index) => {
        console.log(`\n📅 Appointment ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  Doctor Wallet: ${apt.doctorWalletAddress}`);
        console.log(`  Doctor Name: ${apt.appointedWith?.name || 'NOT FOUND'}`);
        console.log(`  Display Doctor: ${apt.displayDoctor || 'NOT FOUND'}`);
        console.log(`  Specialization: ${apt.appointedWith?.specialization || 'NOT FOUND'}`);
        console.log(`  Appointment Summary: ${apt.appointmentSummary || 'NOT FOUND'}`);
        console.log(`  Status: ${apt.status}`);
        console.log(`  Date: ${apt.appointmentDate}`);
        
        // Check if we have proper doctor names
        if (apt.appointedWith?.name && apt.appointedWith.name !== 'Unknown Doctor') {
          console.log('  ✅ Doctor name properly resolved');
        } else {
          console.log('  ❌ Doctor name not resolved - showing wallet address');
        }
      });
      
      console.log('\n🎯 Frontend should now display:');
      console.log('  - Doctor names instead of wallet addresses');
      console.log('  - Specializations in parentheses');
      console.log('  - Clear appointment summaries');
      
    } else {
      console.log('❌ No appointments found for test patient');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n🧪 ========== TEST COMPLETE ==========');
}

// Run the test
testAppointmentDisplay();