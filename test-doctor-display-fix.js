#!/usr/bin/env node

/**
 * Test that the "Unknown Doctor" display issue is completely fixed
 */

const axios = require('axios');

const testDoctorDisplayFix = async () => {
  console.log('🧪 ========== TESTING DOCTOR DISPLAY FIX ==========');
  
  try {
    // Test with a patient that has appointments
    const response = await axios.get('http://localhost:3004/api/appointments', {
      params: {
        userRole: 'patient',
        userId: '0x1765374535552776ch'
      }
    });

    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Success:', response.data.success);
    console.log('📊 Number of appointments:', response.data.data?.length || 0);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n✅ TESTING DOCTOR NAME DISPLAY:');
      
      response.data.data.forEach((appointment, index) => {
        console.log(`\n   ${index + 1}. Appointment ${appointment.id.substring(0, 8)}...`);
        console.log(`      displayDoctor: "${appointment.displayDoctor}"`);
        console.log(`      appointedWith.name: "${appointment.appointedWith?.name || 'N/A'}"`);
        console.log(`      Status: ${appointment.status}`);
        console.log(`      Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`);
        
        // Check if "Unknown Doctor" is still showing
        if (appointment.displayDoctor && appointment.displayDoctor.includes('Unknown Doctor')) {
          console.log(`      ❌ STILL SHOWING "Unknown Doctor" - FIX NEEDED`);
        } else if (appointment.displayDoctor && appointment.displayDoctor.trim() !== '') {
          console.log(`      ✅ Doctor name displaying correctly`);
        } else {
          console.log(`      ⚠️  No doctor name found`);
        }
      });

      // Summary
      const unknownCount = response.data.data.filter(apt => 
        apt.displayDoctor && apt.displayDoctor.includes('Unknown Doctor')
      ).length;
      
      const namedCount = response.data.data.filter(apt => 
        apt.displayDoctor && !apt.displayDoctor.includes('Unknown Doctor') && apt.displayDoctor.trim() !== ''
      ).length;

      console.log('\n📊 SUMMARY:');
      console.log(`   ✅ Appointments with proper doctor names: ${namedCount}`);
      console.log(`   ❌ Appointments still showing "Unknown Doctor": ${unknownCount}`);
      console.log(`   📋 Total appointments tested: ${response.data.data.length}`);

      if (unknownCount === 0) {
        console.log('\n🎉 SUCCESS: All appointments now show proper doctor names!');
        console.log('   The "Unknown Doctor" display issue has been completely fixed.');
      } else {
        console.log('\n⚠️  PARTIAL FIX: Some appointments still need attention.');
      }

    } else {
      console.log('⚠️  No appointments found for testing');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testDoctorDisplayFix()
  .then(() => {
    console.log('\n✅ Doctor display fix test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });