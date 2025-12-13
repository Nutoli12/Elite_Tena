#!/usr/bin/env node

/**
 * Test the enhanced patient registration system
 */

const axios = require('axios');

const testEnhancedRegistration = async () => {
  console.log('🧪 ========== TESTING ENHANCED PATIENT REGISTRATION ==========');
  
  try {
    // Test comprehensive patient registration
    const registrationData = {
      // Basic Information
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe.kebede4@test.com',
      password: 'securepassword123',
      phoneNumber: '+251912345678',
      dateOfBirth: '1990-05-15',
      gender: 'Male',
      
      // Emergency Contact
      emergencyContact: {
        name: 'Almaz Kebede',
        relationship: 'Spouse',
        phone: '+251987654321',
        email: 'almaz.kebede@test.com'
      },
      
      // Location & Preferences
      location: {
        region: 'Addis Ababa',
        city: 'Addis Ababa'
      },
      preferences: {
        language: 'Amharic',
        emailNotifications: true,
        smsNotifications: false
      },
      
      role: 'patient'
    };

    console.log('📝 Registering patient with comprehensive data...');
    const response = await axios.post('http://localhost:3004/api/auth/register', registrationData);

    if (response.data.success) {
      console.log('✅ Registration successful!');
      console.log('📊 User data:', {
        walletAddress: response.data.data.user.walletAddress,
        email: response.data.data.user.email,
        role: response.data.data.user.role,
        profileCreated: response.data.data.profileCreated
      });
      
      console.log('📋 Profile data stored:');
      const profileData = response.data.data.user.profileData;
      console.log('   Name:', profileData.fullName);
      console.log('   Phone:', profileData.phone);
      console.log('   Gender:', profileData.gender);
      console.log('   Emergency Contact:', profileData.emergencyContact?.name);
      console.log('   Location:', `${profileData.location?.city}, ${profileData.location?.region}`);
      console.log('   Language:', profileData.preferences?.language);
      console.log('   Email Notifications:', profileData.preferences?.emailNotifications);
      
    } else {
      console.log('❌ Registration failed:', response.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Registration error:', error.response.data);
    } else {
      console.error('❌ Network error:', error.message);
    }
  }
};

// Run the test
testEnhancedRegistration()
  .then(() => {
    console.log('\n✅ Enhanced registration test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });