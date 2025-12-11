/**
 * Test Smart Scheduling System - Complete Implementation
 * Tests all major components of the smart scheduling system
 */

import db from './server/src/models/index.js';
import SlotManager from './server/src/services/SlotManager.js';
import QueueService from './server/src/services/QueueService.js';
import EmergencyManager from './server/src/services/EmergencyManager.js';
import DynamicDurationManager from './server/src/services/DynamicDurationManager.js';

async function testSmartSchedulingSystem() {
  console.log('🚀 Testing Complete Smart Scheduling System...\n');
  
  try {
    // Test 1: Slot Management
    console.log('1️⃣ Testing Slot Management...');
    const doctorWallet = 'doctor123';
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    
    const slots = await SlotManager.createSlots(doctorWallet, {
      date: today.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      bufferTime: 15
    });
    
    console.log(`✅ Created ${slots.length} time slots`);
    
    // Test 2: Emergency Management
    console.log('\n2️⃣ Testing Emergency Management...');
    
    // Reserve some emergency slots
    const emergencySlots = await EmergencyManager.reserveEmergencySlots(
      doctorWallet,
      today,
      { percentage: 0.2, minSlots: 2 }
    );
    
    console.log(`✅ Reserved ${emergencySlots.length} emergency slots`);
    
    // Find emergency slot
    const emergencyResult = await EmergencyManager.findEmergencySlot(doctorWallet, {
      urgencyLevel: 'high',
      requiredDuration: 30
    });
    
    console.log(`✅ Emergency slot strategy: ${emergencyResult.strategy}`);
    
    // Test 3: Queue Management
    console.log('\n3️⃣ Testing Queue Management...');
    
    // Create a test appointment first
    const appointment = await db.Appointment.create({
      patientWalletAddress: 'patient123',
      doctorWalletAddress: doctorWallet,
      scheduledStartTime: slots[0].startTime,
      scheduledEndTime: slots[0].endTime,
      estimatedDuration: 30,
      status: 'scheduled',
      reason: 'Test appointment'
    });
    
    // Add to queue
    const queueResult = await QueueService.addToQueue(
      doctorWallet,
      'patient123',
      appointment.id,
      { appointmentDate: today }
    );
    
    console.log(`✅ Added patient to queue at position ${queueResult.queueEntry.position}`);
    
    // Test 4: Dynamic Duration Management
    console.log('\n4️⃣ Testing Dynamic Duration Management...');
    
    // Start appointment
    const startResult = await DynamicDurationManager.startAppointment(appointment.id);
    console.log(`✅ Started appointment at ${startResult.actualStartTime}`);
    
    // Simulate some time passing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete appointment
    const completeResult = await DynamicDurationManager.completeAppointment(appointment.id);
    console.log(`✅ Completed appointment with ${completeResult.durationDifference} minute variance`);
    
    // Test 5: Buffer Time Enforcement
    console.log('\n5️⃣ Testing Buffer Time Enforcement...');
    
    const bufferCheck = await DynamicDurationManager.enforceBufferTime(
      doctorWallet,
      new Date(today.getTime() + 60 * 60000), // 1 hour later
      new Date(today.getTime() + 90 * 60000), // 1.5 hours later
      15 // 15 minute buffer
    );
    
    console.log(`✅ Buffer validation: ${bufferCheck.isValid ? 'Valid' : 'Invalid'}`);
    
    // Test 6: Statistics
    console.log('\n6️⃣ Testing Statistics...');
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [queueStats, emergencyStats, durationStats] = await Promise.all([
      QueueService.getQueueStatistics(doctorWallet, today, tomorrow),
      EmergencyManager.getEmergencyStatistics(doctorWallet, today, tomorrow),
      DynamicDurationManager.getDurationStatistics(doctorWallet, today, tomorrow)
    ]);
    
    console.log(`✅ Queue Stats: ${queueStats.totalPatients} patients, ${queueStats.averageWaitTime} min avg wait`);
    console.log(`✅ Emergency Stats: ${emergencyStats.totalEmergencies} emergencies, ${emergencyStats.successRate}% success rate`);
    console.log(`✅ Duration Stats: ${durationStats.totalAppointments} appointments, ${durationStats.onTimePercentage}% on time`);
    
    console.log('\n🎉 All Smart Scheduling System tests completed successfully!');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.QueueEntry.destroy({ where: { appointmentId: appointment.id } });
    await db.PatientQueue.destroy({ where: { doctorWalletAddress: doctorWallet } });
    await db.Appointment.destroy({ where: { id: appointment.id } });
    await db.TimeSlot.destroy({ where: { doctorWalletAddress: doctorWallet } });
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.sequelize.close();
  }
}

// Run the test
testSmartSchedulingSystem();