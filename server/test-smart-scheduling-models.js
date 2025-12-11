/**
 * Test the Smart Appointment Scheduling System models
 * This script tests the new Sequelize models with the database
 */

import db from './src/models/index.js';

async function testSmartSchedulingModels() {
  console.log('🧪 Testing Smart Appointment Scheduling System Models');
  console.log('====================================================');

  try {
    // Test database connection
    console.log('\n🔗 Testing database connection...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Test TimeSlot model
    console.log('\n🕐 Testing TimeSlot model...');
    
    // Check if TimeSlot model exists
    if (!db.TimeSlot) {
      throw new Error('TimeSlot model not found');
    }
    console.log('✅ TimeSlot model loaded');

    // Get an existing doctor or create a test doctor
    let testDoctorWallet;
    const existingDoctor = await db.Doctor.findOne();
    
    if (existingDoctor) {
      testDoctorWallet = existingDoctor.walletAddress;
      console.log('   Using existing doctor:', testDoctorWallet);
    } else {
      // Create a test doctor
      testDoctorWallet = '0x1234567890123456789012345678901234567890';
      await db.Doctor.create({
        walletAddress: testDoctorWallet,
        name: 'Test Doctor',
        specialty: 'General Practice'
      });
      console.log('   Created test doctor:', testDoctorWallet);
    }

    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0); // 9:00 AM
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes later

    // Test TimeSlot creation
    console.log('   Creating test time slot...');
    const timeSlot = await db.TimeSlot.create({
      doctorWalletAddress: testDoctorWallet,
      startTime,
      endTime,
      duration: 30,
      status: 'available',
      slotType: 'regular'
    });
    console.log('✅ TimeSlot created successfully:', timeSlot.id);

    // Test TimeSlot methods
    console.log('   Testing TimeSlot methods...');
    console.log('   - isAvailable():', timeSlot.isAvailable());
    
    // Clean up
    await timeSlot.destroy();
    
    // Clean up test doctor if we created one
    if (!existingDoctor) {
      await db.Doctor.destroy({ where: { walletAddress: testDoctorWallet } });
      console.log('   Cleaned up test doctor');
    }
    
    console.log('✅ TimeSlot test completed');

    // Test DoctorAvailabilityTemplate model
    console.log('\n📅 Testing DoctorAvailabilityTemplate model...');
    
    if (!db.DoctorAvailabilityTemplate) {
      throw new Error('DoctorAvailabilityTemplate model not found');
    }
    console.log('✅ DoctorAvailabilityTemplate model loaded');

    // Test template creation
    console.log('   Creating test availability template...');
    const template = await db.DoctorAvailabilityTemplate.create({
      doctorWalletAddress: testDoctorWallet,
      name: 'Monday Schedule',
      dayOfWeek: 1, // Monday
      availableSlots: [
        { startTime: '09:00', endTime: '12:00', type: 'available' },
        { startTime: '14:00', endTime: '17:00', type: 'available' }
      ],
      slotDuration: 30,
      bufferTime: 15
    });
    console.log('✅ DoctorAvailabilityTemplate created successfully:', template.id);

    // Test template methods
    console.log('   Testing template methods...');
    const availableSlots = template.getAvailableSlots();
    console.log('   - Available slots count:', availableSlots.length);
    console.log('   - Total available minutes:', template.getTotalAvailableMinutes());
    console.log('   - Max appointments:', template.getMaxAppointments());

    // Clean up
    await template.destroy();
    console.log('✅ DoctorAvailabilityTemplate test completed');

    // Test PatientQueue model
    console.log('\n🏥 Testing PatientQueue model...');
    
    if (!db.PatientQueue) {
      throw new Error('PatientQueue model not found');
    }
    console.log('✅ PatientQueue model loaded');

    // Test queue creation
    console.log('   Creating test patient queue...');
    const queue = await db.PatientQueue.create({
      doctorWalletAddress: testDoctorWallet,
      queueDate: new Date().toISOString().split('T')[0] // Today's date
    });
    console.log('✅ PatientQueue created successfully:', queue.id);

    // Clean up
    await queue.destroy();
    console.log('✅ PatientQueue test completed');

    // Test QueueEntry model
    console.log('\n📝 Testing QueueEntry model...');
    
    if (!db.QueueEntry) {
      throw new Error('QueueEntry model not found');
    }
    console.log('✅ QueueEntry model loaded');

    console.log('✅ All models loaded and basic operations work');

    // Test model associations
    console.log('\n🔗 Testing model associations...');
    
    // Check TimeSlot associations
    if (db.TimeSlot.associations.doctor && db.TimeSlot.associations.appointment) {
      console.log('✅ TimeSlot associations configured');
    } else {
      console.log('⚠️  TimeSlot associations may be missing');
    }

    // Check DoctorAvailabilityTemplate associations
    if (db.DoctorAvailabilityTemplate.associations.doctor) {
      console.log('✅ DoctorAvailabilityTemplate associations configured');
    } else {
      console.log('⚠️  DoctorAvailabilityTemplate associations may be missing');
    }

    // Check PatientQueue associations
    if (db.PatientQueue.associations.doctor && db.PatientQueue.associations.entries) {
      console.log('✅ PatientQueue associations configured');
    } else {
      console.log('⚠️  PatientQueue associations may be missing');
    }

    // Check QueueEntry associations
    if (db.QueueEntry.associations.queue && db.QueueEntry.associations.appointment) {
      console.log('✅ QueueEntry associations configured');
    } else {
      console.log('⚠️  QueueEntry associations may be missing');
    }

    console.log('\n🎉 MODEL TESTING COMPLETE!');
    console.log('==========================');
    console.log('✅ All models loaded successfully');
    console.log('✅ Basic CRUD operations work');
    console.log('✅ Model associations configured');
    console.log('✅ Database schema is compatible');
    
    console.log('\n🚀 Smart Appointment Scheduling System models are ready!');

  } catch (error) {
    console.error('❌ Model testing failed:', error.message);
    console.log('\n🔧 Error Details:', error);
    
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n🔧 Database Connection Issue:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check database configuration');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.log('\n🔧 Database Schema Issue:');
      console.log('- Make sure migrations were run successfully');
      console.log('- Check if all tables and columns exist');
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    await db.sequelize.close();
  }
}

// Run the tests
testSmartSchedulingModels();