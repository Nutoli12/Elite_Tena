#!/usr/bin/env node

/**
 * Test the appointment API response to see what data is being returned
 * This will help us understand why "Unknown Doctor" is still showing
 */

import axios from 'axios';

const testAppointmentAPI = async () => {
  console.log('🧪 ========== TESTING APPOINTMENT API RESPONSE ==========');
  
  try {
    // Test the appointments endpoint that the frontend is calling
    const response = await axios.get('http://localhost:3001/api/appointments', {
      params: {
        userRole: 'patient',
        userId: '0x1765465194183a78fkp' // Use one of the patient wallets
      }
    });

    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Success:', response.data.success);
    console.log('📊 Number of appointments:', response.data.data?.length || 0);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 First appointment structure:');
      const firstAppointment = response.data.data[0];
      
      console.log('Raw appointment data:');
      console.log(JSON.stringify(firstAppointment, null, 2));
      
      console.log('\n🔍 Doctor information extraction:');
      console.log('- appointedWith:', firstAppointment.appointedWith);
      console.log('- displayDoctor:', firstAppointment.displayDoctor);
      console.log('- doctorDetails:', firstAppointment.doctorDetails);
      console.log('- doctorUser:', firstAppointment.doctorUser);
      
      // Test the frontend logic
      const doctorName = firstAppointment.doctor?.profileData?.name || 
                        firstAppointment.doctor?.profileData?.fullName || 
                        (firstAppointment.doctor?.profileData?.firstName && firstAppointment.doctor?.profileData?.lastName 
                          ? `${firstAppointment.doctor.profileData.firstName} ${firstAppointment.doctor.profileData.lastName}` 
                          : firstAppointment.appointedWith?.name || firstAppointment.displayDoctor || 'Unknown Doctor');
      
      console.log('- Frontend extracted name:', doctorName);
    } else {
      console.log('⚠️  No appointments returned from API');
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testAppointmentAPI()
  .then(() => {
    console.log('\n✅ API test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 API test failed:', error);
    process.exit(1);
  });