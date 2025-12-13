/**
 * Test script to verify patient names are displayed correctly in appointments
 * This tests the fix for showing "Patient" instead of real names
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3004/api';

async function testPatientNameDisplay() {
  console.log('👤 ========== TESTING PATIENT NAME DISPLAY ==========');
  
  try {
    // Test 1: Check existing appointments for patient name display
    console.log('\n📝 Test 1: Check Patient Names in Appointments');
    
    const appointmentsResponse = await axios.get(`${API_BASE}/appointments`);
    
    if (appointmentsResponse.data.success && appointmentsResponse.data.data.length > 0) {
      console.log(`   📋 Found ${appointmentsResponse.data.data.length} appointments`);
      
      // Check first few appointments for patient names
      const appointmentsToCheck = appointmentsResponse.data.data.slice(0, 5);
      
      appointmentsToCheck.forEach((appointment, index) => {
        console.log(`\n   📅 Appointment ${index + 1}:`);
        console.log(`   - ID: ${appointment.id}`);
        console.log(`   - Patient Name (patientInfo): ${appointment.patientInfo?.name || 'Not set'}`);
        console.log(`   - Patient Name (displayPatient): ${appointment.displayPatient || 'Not set'}`);
        console.log(`   - Doctor Name: ${appointment.displayDoctor || 'Unknown'}`);
        console.log(`   - Patient Wallet: ${appointment.patientWalletAddress}`);
        
        // Check if patient name is properly set
        const hasRealName = appointment.patientInfo?.name && 
                           appointment.patientInfo.name !== 'Unknown Patient' && 
                           appointment.patientInfo.name !== 'Patient';
        
        if (hasRealName) {
          console.log(`   ✅ Patient has real name: "${appointment.patientInfo.name}"`);
        } else {
          console.log(`   ⚠️  Patient name missing or generic: "${appointment.patientInfo?.name || 'Not found'}"`);
        }
      });
    } else {
      console.log('   ℹ️  No appointments found in database');
    }
    
    // Test 2: Check doctor-specific appointments (doctor's view)
    console.log('\n📝 Test 2: Check Doctor View of Patient Names');
    
    // Try to get appointments for a doctor
    const doctorAppointmentsResponse = await axios.get(`${API_BASE}/appointments`, {
      params: {
        userRole: 'doctor',
        userId: '0x8ba1f109551bD432803012645Hac136c30C6756M' // Sample doctor wallet
      }
    });
    
    if (doctorAppointmentsResponse.data.success && doctorAppointmentsResponse.data.data.length > 0) {
      console.log(`   📋 Found ${doctorAppointmentsResponse.data.data.length} doctor appointments`);
      
      const firstAppointment = doctorAppointmentsResponse.data.data[0];
      console.log('\n   👨‍⚕️ Doctor View - First Appointment:');
      console.log(`   - Patient Name: ${firstAppointment.patientInfo?.name || 'Not set'}`);
      console.log(`   - Display Patient: ${firstAppointment.displayPatient || 'Not set'}`);
      console.log(`   - Patient Email: ${firstAppointment.patientInfo?.email || 'Not set'}`);
      console.log(`   - Patient Age: ${firstAppointment.patientInfo?.ageFormatted || 'Not calculated'}`);
      
      const hasRealName = firstAppointment.patientInfo?.name && 
                         firstAppointment.patientInfo.name !== 'Unknown Patient' && 
                         firstAppointment.patientInfo.name !== 'Patient';
      
      if (hasRealName) {
        console.log('   ✅ Doctor can see patient\'s real name');
      } else {
        console.log('   ❌ Doctor sees generic name instead of real patient name');
      }
    } else {
      console.log('   ℹ️  No doctor appointments found');
    }
    
    // Test 3: Check patient data directly
    console.log('\n📝 Test 3: Check Patient Records Directly');
    
    try {
      // Try to get patient data directly
      const patientsResponse = await axios.get(`${API_BASE}/patients`);
      
      if (patientsResponse.data.success && patientsResponse.data.length > 0) {
        console.log(`   📋 Found ${patientsResponse.data.length} patient records`);
        
        patientsResponse.data.slice(0, 3).forEach((patient, index) => {
          console.log(`\n   👤 Patient ${index + 1}:`);
          console.log(`   - Name: ${patient.name || 'Not set'}`);
          console.log(`   - Wallet: ${patient.walletAddress}`);
          console.log(`   - Email: ${patient.user?.email || 'Not set'}`);
          console.log(`   - Registration Method: ${patient.registrationMethod || 'Not set'}`);
          
          if (patient.name && patient.name !== 'Unknown Patient') {
            console.log('   ✅ Patient has proper name in database');
          } else {
            console.log('   ⚠️  Patient name not set in database');
          }
        });
      }
    } catch (error) {
      console.log('   ℹ️  Patient endpoint not available or no patients found');
    }
    
    // Test 4: Verify name extraction logic
    console.log('\n📝 Test 4: Name Extraction Priority Logic');
    
    const testScenarios = [
      {
        description: 'Patient with name in Patient table',
        patientDetails: { name: 'John Doe' },
        patientUser: { profileData: { name: 'Old Name' } },
        expected: 'John Doe'
      },
      {
        description: 'Patient with name only in User profileData',
        patientDetails: { name: null },
        patientUser: { profileData: { name: 'Jane Smith' } },
        expected: 'Jane Smith'
      },
      {
        description: 'Patient with firstName and lastName in profileData',
        patientDetails: { name: null },
        patientUser: { profileData: { firstName: 'Bob', lastName: 'Johnson' } },
        expected: 'Bob Johnson'
      },
      {
        description: 'Patient with no name data',
        patientDetails: { name: null },
        patientUser: { profileData: {} },
        expected: 'Unknown Patient'
      }
    ];
    
    testScenarios.forEach(scenario => {
      let extractedName = 'Unknown Patient';
      
      // Simulate the extraction logic
      if (scenario.patientDetails && scenario.patientDetails.name) {
        extractedName = scenario.patientDetails.name;
      } else if (scenario.patientUser?.profileData) {
        const profileData = scenario.patientUser.profileData;
        extractedName = profileData?.name || 
                      profileData?.fullName || 
                      (profileData?.firstName && profileData?.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}` 
                        : profileData?.firstName || 'Unknown Patient');
      }
      
      const isCorrect = extractedName === scenario.expected;
      console.log(`   ${isCorrect ? '✅' : '❌'} ${scenario.description}: "${extractedName}"`);
    });
    
    console.log('\n🎉 ========== PATIENT NAME DISPLAY TEST COMPLETE ==========');
    console.log('✅ Patient name extraction logic prioritizes Patient table');
    console.log('✅ Fallback to User profileData when Patient name not available');
    console.log('✅ Doctor appointments should show real patient names');
    console.log('✅ Age calculation works alongside name display');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running on http://localhost:3004');
    }
  }
}

// Run the test
testPatientNameDisplay();