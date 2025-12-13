/**
 * Check Frontend Patient Appointments - Debug why they're not showing
 */

const axios = require('axios');

async function checkFrontendPatientAppointments() {
  console.log('🔍 CHECKING FRONTEND PATIENT APPOINTMENTS\n');
  
  const baseURL = 'http://localhost:3005';
  
  try {
    // 1. List all patients with appointments
    console.log('📋 1. LISTING ALL PATIENTS WITH APPOINTMENTS\n');
    
    const allAppointments = await axios.get(`${baseURL}/api/appointments`);
    
    if (allAppointments.data.success) {
      const appointments = allAppointments.data.data;
      
      // Get unique patients
      const patients = [...new Set(appointments.map(apt => apt.patientWalletAddress))];
      
      console.log('Patients with appointments:');
      patients.forEach((patient, index) => {
        const patientAppointments = appointments.filter(apt => apt.patientWalletAddress === patient);
        console.log(`  ${index + 1}. ${patient}`);
        console.log(`     Appointments: ${patientAppointments.length}`);
        patientAppointments.forEach(apt => {
          console.log(`       - ${apt.id.substring(0, 8)}... | Status: ${apt.status} | Payment: ${apt.paymentStatus}`);
        });
      });
      
      // 2. Test each patient's appointments query
      console.log('\n📋 2. TESTING PATIENT APPOINTMENT QUERIES\n');
      
      for (const patient of patients) {
        console.log(`\nTesting patient: ${patient}`);
        
        try {
          const patientResponse = await axios.get(`${baseURL}/api/appointments`, {
            params: {
              userRole: 'patient',
              userId: patient
            }
          });
          
          if (patientResponse.data.success) {
            console.log(`  ✅ Found ${patientResponse.data.data.length} appointments`);
            patientResponse.data.data.forEach(apt => {
              console.log(`     - ${apt.id.substring(0, 8)}... | Status: ${apt.status} | Payment: ${apt.paymentStatus}`);
            });
          } else {
            console.log(`  ❌ Error: ${patientResponse.data.error}`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.response?.data?.error || error.message}`);
        }
      }
      
      // 3. Check the specific patient you mentioned
      console.log('\n📋 3. CHECKING SPECIFIC PATIENTS\n');
      
      const testPatients = [
        '0x1765212874227cyqjkd',
        '0x1765374535552776ch',
        '0x1765541507113ps2c0n'
      ];
      
      for (const patient of testPatients) {
        console.log(`\nPatient: ${patient}`);
        
        try {
          const response = await axios.get(`${baseURL}/api/appointments`, {
            params: {
              userRole: 'patient',
              userId: patient
            }
          });
          
          if (response.data.success) {
            const appointments = response.data.data;
            console.log(`  Found ${appointments.length} appointments`);
            
            if (appointments.length > 0) {
              appointments.forEach(apt => {
                console.log(`  ✅ Appointment: ${apt.id.substring(0, 8)}...`);
                console.log(`     Doctor: ${apt.displayDoctor || apt.appointedWith?.name || 'Unknown'}`);
                console.log(`     Date: ${apt.appointmentDate}`);
                console.log(`     Status: ${apt.status}`);
                console.log(`     Payment: ${apt.paymentStatus}`);
                console.log(`     Fee: ${apt.fee} ETB`);
              });
            } else {
              console.log('  ⚠️ No appointments found for this patient');
            }
          } else {
            console.log(`  ❌ Error: ${response.data.error}`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.response?.data?.error || error.message}`);
        }
      }
      
      // 4. Summary
      console.log('\n📊 4. SUMMARY\n');
      
      console.log('Total appointments in database:', appointments.length);
      console.log('Paid appointments:', appointments.filter(apt => apt.paymentStatus === 'paid').length);
      console.log('Scheduled appointments:', appointments.filter(apt => apt.status === 'scheduled').length);
      console.log('Pending appointments:', appointments.filter(apt => apt.status === 'pending').length);
      
      console.log('\n💡 POSSIBLE ISSUES:');
      console.log('1. You might be logged in as a different patient than the one with appointments');
      console.log('2. Check your browser console for the wallet address being used');
      console.log('3. The wallet address might have case sensitivity issues');
      
      console.log('\n🔧 TO FIX:');
      console.log('1. Check which wallet address you\'re logged in with');
      console.log('2. Make sure it matches one of the patients above');
      console.log('3. If different, log in with the correct account');
      
    } else {
      console.log('❌ Failed to get appointments:', allAppointments.data.error);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkFrontendPatientAppointments();