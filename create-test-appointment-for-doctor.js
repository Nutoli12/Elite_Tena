import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function createTestAppointment() {
  console.log('🔍 ========== CREATING TEST APPOINTMENT FOR DOCTOR ==========');
  
  try {
    // Import database models
    const db = await import('./server/src/models/index.js');
    const { Appointment, User, Doctor, Patient } = db.default;
    
    const doctorWallet = '0x1765465194183a78fkp'; // Correct wallet without :1
    const patientWallet = '0x19b0db9a9f7rht2i'; // Existing patient
    
    console.log('👨‍⚕️ Doctor wallet:', doctorWallet);
    console.log('👤 Patient wallet:', patientWallet);
    
    // Ensure doctor exists
    let doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() }
    });
    
    if (!doctor) {
      console.log('🔧 Creating doctor record...');
      doctor = await Doctor.create({
        walletAddress: doctorWallet.toLowerCase(),
        specialization: 'Surgen',
        name: 'Tilahun Abera'
      });
    }
    
    // Ensure patient exists
    let patient = await Patient.findOne({
      where: { walletAddress: patientWallet.toLowerCase() }
    });
    
    if (!patient) {
      console.log('🔧 Creating patient record...');
      patient = await Patient.create({
        walletAddress: patientWallet.toLowerCase(),
        name: 'Semir Yusuf'
      });
    }
    
    // Create test appointment
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
    appointmentDate.setHours(14, 0, 0, 0); // 2:00 PM
    
    const appointment = await Appointment.create({
      patientWalletAddress: patientWallet.toLowerCase(),
      doctorWalletAddress: doctorWallet.toLowerCase(),
      appointmentDate,
      reason: 'Regular checkup',
      duration: 30,
      status: 'scheduled',
      paymentStatus: 'pending',
      fee: 0,
      serviceType: 'inPerson'
    });
    
    console.log('✅ Test appointment created:', {
      id: appointment.id,
      patient: appointment.patientWalletAddress,
      doctor: appointment.doctorWalletAddress,
      date: appointment.appointmentDate,
      status: appointment.status
    });
    
    // Test the API call
    console.log('\n🔍 Testing API call...');
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:3004/api/appointments', {
        params: {
          userRole: 'doctor',
          userId: doctorWallet
        }
      });
      
      console.log('✅ API Response:', {
        success: response.data.success,
        count: response.data.count,
        appointments: response.data.data.length
      });
      
      if (response.data.data.length > 0) {
        console.log('📅 First appointment:', {
          id: response.data.data[0].id,
          patient: response.data.data[0].patientWalletAddress,
          doctor: response.data.data[0].doctorWalletAddress,
          date: response.data.data[0].appointmentDate
        });
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestAppointment().catch(console.error);