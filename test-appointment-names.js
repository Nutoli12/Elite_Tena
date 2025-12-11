#!/usr/bin/env node

/**
 * Test appointment API to see if names are showing
 */

import fetch from 'node-fetch';

const targetWallet = '0x1764894073908ypl7fp';
const apiUrl = `http://localhost:3004/api/appointments/patient/${targetWallet}`;

console.log(`🔍 Testing appointment API: ${apiUrl}`);

try {
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  if (data.success) {
    console.log(`✅ Found ${data.count} appointments:`);
    
    data.data.forEach((appointment, index) => {
      console.log(`\n📅 Appointment ${index + 1}:`);
      console.log(`   ID: ${appointment.id}`);
      console.log(`   Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`);
      console.log(`   Reason: ${appointment.reason || 'General consultation'}`);
      console.log(`   Status: ${appointment.status}`);
      
      // Check patient details
      if (appointment.patientDetails && appointment.patientDetails.user) {
        const patientProfile = appointment.patientDetails.user.profileData;
        const patientName = patientProfile ? JSON.parse(patientProfile).name : 'No name';
        console.log(`   Patient: ${patientName}`);
      } else {
        console.log(`   Patient: ${appointment.patientWalletAddress} (no name data)`);
      }
      
      // Check doctor details
      if (appointment.doctorDetails && appointment.doctorDetails.user) {
        const doctorProfile = appointment.doctorDetails.user.profileData;
        const doctorName = doctorProfile ? JSON.parse(doctorProfile).name : 'No name';
        const specialization = appointment.doctorDetails.specialization || 'General';
        console.log(`   Doctor: ${doctorName} (${specialization})`);
      } else {
        console.log(`   Doctor: ${appointment.doctorWalletAddress} (no name data)`);
      }
    });
  } else {
    console.log('❌ API Error:', data.error);
  }
  
} catch (error) {
  console.error('❌ Request failed:', error.message);
}