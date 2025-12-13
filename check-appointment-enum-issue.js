/**
 * Check and Fix Appointment Enum Issue
 */

const axios = require('axios');

async function checkAppointmentEnumIssue() {
  console.log('🔍 CHECKING APPOINTMENT ENUM ISSUE\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // Try to get appointments with different approaches
    console.log('1. Testing basic appointment endpoint...');
    
    try {
      const response = await axios.get(`${baseURL}/api/appointments`);
      console.log('✅ Appointments endpoint working:', response.data.success);
      
      if (response.data.success) {
        console.log(`Found ${response.data.data.length} appointments`);
        
        // Check for any with problematic status
        const appointments = response.data.data;
        appointments.forEach((apt, index) => {
          console.log(`Appointment ${index + 1}:`);
          console.log(`  ID: ${apt.id}`);
          console.log(`  Status: ${apt.status}`);
          console.log(`  Payment Status: ${apt.paymentStatus}`);
          console.log(`  Fee: ${apt.fee}`);
        });
      }
    } catch (error) {
      console.log('❌ Appointments endpoint failed:', error.response?.data || error.message);
      
      // The error suggests there's an invalid enum value "payment_pending"
      console.log('\n🔍 ENUM ERROR DETECTED');
      console.log('The error suggests there\'s an invalid enum value "payment_pending" in the database');
      console.log('This needs to be fixed in the database schema or data');
      
      // Try to check the database directly
      console.log('\n2. Checking database schema...');
      
      try {
        const dbResponse = await axios.get(`${baseURL}/api/db-status`);
        console.log('Database status:', dbResponse.data);
      } catch (dbError) {
        console.log('Could not check database status');
      }
      
      // Try to get a specific appointment
      console.log('\n3. Testing specific appointment queries...');
      
      try {
        // Try to get appointments for a specific user
        const userResponse = await axios.get(`${baseURL}/api/appointments?userRole=patient&userId=0x1765374535552776ch`);
        console.log('User appointments:', userResponse.data);
      } catch (userError) {
        console.log('User appointments failed:', userError.response?.data || userError.message);
      }
    }
    
    // Test creating a new appointment with correct enum values
    console.log('\n4. Testing appointment creation with correct enums...');
    
    const testAppointment = {
      patientWalletAddress: '0x1765374535552776ch',
      doctorWalletAddress: '0xdoctor123',
      serviceType: 'inPerson',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Test consultation',
      fee: 150,
      status: 'pending', // Use valid enum value
      paymentStatus: 'pending' // Use valid enum value
    };
    
    try {
      const createResponse = await axios.post(`${baseURL}/api/appointments`, testAppointment);
      console.log('✅ Appointment creation successful:', createResponse.data.success);
      
      if (createResponse.data.success) {
        const newAppointment = createResponse.data.data;
        console.log(`Created appointment ${newAppointment.id} with status: ${newAppointment.status}`);
        
        // Now test Chapa payment with this appointment
        console.log('\n5. Testing Chapa payment with new appointment...');
        
        const paymentData = {
          appointmentId: newAppointment.id,
          patientWallet: newAppointment.patientWalletAddress
        };
        
        const paymentResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, paymentData);
        
        if (paymentResponse.data.success) {
          console.log('✅ CHAPA PAYMENT SUCCESSFUL!');
          console.log('Checkout URL:', paymentResponse.data.data.checkoutUrl);
          console.log('Demo Mode:', paymentResponse.data.data.demo);
          
          if (paymentResponse.data.data.checkoutUrl && paymentResponse.data.data.checkoutUrl.includes('checkout.chapa.co')) {
            console.log('🎉 REAL CHAPA URL - Phone number fix is working!');
          }
        } else {
          console.log('❌ Chapa payment failed:', paymentResponse.data.error);
        }
      }
    } catch (createError) {
      console.log('❌ Appointment creation failed:', createError.response?.data || createError.message);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkAppointmentEnumIssue();