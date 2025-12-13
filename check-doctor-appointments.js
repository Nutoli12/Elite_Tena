import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function checkDoctorAppointments() {
  console.log('🔍 ========== CHECKING DOCTOR APPOINTMENTS IN DATABASE ==========');
  
  try {
    // Import database models
    const db = await import('./server/src/models/index.js');
    const { Appointment, User, Doctor, Patient } = db.default;
    
    const doctorWallet = '0x1765465194183a78fkp:1';
    console.log('👨‍⚕️ Checking appointments for doctor:', doctorWallet);
    
    // Check if doctor exists
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet.toLowerCase() }
    });
    
    if (!doctor) {
      console.log('❌ Doctor not found in Doctor table');
      
      // Check if user exists
      const user = await User.findOne({
        where: { walletAddress: doctorWallet.toLowerCase() }
      });
      
      if (user) {
        console.log('✅ User found:', {
          wallet: user.walletAddress,
          role: user.role,
          email: user.email,
          profileData: user.profileData
        });
        
        if (user.role === 'doctor') {
          console.log('🔧 Creating missing doctor record...');
          const newDoctor = await Doctor.create({
            walletAddress: doctorWallet.toLowerCase(),
            specialization: user.profileData?.specialization || 'General Practice',
            name: user.profileData?.name || user.profileData?.fullName || 'Doctor'
          });
          console.log('✅ Doctor record created:', newDoctor.toJSON());
        }
      } else {
        console.log('❌ User not found either');
        return;
      }
    } else {
      console.log('✅ Doctor found:', doctor.toJSON());
    }
    
    // Check appointments with exact wallet match
    const appointments = await Appointment.findAll({
      where: { 
        doctorWalletAddress: doctorWallet.toLowerCase()
      },
      limit: 10
    });
    
    console.log(`📋 Found ${appointments.length} appointments for doctor`);
    
    if (appointments.length > 0) {
      appointments.forEach((apt, index) => {
        console.log(`📅 Appointment ${index + 1}:`, {
          id: apt.id,
          patientWallet: apt.patientWalletAddress,
          doctorWallet: apt.doctorWalletAddress,
          date: apt.appointmentDate,
          status: apt.status,
          reason: apt.reason
        });
      });
    }
    
    // Check all appointments in database
    const allAppointments = await Appointment.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n📊 Total appointments in database: ${allAppointments.length}`);
    if (allAppointments.length > 0) {
      console.log('📅 Recent appointments:');
      allAppointments.forEach((apt, index) => {
        console.log(`  ${index + 1}. Doctor: ${apt.doctorWalletAddress}, Patient: ${apt.patientWalletAddress}, Date: ${apt.appointmentDate}`);
      });
    }
    
    // Check if there are any doctors in the system
    const allDoctors = await Doctor.findAll({
      limit: 5
    });
    
    console.log(`\n👨‍⚕️ Total doctors in database: ${allDoctors.length}`);
    if (allDoctors.length > 0) {
      console.log('👨‍⚕️ Doctors:');
      allDoctors.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.walletAddress} - ${doc.name || 'No name'} (${doc.specialization})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking appointments:', error);
  }
}

checkDoctorAppointments().catch(console.error);