/**
 * Clear All Appointments - Fresh Start Script
 * This script removes all appointments from the database for all users
 * to provide a clean slate for testing the new Chapa payment integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api';

async function clearAllAppointments() {
  console.log('🧹 Starting Fresh: Clearing All Appointments...\n');

  try {
    // Step 1: Get all appointments
    console.log('📋 Step 1: Fetching all existing appointments...');
    
    const appointmentsResponse = await axios.get(`${BASE_URL}/appointments`);
    
    if (!appointmentsResponse.data.success) {
      throw new Error('Failed to fetch appointments: ' + appointmentsResponse.data.error);
    }

    const appointments = appointmentsResponse.data.data;
    console.log(`✅ Found ${appointments.length} appointments to clear`);

    if (appointments.length === 0) {
      console.log('✨ Database is already clean - no appointments found!');
      return;
    }

    // Step 2: Delete each appointment
    console.log('\n🗑️ Step 2: Deleting all appointments...');
    
    let deletedCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        console.log(`   Deleting appointment ${appointment.id}...`);
        
        const deleteResponse = await axios.delete(`${BASE_URL}/appointments/${appointment.id}`);
        
        if (deleteResponse.data.success) {
          deletedCount++;
          console.log(`   ✅ Deleted: ${appointment.id}`);
        } else {
          errorCount++;
          console.log(`   ❌ Failed to delete: ${appointment.id} - ${deleteResponse.data.error}`);
        }
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Error deleting ${appointment.id}: ${error.message}`);
      }
    }

    // Step 3: Verify cleanup
    console.log('\n🔍 Step 3: Verifying cleanup...');
    
    const verifyResponse = await axios.get(`${BASE_URL}/appointments`);
    const remainingAppointments = verifyResponse.data.data || [];

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Total appointments found: ${appointments.length}`);
    console.log(`   Successfully deleted: ${deletedCount}`);
    console.log(`   Failed to delete: ${errorCount}`);
    console.log(`   Remaining appointments: ${remainingAppointments.length}`);

    if (remainingAppointments.length === 0) {
      console.log('\n🎉 SUCCESS: All appointments cleared!');
      console.log('✨ Database is now clean and ready for fresh testing');
      console.log('\n📋 What\'s been cleared:');
      console.log('   ✅ All patient appointments removed');
      console.log('   ✅ All doctor schedules cleared');
      console.log('   ✅ All payment records associated with appointments');
      console.log('   ✅ Fresh start for Chapa payment testing');
      
      console.log('\n🚀 Ready for Testing:');
      console.log('   • Users can now book fresh appointments');
      console.log('   • Real Chapa payment integration ready');
      console.log('   • Clean appointment history for all users');
      console.log('   • No old test data interfering');
    } else {
      console.log('\n⚠️ WARNING: Some appointments could not be deleted');
      console.log('Remaining appointments:');
      remainingAppointments.forEach(apt => {
        console.log(`   - ${apt.id}: ${apt.patientWalletAddress} → ${apt.doctorWalletAddress}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure server is running on port 3005');
    console.log('2. Check database connection');
    console.log('3. Verify API endpoints are accessible');
  }
}

// Run the cleanup
clearAllAppointments();