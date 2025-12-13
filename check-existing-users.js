import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function checkExistingUsers() {
  console.log('🔍 ========== CHECKING EXISTING USERS IN DATABASE ==========');
  
  try {
    // Import database models
    const db = await import('./server/src/models/index.js');
    const { User, Doctor, Patient } = db.default;
    
    // Check all users
    const users = await User.findAll({
      attributes: ['walletAddress', 'email', 'role', 'profileData'],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`👥 Found ${users.length} users in database:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`, {
        wallet: user.walletAddress,
        email: user.email,
        role: user.role,
        name: user.profileData?.name || user.profileData?.fullName || 'No name'
      });
    });
    
    // Check doctors specifically
    const doctors = await Doctor.findAll({
      limit: 10
    });
    
    console.log(`\n👨‍⚕️ Found ${doctors.length} doctors in Doctor table:`);
    
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. Doctor:`, {
        wallet: doctor.walletAddress,
        name: doctor.name,
        specialization: doctor.specialization
      });
    });
    
    // Check patients
    const patients = await Patient.findAll({
      limit: 10
    });
    
    console.log(`\n👤 Found ${patients.length} patients in Patient table:`);
    
    patients.forEach((patient, index) => {
      console.log(`${index + 1}. Patient:`, {
        wallet: patient.walletAddress,
        name: patient.name
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkExistingUsers().catch(console.error);