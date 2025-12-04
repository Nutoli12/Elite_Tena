// server/scripts/test-db.js
import { testConnection, sequelize } from './src/config/database.js';
import './src/models/index.js';

const testDatabase = async () => {
  console.log('🧪 Testing Database Connection...\n');

  try {
    // 1. Test basic connection
    console.log('1. Testing basic database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('❌ Database connection failed');
    }
    console.log('✅ Database connection successful');

    // 2. Test model synchronization
    console.log('\n2. Testing model synchronization...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Model synchronization successful');

    // 3. Test creating a test user
    console.log('\n3. Testing user creation...');
    const { User } = await import('./src/models/User.js');
    
    const testUser = await User.create({
      wallet_address: '0x742d35Cc6634C0532925a3b8D6B398e2C6F5eF7C',
      role: 'patient',
      email: 'test@elitetena.com'
    });
    console.log('✅ Test user created:', testUser.wallet_address);

    // 4. Test querying users
    console.log('\n4. Testing user query...');
    const users = await User.findAll();
    console.log(`✅ Found ${users.length} users in database`);

    // 5. Test appointment creation
    console.log('\n5. Testing appointment creation...');
    const { Appointment } = await import('./src/models/Appointment.js');
    
    const testAppointment = await Appointment.create({
      patient_wallet: '0x742d35Cc6634C0532925a3b8D6B398e2C6F5eF7C',
      doctor_wallet: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'scheduled',
      fee_eth: 0.1
    });
    console.log('✅ Test appointment created with ID:', testAppointment.id);

    // 6. Clean up test data
    console.log('\n6. Cleaning up test data...');
    await testAppointment.destroy();
    await testUser.destroy();
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 ALL DATABASE TESTS PASSED!');
    console.log('✅ Database is working correctly with Sequelize');
    console.log('✅ Models are properly defined');
    console.log('✅ CRUD operations are working');

  } catch (error) {
    console.error('\n❌ DATABASE TEST FAILED:');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Check if PostgreSQL is running on port 5433');
    console.error('2. Verify database "elite_tena" exists');
    console.error('3. Check if user "elite_user" has correct permissions');
    console.error('4. Verify the password in DATABASE_URL');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

testDatabase();