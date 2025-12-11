/**
 * Test doctor appointments for drabinetengida
 */

import axios from 'axios';

const testDoctorAppointments = async () => {
  try {
    console.log('🔍 Testing doctor appointments for drabinetengida...\n');

    const userWallet = '0x1764894943291khtk9h';
    
    // Test as doctor role
    console.log('1. Testing as DOCTOR role:');
    const doctorResponse = await axios.get('http://localhost:3004/api/appointments', {
      params: {
        userRole: 'doctor',
        userId: userWallet
      }
    });

    if (doctorResponse.data.success) {
      console.log('✅ Doctor API Response successful');
      console.log('Count:', doctorResponse.data.count);
      
      if (doctorResponse.data.data && doctorResponse.data.data.length > 0) {
        console.log('\n📅 Doctor appointments found:');
        doctorResponse.data.data.forEach((apt, index) => {
          console.log(`\nAppointment ${index + 1}:`);
          console.log('  ID:', apt.id.substring(0, 8) + '...');
          console.log('  Patient:', apt.patientWalletAddress);
          console.log('  Date:', apt.appointmentDate);
          console.log('  Status:', apt.status);
          console.log('  Patient Info:', JSON.stringify(apt.patientInfo, null, 2));
        });
      } else {
        console.log('📝 No doctor appointments found');
      }
    }
    
    // Test appointments where this user appears as patient
    console.log('\n2. Testing appointments where drabinetengida appears as PATIENT:');
    const patientResponse = await axios.get('http://localhost:3004/api/appointments', {
      params: {
        userRole: 'patient',
        userId: userWallet
      }
    });
    
    console.log('Patient appointments count:', patientResponse.data.count);
    
    // Test all appointments to see where this user appears
    console.log('\n3. Testing ALL appointments to find drabinetengida:');
    const allResponse = await axios.get('http://localhost:3004/api/appointments');
    
    if (allResponse.data.success) {
      console.log('Total appointments in system:', allResponse.data.count);
      
      const drabinetAppointments = allResponse.data.data.filter(apt => 
        apt.doctorWalletAddress === userWallet || apt.patientWalletAddress === userWallet
      );
      
      console.log(`\nAppointments involving drabinetengida: ${drabinetAppointments.length}`);
      
      drabinetAppointments.forEach((apt, index) => {
        console.log(`\nAppointment ${index + 1}:`);
        console.log('  Role:', apt.doctorWalletAddress === userWallet ? 'DOCTOR' : 'PATIENT');
        console.log('  Doctor:', apt.doctorWalletAddress);
        console.log('  Patient:', apt.patientWalletAddress);
        console.log('  appointedWith:', JSON.stringify(apt.appointedWith, null, 2));
        console.log('  displayDoctor:', apt.displayDoctor);
        
        if (apt.doctor) {
          console.log('  doctor object:', JSON.stringify(apt.doctor, null, 2));
        }
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
};

testDoctorAppointments();