
/**
 * Enhanced Appointment System Test
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';

async function testEnhancedAppointmentSystem() {
  console.log('🧪 Testing Enhanced Appointment System...\n');

  try {
    // Test 1: Get doctor pricing
    console.log('📊 Test 1: Doctor Pricing API');
    const pricingResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/doctors/test-wallet/pricing`);
    console.log('✅ Doctor pricing API working');

    // Test 2: Get doctors list
    console.log('\n👨‍⚕️ Test 2: Doctors List API');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/enhanced-appointments/doctors`);
    console.log('✅ Doctors list API working');

    console.log('\n🎉 Enhanced Appointment System is ready!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up doctor pricing in the dashboard');
    console.log('2. Test the 4-step booking flow: Department → Doctor → Schedule → Payment');
    console.log('3. Verify auto-approval for exact payments');
    console.log('4. Test manual review for payment mismatches');
    console.log('5. Confirm refund policy enforcement');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('- Server is running on port 3005');
    console.log('- Database is connected');
    console.log('- All migrations have been applied');
  }
}

if (require.main === module) {
  testEnhancedAppointmentSystem();
}

module.exports = { testEnhancedAppointmentSystem };
