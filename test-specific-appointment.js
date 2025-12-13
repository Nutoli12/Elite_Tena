/**
 * Test the specific appointment we just created to verify patient name display
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3005/api';

async function testSpecificAppointment() {
  console.log('🔍 ========== TESTING SPECIFIC APPOINTMENT ==========');
  
  try {
    // Test the specific appointment we created
    const appointmentId = '0a9529f0-4997-475c-88bb-98d87d7b9009';
    
    console.log(`\n📝 Testing appointment: ${appointmentId}`);
    
    // Get the specific appointment
    const appointmentResponse = await axios.get(`${API_BASE}/appointments/${appointmentId}`);
    
    if (appointmentResponse.data.success) {
      const appointment = appointmentResponse.data.data;
      
      console.log('\n📅 Appointment Details:');
      console.log(`   - ID: ${appointment.id}`);
      console.log(`   - Patient Wallet: ${appointment.patientWalletAddress}`);
      console.log(`   - Doctor Wallet: ${appointment.doctorWalletAddress}`);
      console.log(`   - Date: ${appointment.appointmentDate}`);
      console.log(`   - Reason: ${appointment.reason}`);
      
      console.log('\n👤 Patient Information:');
      console.log(`   - Patient Name (patientInfo): ${appointment.patientInfo?.name || 'Not set'}`);
      console.log(`   - Display Patient: ${appointment.displayPatient || 'Not set'}`);
      console.log(`   - Patient Email: ${appointment.patientInfo?.email || 'Not set'}`);
      console.log(`   - Patient Age: ${appointment.patientInfo?.ageFormatted || 'Not calculated'}`);
      
      if (appointment.patientInfo?.name && appointment.patientInfo.name !== 'Unknown Patient') {
        console.log('\n✅ SUCCESS: Real patient name is displayed!');
        console.log(`✅ Patient name: "${appointment.patientInfo.name}"`);
      } else {
        console.log('\n❌ ISSUE: Patient name still shows as generic');
      }
    } else {
      console.log('❌ Failed to get appointment:', appointmentResponse.data);
    }
    
    // Also test getting all appointments to see if our new one appears
    console.log('\n📝 Testing all appointments API...');
    
    const allAppointmentsResponse = await axios.get(`${API_BASE}/appointments`);
    
    if (allAppointmentsResponse.data.success) {
      const appointments = allAppointmentsResponse.data.data;
      
      // Find our specific appointment
      const ourAppointment = appointments.find(apt => apt.id === appointmentId);
      
      if (ourAppointment) {
        console.log('\n📅 Found our appointment in the list:');
        console.log(`   - Patient Name: ${ourAppointment.patientInfo?.name || 'Not set'}`);
        console.log(`   - Display Patient: ${ourAppointment.displayPatient || 'Not set'}`);
        
        if (ourAppointment.patientInfo?.name && ourAppointment.patientInfo.name !== 'Unknown Patient') {
          console.log('✅ SUCCESS: Patient name shows correctly in appointments list!');
        } else {
          console.log('❌ ISSUE: Patient name not showing in appointments list');
        }
      } else {
        console.log('⚠️  Our appointment not found in the list');
      }
      
      // Check if there are any appointments with real patient names
      const appointmentsWithRealNames = appointments.filter(apt => 
        apt.patientInfo?.name && 
        apt.patientInfo.name !== 'Unknown Patient' && 
        apt.patientInfo.name !== 'Patient'
      );
      
      console.log(`\n📊 Summary: ${appointmentsWithRealNames.length} out of ${appointments.length} appointments have real patient names`);
      
      if (appointmentsWithRealNames.length > 0) {
        console.log('\n✅ Appointments with real patient names:');
        appointmentsWithRealNames.slice(0, 3).forEach((apt, index) => {
          console.log(`   ${index + 1}. ${apt.patientInfo.name} (${apt.id.substring(0, 8)}...)`);
        });
      }
    }
    
    console.log('\n🎉 ========== SPECIFIC APPOINTMENT TEST COMPLETE ==========');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
}

testSpecificAppointment();