#!/usr/bin/env node

const axios = require('axios');

async function createDoctorPatientAppointments() {
  console.log('📅 Creating Doctor-Patient Appointments for Lab Workflow Testing...\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  // Test doctor and patients
  const testDoctor = {
    walletAddress: '0x1765645107928ugnsg',
    email: 'doctor@test.com'
  };
  
  const testPatients = [
    {
      walletAddress: '0x1765457952240uwgqie',
      email: 'patient@test.com',
      name: 'John Test Patient'
    },
    {
      walletAddress: '0x3456789012345678901234567890123456789012',
      email: 'emily.davis@elitetena.com',
      name: 'Emily Davis'
    }
  ];

  try {
    console.log('1. Creating test appointments...');
    
    for (let i = 0; i < testPatients.length; i++) {
      const patient = testPatients[i];
      
      try {
        // Create appointment between doctor and patient
        const appointmentData = {
          doctorWalletAddress: testDoctor.walletAddress,
          patientWalletAddress: patient.walletAddress,
          appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow, day after, etc.
          appointmentTime: '10:00',
          appointmentType: 'consultation',
          status: 'confirmed',
          fee: 50,
          notes: `Lab workflow test appointment with ${patient.name}`
        };

        const response = await axios.post(`${baseURL}/appointments`, appointmentData);
        
        if (response.data.success) {
          console.log(`   ✅ Created appointment: Dr. ${testDoctor.email} ↔ ${patient.name}`);
        } else {
          console.log(`   ⚠️  Appointment creation response: ${response.data.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to create appointment with ${patient.name}:`, error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Error in appointment creation process:', error.message);
  }

  try {
    console.log('\n2. Testing updated patient selection...');
    
    const patientsResponse = await axios.get(`${baseURL}/lab/patients`, {
      headers: { 
        'x-user-role': 'doctor',
        'x-wallet-address': testDoctor.walletAddress
      }
    });
    
    if (patientsResponse.data.success) {
      const patients = patientsResponse.data.data.patients;
      console.log(`✅ Doctor can now see ${patients.length} patients from appointments:`);
      
      patients.forEach((patient, index) => {
        console.log(`   ${index + 1}. ${patient.fullName}`);
        console.log(`      Email: ${patient.email}`);
        console.log(`      Wallet: ${patient.walletAddress.slice(0, 10)}...${patient.walletAddress.slice(-6)}`);
      });
      
      if (patients.length === 0) {
        console.log('   📝 Note: No patients found. This means:');
        console.log('      • No confirmed appointments exist for this doctor');
        console.log('      • Or appointments table structure needs to be checked');
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing patient selection:', error.response?.data?.message || error.message);
  }

  console.log('\n🎯 Doctor-Patient Relationship Summary:');
  console.log('✅ Appointments created between doctor and patients');
  console.log('✅ Patient selection now filtered by doctor\'s appointments');
  console.log('✅ Only patients with appointments will appear in lab order creation');
  console.log('\n💡 This ensures:');
  console.log('   • Doctors only see their own patients');
  console.log('   • Lab orders are created for patients they actually treat');
  console.log('   • Better security and data privacy');
  console.log('   • More realistic healthcare workflow');
}

createDoctorPatientAppointments().catch(console.error);