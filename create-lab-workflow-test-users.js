import db from './server/src/models/index.js';

const { User } = db;

async function createLabWorkflowTestUsers() {
  try {
    console.log('🧪 Creating Lab Workflow Test Users...');

    // Create test users with different roles (using plain text passwords for testing)
    const testUsers = [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'dr.sarah@elitetena.com',
        password: 'password123', // Will be hashed by the model
        role: 'doctor',
        phone: '+1234567890',
        dateOfBirth: '1980-05-15',
        gender: 'female',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x2345678901234567890123456789012345678901',
        firstName: 'Mike',
        lastName: 'Chen',
        email: 'mike.chen@elitetena.com',
        password: 'password123',
        role: 'lab_technician',
        phone: '+1234567891',
        dateOfBirth: '1985-08-22',
        gender: 'male',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x3456789012345678901234567890123456789012',
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@elitetena.com',
        password: 'password123',
        role: 'patient',
        phone: '+1234567892',
        dateOfBirth: '1990-12-03',
        gender: 'female',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x4567890123456789012345678901234567890123',
        firstName: 'Dr. Robert',
        lastName: 'Wilson',
        email: 'dr.robert@elitetena.com',
        password: 'password123',
        role: 'doctor',
        phone: '+1234567893',
        dateOfBirth: '1975-03-18',
        gender: 'male',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x5678901234567890123456789012345678901234',
        firstName: 'Lisa',
        lastName: 'Martinez',
        email: 'lisa.martinez@elitetena.com',
        password: 'password123',
        role: 'lab_technician',
        phone: '+1234567894',
        dateOfBirth: '1988-07-11',
        gender: 'female',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x6789012345678901234567890123456789012345',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@elitetena.com',
        password: 'password123',
        role: 'patient',
        phone: '+1234567895',
        dateOfBirth: '1985-09-25',
        gender: 'male',
        isActive: true,
        isVerified: true
      },
      {
        walletAddress: '0x7890123456789012345678901234567890123456',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@elitetena.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1234567896',
        dateOfBirth: '1970-01-01',
        gender: 'other',
        isActive: true,
        isVerified: true
      }
    ];

    console.log('Creating users...');
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`✅ User ${userData.email} already exists`);
          continue;
        }

        const user = await User.create(userData);
        console.log(`✅ Created ${userData.role}: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('\n🎉 Lab Workflow Test Users Created Successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('='.repeat(50));
    console.log('👨‍⚕️ DOCTORS:');
    console.log('  • dr.sarah@elitetena.com / password123');
    console.log('  • dr.robert@elitetena.com / password123');
    console.log('\n🔬 LAB TECHNICIANS:');
    console.log('  • mike.chen@elitetena.com / password123');
    console.log('  • lisa.martinez@elitetena.com / password123');
    console.log('\n🏥 PATIENTS:');
    console.log('  • emily.davis@elitetena.com / password123');
    console.log('  • john.smith@elitetena.com / password123');
    console.log('\n👑 ADMIN:');
    console.log('  • admin@elitetena.com / admin123');
    console.log('='.repeat(50));

    // Display wallet addresses for easy testing
    console.log('\n🔑 Wallet Addresses for API Testing:');
    console.log('='.repeat(50));
    testUsers.forEach(user => {
      console.log(`${user.role.toUpperCase().padEnd(15)} | ${user.walletAddress}`);
    });
    console.log('='.repeat(50));

    console.log('\n🚀 Ready to test Lab Workflow System!');
    console.log('1. Login with any of the above credentials');
    console.log('2. Navigate to /lab-workflow in the frontend');
    console.log('3. Test role-based functionality:');
    console.log('   - Doctors: Create orders, review results');
    console.log('   - Lab Technicians: Process samples, upload results');
    console.log('   - Patients: View their lab history');
    console.log('   - Admin: Full system access');

  } catch (error) {
    console.error('❌ Error creating lab workflow test users:', error);
  } finally {
    await db.sequelize.close();
  }
}

// Run the script
createLabWorkflowTestUsers();