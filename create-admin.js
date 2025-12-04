// Quick script to create admin account
const axios = require('axios');

async function createAdmin() {
  try {
    console.log('Creating admin account...');
    
    const response = await axios.post('http://localhost:3003/api/auth/register', {
      email: 'admin@hospital.com',
      password: 'admin123',
      role: 'admin',
      profileData: {
        fullName: 'System Administrator'
      }
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email:', 'admin@hospital.com');
    console.log('Password:', 'admin123');
    console.log('\nYou can now login at: http://localhost:5174/login');
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  Admin account already exists!');
      console.log('Email:', 'admin@hospital.com');
      console.log('Password:', 'admin123');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

createAdmin();
