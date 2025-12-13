/**
 * Create test users for appointment system testing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function createTestUsers() {
  console.log('👥 Creating Test Users for Appointment System');
  console.log('='.repeat(50));

  try {
    // Test Patient
    console.log('\n📝 Creating Test Patient');
    const patientData = {
      email: 'patient@test.com',
      password: 'password123',
      role: 'patient',
      profileData: {
        firstName: 'Test',
        lastName: 'Patient',
        name: 'Test Patient',
        fullName: 'Test Patient',
        phone: '+251911123456',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        address: 'Addis Ababa, Ethiopia'
      }
    };

    try {
      const patientResponse = await axios.post(`${BASE_URL}/api/auth/register`, patientData);
      console.log('✅ Test patient created:', patientResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('✅ Test patient already exists');
      } else {
        console.log('⚠️ Patient creation error:', error.response?.data?.error);
      }
    }

    // Test Doctor
    console.log('\n👨‍⚕️ Creating Test Doctor');
    const doctorData = {
      email: 'doctor@test.com',
      password: 'password123',
      role: 'doctor',
      profileData: {
        firstName: 'Dr. Test',
        lastName: 'Doctor',
        name: 'Dr. Test Doctor',
        fullName: 'Dr. Test Doctor',
        phone: '+251911654321',
        specialization: 'Cardiology',
        department: 'Cardiology',
        bio: 'Test doctor for appointment system',
        languages: ['English', 'Amharic'],
        rating: 4.5,
        reviewCount: 10
      }
    };

    try {
      const doctorResponse = await axios.post(`${BASE_URL}/api/auth/register`, doctorData);
      console.log('✅ Test doctor created:', doctorResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('✅ Test doctor already exists');
      } else {
        console.log('⚠️ Doctor creation error:', error.response?.data?.error);
      }
    }

    // Login as doctor and set up pricing
    console.log('\n💰 Setting up Doctor Pricing');
    try {
      const doctorLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'doctor@test.com',
        password: 'password123'
      });

      if (doctorLogin.data.success) {
        const doctorToken = doctorLogin.data.token;
        const doctorWallet = doctorLogin.data.user.wallet_address;

        // Set up doctor pricing
        const pricingData = {
          videoCallFee: 500,
          chatFee: 300,
          acceptsInPerson: true,
          acceptsVideoCalls: true,
          acceptsChat: true,
          autoApproveExactPayments: true
        };

        try {
          const pricingResponse = await axios.put(
            `${BASE_URL}/api/enhanced-appointments/doctors/${doctorWallet}/pricing`,
            pricingData,
            { headers: { Authorization: `Bearer ${doctorToken}` } }
          );
          console.log('✅ Doctor pricing set up:', pricingResponse.data.success ? 'Success' : 'Failed');
        } catch (pricingError) {
          console.log('⚠️ Pricing setup error:', pricingError.response?.data?.error);
        }
      }
    } catch (error) {
      console.log('⚠️ Doctor login error:', error.response?.data?.error);
    }

    // Test the complete flow
    console.log('\n🧪 Testing Complete Appointment Flow');
    
    // Login as patient
    const patientLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'patient@test.com',
      password: 'password123'
    });

    if (patientLogin.data.success) {
      const patientToken = patientLogin.data.token;
      console.log('✅ Patient login successful');

      // Get doctor info
      const doctorLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'doctor@test.com',
        password: 'password123'
      });

      if (doctorLogin.data.success) {
        const doctorWallet = doctorLogin.data.user.wallet_address;

        // Create appointment
        const appointmentData = {
          doctorWallet: doctorWallet,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          serviceType: 'inPerson',
          duration: 30,
          reason: 'Test appointment for 5-step flow'
        };

        try {
          const appointmentResponse = await axios.post(
            `${BASE_URL}/api/enhanced-appointments/appointments`,
            appointmentData,
            { headers: { Authorization: `Bearer ${patientToken}` } }
          );

          if (appointmentResponse.data.success) {
            console.log('✅ Appointment created successfully!');
            console.log('📋 Appointment ID:', appointmentResponse.data.data.appointment.id);
            console.log('💰 Expected Fee:', appointmentResponse.data.data.appointment.expectedFee, 'ETB');
            
            console.log('\n🎉 Test Users and System Ready!');
            console.log('🚀 You can now test the 5-step appointment flow in the frontend');
          } else {
            console.log('❌ Appointment creation failed:', appointmentResponse.data.error);
          }
        } catch (appointmentError) {
          console.log('❌ Appointment creation error:', appointmentError.response?.data?.error);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  }
}

// Run the setup
createTestUsers();