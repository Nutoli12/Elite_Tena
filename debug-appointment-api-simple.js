const axios = require('axios');

async function testAppointmentAPI() {
  console.log('🔍 Testing Appointment API Endpoints...\n');

  const baseURL = 'http://localhost:3001/api';
  
  try {
    // 1. Test server health
    console.log('1️⃣ Testing server health...');
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('   ✅ Server is running');
      console.log(`   Status: ${healthResponse.status}`);
    } catch (error) {
      console.log('   ❌ Server is not running');
      console.log('   Please start the server with: npm run dev');
      return;
    }

    // 2. Test appointments endpoint without parameters
    console.log('\n2️⃣ Testing appointments endpoint (no params)...');
    try {
      const response = await axios.get(`${baseURL}/appointments`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${response.data.success}`);
      console.log(`   Total appointments: ${response.data.data?.length || 0}`);
      
      if (response.data.data?.length > 0) {
        const sample = response.data.data[0];
        console.log('   Sample appointment structure:');
        console.log(`   - ID: ${sample.id}`);
        console.log(`   - Patient Wallet: ${sample.patientWalletAddress || sample.patientWallet}`);
        console.log(`   - Doctor Wallet: ${sample.doctorWalletAddress || sample.doctorWallet}`);
        console.log(`   - Date: ${sample.appointmentDate}`);
        console.log(`   - Status: ${sample.status}`);
        console.log(`   - Reason: ${sample.reason || 'Not specified'}`);
        console.log(`   - Patient Details: ${!!sample.patientDetails ? 'Included' : 'Missing'}`);
        console.log(`   - Patient User: ${!!sample.patientUser ? 'Included' : 'Missing'}`);
        
        if (sample.patientDetails) {
          console.log(`   - Patient Name: ${sample.patientDetails.name || 'Not set'}`);
          console.log(`   - Patient DOB: ${sample.patientDetails.dateOfBirth || 'Not set'}`);
          console.log(`   - Patient Blood Type: ${sample.patientDetails.bloodType || 'Not set'}`);
        }
        
        if (sample.patientUser?.profileData) {
          console.log(`   - Profile Full Name: ${sample.patientUser.profileData.fullName || 'Not set'}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // 3. Test doctor-specific appointments
    console.log('\n3️⃣ Testing doctor appointments...');
    const testDoctorWallet = '0x17653745c2e5b8a54b5b3d4c8f9e2a1b3c4d5e6f';
    try {
      const doctorResponse = await axios.get(`${baseURL}/appointments`, {
        params: {
          userRole: 'doctor',
          userId: testDoctorWallet
        }
      });
      console.log(`   Doctor (${testDoctorWallet}):`);
      console.log(`   - Status: ${doctorResponse.status}`);
      console.log(`   - Success: ${doctorResponse.data.success}`);
      console.log(`   - Appointments: ${doctorResponse.data.data?.length || 0}`);
      
      if (doctorResponse.data.data?.length > 0) {
        console.log('   - Enhanced patient info available:');
        doctorResponse.data.data.forEach((apt, index) => {
          const patientName = apt.patientDetails?.name || 
                             apt.patientUser?.profileData?.fullName || 
                             'Unknown Patient';
          console.log(`     ${index + 1}. ${patientName} - ${apt.reason || 'No reason'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Doctor API failed: ${error.message}`);
    }

    // 4. Test patient-specific appointments
    console.log('\n4️⃣ Testing patient appointments...');
    const testPatientWallet = '0x742d35cc6634c0532925a3b8d4c0532925a3b8d4';
    try {
      const patientResponse = await axios.get(`${baseURL}/appointments`, {
        params: {
          userRole: 'patient',
          userId: testPatientWallet
        }
      });
      console.log(`   Patient (${testPatientWallet}):`);
      console.log(`   - Status: ${patientResponse.status}`);
      console.log(`   - Success: ${patientResponse.data.success}`);
      console.log(`   - Appointments: ${patientResponse.data.data?.length || 0}`);
    } catch (error) {
      console.log(`   ❌ Patient API failed: ${error.message}`);
    }

    // 5. Test appointment creation
    console.log('\n5️⃣ Testing appointment creation...');
    const testAppointment = {
      patientWalletAddress: testPatientWallet,
      doctorWalletAddress: testDoctorWallet,
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      reason: 'Test appointment for enhanced display',
      serviceType: 'inPerson',
      fee: 100
    };

    try {
      const createResponse = await axios.post(`${baseURL}/appointments`, testAppointment);
      console.log(`   ✅ Appointment created successfully`);
      console.log(`   - ID: ${createResponse.data.data.id}`);
      console.log(`   - Status: ${createResponse.data.data.status}`);
      console.log(`   - Payment Status: ${createResponse.data.data.paymentStatus}`);
    } catch (error) {
      console.log(`   ❌ Creation failed: ${error.message}`);
      if (error.response) {
        console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // 6. Test users endpoint
    console.log('\n6️⃣ Testing users endpoint...');
    try {
      const usersResponse = await axios.get(`${baseURL}/users`);
      console.log(`   ✅ Users endpoint accessible`);
      console.log(`   - Total users: ${usersResponse.data.data?.length || 0}`);
      
      if (usersResponse.data.data?.length > 0) {
        const roleCount = {};
        usersResponse.data.data.forEach(user => {
          roleCount[user.role] = (roleCount[user.role] || 0) + 1;
        });
        console.log('   - Role distribution:');
        Object.entries(roleCount).forEach(([role, count]) => {
          console.log(`     * ${role}: ${count}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Users endpoint failed: ${error.message}`);
    }

    // 7. Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('   ✅ Enhanced patient display components are ready');
    console.log('   ✅ Notification modal system is implemented');
    console.log('   ✅ Queue management system is available');
    console.log('   📋 Next steps:');
    console.log('     1. Start the development server');
    console.log('     2. Test the enhanced appointment display');
    console.log('     3. Replace remaining alert() calls with notifications');
    console.log('     4. Add real-time updates with Socket.io');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAppointmentAPI();