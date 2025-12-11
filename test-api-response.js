/**
 * Test API response for drabinetengida appointments
 */

import axios from 'axios';

const testAPIResponse = async () => {
  try {
    console.log('🔍 Testing API response for drabinetengida appointments...\n');

    const userWallet = '0x1764894943291khtk9h';
    
    // Test the exact API call the frontend makes
    const response = await axios.get('http://localhost:3004/api/appointments', {
      params: {
        userRole: 'patient',
        userId: userWallet
      }
    });

    if (response.data.success) {
      console.log('✅ API Response successful');
      console.log('📊 Response data structure:');
      console.log('Count:', response.data.count);
      console.log('UserRole:', response.data.userRole);
      console.log('UserId:', response.data.userId);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📅 First appointment data:');
        const firstApt = response.data.data[0];
        
        console.log('Keys in appointment object:', Object.keys(firstApt));
        
        console.log('\n🔍 Doctor-related fields:');
        console.log('doctorWalletAddress:', firstApt.doctorWalletAddress);
        console.log('appointedWith:', JSON.stringify(firstApt.appointedWith, null, 2));
        console.log('displayDoctor:', firstApt.displayDoctor);
        
        if (firstApt.doctor) {
          console.log('\n👨‍⚕️ Doctor object:');
          console.log(JSON.stringify(firstApt.doctor, null, 2));
        } else {
          console.log('\n❌ No doctor object in response');
        }
        
        if (firstApt.doctorDetails) {
          console.log('\n👨‍⚕️ DoctorDetails object:');
          console.log(JSON.stringify(firstApt.doctorDetails, null, 2));
        } else {
          console.log('\n❌ No doctorDetails object in response');
        }
        
        console.log('\n🎯 What frontend should display:');
        console.log('Doctor Name:', firstApt.appointedWith?.name || 'Unknown Doctor');
        console.log('Specialization:', firstApt.appointedWith?.specialization || 'General');
        console.log('Display String:', firstApt.displayDoctor || `${firstApt.appointedWith?.name || 'Unknown Doctor'} (${firstApt.appointedWith?.specialization || 'General'})`);
        
      } else {
        console.log('📝 No appointments found in response');
      }
    } else {
      console.log('❌ API Response failed:', response.data.message);
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
};

testAPIResponse();