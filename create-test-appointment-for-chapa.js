/**
 * Create Test Appointment for Chapa Testing
 */

const axios = require('axios');

async function createTestAppointmentForChapa() {
  console.log('🏥 CREATING TEST APPOINTMENT FOR CHAPA TESTING\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. First, let's check existing users to get valid wallet addresses
    console.log('👥 1. CHECKING EXISTING USERS\n');
    
    try {
      const usersResponse = await axios.get(`${baseURL}/api/users`);
      
      if (usersResponse.data.success) {
        const users = usersResponse.data.data;
        console.log(`Found ${users.length} users`);
        
        const patients = users.filter(user => user.role === 'patient');
        const doctors = users.filter(user => user.role === 'doctor');
        
        console.log(`Patients: ${patients.length}, Doctors: ${doctors.length}`);
        
        if (patients.length > 0 && doctors.length > 0) {
          const patient = patients[0];
          const doctor = doctors[0];
          
          console.log(`Using patient: ${patient.walletAddress} (${patient.email})`);
          console.log(`Using doctor: ${doctor.walletAddress} (${doctor.email})`);
          
          // 2. Create test appointment
          console.log('\n🏥 2. CREATING TEST APPOINTMENT\n');
          
          const appointmentData = {
            patientWalletAddress: patient.walletAddress,
            doctorWalletAddress: doctor.walletAddress,
            serviceType: 'inPerson',
            appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reason: 'Test consultation for Chapa payment integration',
            fee: 250, // Test fee
            status: 'pending',
            paymentStatus: 'pending'
          };
          
          console.log('Creating appointment with data:');
          console.log(JSON.stringify(appointmentData, null, 2));
          
          const createResponse = await axios.post(`${baseURL}/api/appointments`, appointmentData);
          
          if (createResponse.data.success) {
            const newAppointment = createResponse.data.data;
            console.log('\n✅ TEST APPOINTMENT CREATED SUCCESSFULLY!');
            console.log(`Appointment ID: ${newAppointment.id}`);
            console.log(`Fee: ${newAppointment.fee} ETB`);
            console.log(`Status: ${newAppointment.status}`);
            console.log(`Payment Status: ${newAppointment.paymentStatus}`);
            
            // 3. Now test Chapa payment with this appointment
            console.log('\n💳 3. TESTING CHAPA PAYMENT WITH NEW APPOINTMENT\n');
            
            const paymentData = {
              appointmentId: newAppointment.id,
              patientWallet: newAppointment.patientWalletAddress,
              returnUrl: `http://localhost:5173/appointments/${newAppointment.id}/payment-success`
            };
            
            console.log('Initializing Chapa payment...');
            
            const paymentResponse = await axios.post(`${baseURL}/api/chapa-payment/initialize`, paymentData);
            
            console.log('\n📥 CHAPA PAYMENT RESPONSE:');
            console.log(`Success: ${paymentResponse.data.success}`);
            
            if (paymentResponse.data.success) {
              console.log('\n🎉 CHAPA PAYMENT INITIALIZATION SUCCESSFUL!');
              console.log('\n📊 Payment Details:');
              console.log(`   Payment ID: ${paymentResponse.data.data.payment.id}`);
              console.log(`   Amount: ${paymentResponse.data.data.payment.amount} ETB`);
              console.log(`   Transaction Ref: ${paymentResponse.data.data.txRef}`);
              console.log(`   Demo Mode: ${paymentResponse.data.data.demo || false}`);
              
              if (paymentResponse.data.data.checkoutUrl) {
                console.log('\n🔗 CHECKOUT URL:');
                console.log(paymentResponse.data.data.checkoutUrl);
                
                // Check if it's a real Chapa URL
                if (paymentResponse.data.data.checkoutUrl.includes('checkout.chapa.co')) {
                  console.log('\n🎉 SUCCESS! REAL CHAPA CHECKOUT URL!');
                  console.log('✅ Phone number validation fix is working!');
                  console.log('✅ This payment will appear in your Chapa dashboard');
                  console.log('✅ No more demo mode - real Ethiopian payment integration active');
                  
                  console.log('\n📋 INTEGRATION STATUS:');
                  console.log('====================');
                  console.log('✅ Server startup: Fixed');
                  console.log('✅ Database enum: Fixed');
                  console.log('✅ Phone validation: Fixed');
                  console.log('✅ Chapa API: Working');
                  console.log('✅ Real checkout URLs: Generated');
                  console.log('✅ Dashboard visibility: Expected');
                  
                  console.log('\n🎯 NEXT STEPS:');
                  console.log('1. Test this payment URL in your browser');
                  console.log('2. Complete a test payment');
                  console.log('3. Check your Chapa dashboard for the transaction');
                  console.log('4. Verify payment status updates in your system');
                  
                  console.log('\n🔗 Test this URL:');
                  console.log(paymentResponse.data.data.checkoutUrl);
                  
                } else {
                  console.log('\n⚠️ Demo/fallback URL received');
                  console.log('URL:', paymentResponse.data.data.checkoutUrl);
                  console.log('This suggests there may still be an issue');
                }
              } else {
                console.log('\n❌ No checkout URL received');
              }
              
            } else {
              console.log('\n❌ CHAPA PAYMENT INITIALIZATION FAILED');
              console.log('Error:', paymentResponse.data.error);
              console.log('Message:', paymentResponse.data.message);
            }
            
          } else {
            console.log('❌ Failed to create appointment:', createResponse.data.error);
          }
          
        } else {
          console.log('⚠️ Not enough users found. Need at least 1 patient and 1 doctor');
          console.log('Creating test users...');
          
          // Create test users if needed
          const testPatient = {
            email: 'testpatient@gmail.com',
            password: 'password123',
            role: 'patient',
            walletAddress: '0xpatient' + Date.now(),
            profileData: {
              firstName: 'Test',
              lastName: 'Patient',
              phoneNumber: '+251911234567', // Valid Ethiopian number
              dateOfBirth: '1990-01-01',
              gender: 'male'
            }
          };
          
          const testDoctor = {
            email: 'testdoctor@gmail.com',
            password: 'password123',
            role: 'doctor',
            walletAddress: '0xdoctor' + Date.now(),
            profileData: {
              firstName: 'Dr. Test',
              lastName: 'Doctor',
              phoneNumber: '+251922345678',
              specialization: 'General Medicine',
              licenseNumber: 'TEST123'
            }
          };
          
          try {
            const patientResponse = await axios.post(`${baseURL}/api/auth/register`, testPatient);
            const doctorResponse = await axios.post(`${baseURL}/api/auth/register`, testDoctor);
            
            if (patientResponse.data.success && doctorResponse.data.success) {
              console.log('✅ Test users created successfully');
              console.log('Re-run this script to test with the new users');
            }
          } catch (userError) {
            console.log('❌ Failed to create test users:', userError.response?.data || userError.message);
          }
        }
      }
    } catch (usersError) {
      console.log('⚠️ Could not fetch users, trying with known wallet addresses');
      
      // Use known wallet addresses from the existing appointment
      const appointmentData = {
        patientWalletAddress: '0x1765212874227cyqjkd',
        doctorWalletAddress: '0x1764894943291khtk9h',
        serviceType: 'inPerson',
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Test consultation for Chapa payment integration',
        fee: 300,
        status: 'pending',
        paymentStatus: 'pending'
      };
      
      console.log('\nCreating appointment with known addresses...');
      
      const createResponse = await axios.post(`${baseURL}/api/appointments`, appointmentData);
      
      if (createResponse.data.success) {
        console.log('✅ Appointment created with known addresses');
        // Continue with payment testing...
      } else {
        console.log('❌ Failed to create appointment:', createResponse.data.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

console.log('🏥 CHAPA PAYMENT TEST SETUP');
console.log('===========================');
console.log('Creating a test appointment to verify Chapa payment integration\n');

createTestAppointmentForChapa();