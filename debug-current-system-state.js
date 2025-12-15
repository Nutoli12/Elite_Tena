#!/usr/bin/env node

const axios = require('axios');

async function debugCurrentSystemState() {
  console.log('🔍 DEBUGGING CURRENT SYSTEM STATE...\n');
  console.log('This will help us understand why you\'re not seeing patients in the lab order creation.\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  // Test doctor credentials
  const testDoctor = {
    email: 'doctor@test.com',
    password: 'password123'
  };
  
  let doctorWallet = '';
  let authToken = '';
  
  try {
    console.log('🔐 STEP 1: Testing Doctor Login');
    console.log('================================');
    
    const loginResponse = await axios.post(`${baseURL}/auth/login`, testDoctor);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.auth.token;
      doctorWallet = loginResponse.data.data.user.walletAddress;
      console.log('✅ Doctor login successful');
      console.log(`   Doctor Email: ${testDoctor.email}`);
      console.log(`   Doctor Wallet: ${doctorWallet}`);
      console.log(`   Auth Token: ${authToken ? 'Present' : 'Missing'}`);
    } else {
      throw new Error('Login failed');
    }
    
  } catch (error) {
    console.log('❌ Doctor login failed:', error.response?.data?.message || error.message);
    console.log('\n💡 SOLUTION: Make sure the server is running and doctor account exists');
    console.log('   Run: node create-lab-workflow-test-users.js');
    return;
  }
  
  try {
    console.log('\n📅 STEP 2: Checking Appointments');
    console.log('=================================');
    
    // Check if appointments exist for this doctor
    const appointmentsResponse = await axios.get(`${baseURL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-wallet-address': doctorWallet,
        'x-user-role': 'doctor'
      },
      params: {
        doctorWallet: doctorWallet
      }
    });
    
    if (appointmentsResponse.data.success) {
      const appointments = appointmentsResponse.data.data || [];
      console.log(`✅ Found ${appointments.length} appointments for doctor`);
      
      if (appointments.length > 0) {
        console.log('   📋 Appointment Details:');
        appointments.slice(0, 3).forEach((apt, index) => {
          console.log(`   ${index + 1}. Patient: ${apt.patientWalletAddress || 'Unknown'}`);
          console.log(`      Status: ${apt.status || 'Unknown'}`);
          console.log(`      Date: ${apt.appointmentDate || 'Unknown'}`);
        });
      } else {
        console.log('   ⚠️  No appointments found for this doctor');
        console.log('   💡 This is why the patient list is empty!');
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to fetch appointments:', error.response?.data?.message || error.message);
    console.log('   💡 This might be why patients aren\'t showing up');
  }
  
  try {
    console.log('\n👥 STEP 3: Testing Patient Selection API');
    console.log('=========================================');
    
    const patientsResponse = await axios.get(`${baseURL}/lab/patients`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-wallet-address': doctorWallet,
        'x-user-role': 'doctor'
      }
    });
    
    if (patientsResponse.data.success) {
      const patients = patientsResponse.data.data.patients || [];
      console.log(`✅ Patient selection API working`);
      console.log(`   Patients available: ${patients.length}`);
      
      if (patients.length > 0) {
        console.log('   👥 Available Patients:');
        patients.forEach((patient, index) => {
          console.log(`   ${index + 1}. ${patient.fullName}`);
          console.log(`      Email: ${patient.email}`);
          console.log(`      Wallet: ${patient.walletAddress.slice(0, 10)}...${patient.walletAddress.slice(-6)}`);
        });
      } else {
        console.log('   ❌ NO PATIENTS AVAILABLE - This is your issue!');
        console.log('   📝 Reason: ' + (patientsResponse.data.data.message || 'Unknown'));
      }
    }
    
  } catch (error) {
    console.log('❌ Patient selection API failed:', error.response?.data?.message || error.message);
  }
  
  try {
    console.log('\n🧪 STEP 4: Checking Lab Test Catalog');
    console.log('====================================');
    
    const catalogResponse = await axios.get(`${baseURL}/lab/catalog`);
    
    if (catalogResponse.data.success) {
      const tests = catalogResponse.data.data.tests || [];
      console.log(`✅ Lab catalog working: ${tests.length} tests available`);
      
      if (tests.length > 0) {
        console.log('   🧪 Available Tests:');
        tests.slice(0, 3).forEach((test, index) => {
          console.log(`   ${index + 1}. ${test.testCode}: ${test.testName} - $${test.standardPrice}`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ Lab catalog failed:', error.response?.data?.message || error.message);
  }
  
  console.log('\n🎯 DIAGNOSIS & SOLUTIONS');
  console.log('========================');
  
  if (doctorWallet) {
    console.log('✅ Doctor authentication: Working');
  } else {
    console.log('❌ Doctor authentication: Failed');
    console.log('   💡 SOLUTION: Check doctor login credentials');
  }
  
  console.log('\n📋 MOST LIKELY ISSUE: No appointments between doctor and patients');
  console.log('💡 SOLUTIONS:');
  console.log('   1. Create test appointments:');
  console.log('      node create-doctor-patient-appointments.js');
  console.log('');
  console.log('   2. Or manually create appointments in the frontend:');
  console.log('      - Login as patient');
  console.log('      - Book appointment with doctor');
  console.log('      - Then login as doctor to see patients');
  console.log('');
  console.log('   3. Check if appointments table exists and has correct structure');
  
  console.log('\n🔄 WORKFLOW REMINDER:');
  console.log('   Patient → Books Appointment → Doctor → Creates Lab Order');
  console.log('   No appointments = No patients in lab order creation');
}

debugCurrentSystemState().catch(console.error);