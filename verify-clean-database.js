/**
 * Verify Clean Database - Final verification that all appointments are cleared
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function verifyCleanDatabase() {
  console.log('🔍 Final Verification: Checking Clean Database Status...\n');

  try {
    // Check appointments via API
    console.log('📋 Step 1: Checking appointments via API...');
    
    const appointmentsResponse = await axios.get(`${BASE_URL}/appointments`);
    
    if (!appointmentsResponse.data.success) {
      throw new Error('Failed to fetch appointments: ' + appointmentsResponse.data.error);
    }

    const appointments = appointmentsResponse.data.data;
    console.log(`✅ API Response: ${appointments.length} appointments found`);

    // Check enhanced appointments if available
    try {
      console.log('\n📋 Step 2: Checking enhanced appointments...');
      const enhancedResponse = await axios.get(`${BASE_URL}/enhanced-appointments`);
      
      if (enhancedResponse.data.success) {
        const enhancedAppointments = enhancedResponse.data.data || [];
        console.log(`✅ Enhanced appointments: ${enhancedAppointments.length} found`);
      }
    } catch (error) {
      console.log('⚠️ Enhanced appointments endpoint not available (this is normal)');
    }

    // Final status
    console.log('\n📊 Clean Database Verification:');
    console.log(`   Total appointments: ${appointments.length}`);
    
    if (appointments.length === 0) {
      console.log('\n🎉 SUCCESS: Database is completely clean!');
      console.log('✨ Ready for fresh Chapa payment testing');
      
      console.log('\n🚀 What you can do now:');
      console.log('   1. Start the frontend and backend servers');
      console.log('   2. Register/login as a patient');
      console.log('   3. Book a new appointment');
      console.log('   4. Test the real Chapa payment integration');
      console.log('   5. Verify payment-first workflow works correctly');
      
      console.log('\n💡 Testing Tips:');
      console.log('   • Use real Ethiopian phone numbers for Chapa');
      console.log('   • Test both in-person (400 ETB) and video/chat services');
      console.log('   • Verify appointment only creates after successful payment');
      console.log('   • Check that doctors see paid appointments in their queue');
    } else {
      console.log('\n⚠️ WARNING: Database is not clean');
      console.log('Some appointments still exist - manual cleanup may be needed');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
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

// Run the verification
verifyCleanDatabase();