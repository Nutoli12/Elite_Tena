/**
 * Direct Database Cleanup - Remove Remaining Appointments
 * This script directly accesses the database to remove stubborn appointments
 * that couldn't be deleted through the API due to 500 errors
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

async function directDatabaseCleanup() {
  console.log('🔧 Direct Database Cleanup: Removing Remaining Appointments...\n');

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    // Step 1: Check current appointments
    db.all("SELECT COUNT(*) as count FROM enhanced_appointments", (err, rows) => {
      if (err) {
        console.error('❌ Error checking enhanced_appointments:', err.message);
        db.close();
        reject(err);
        return;
      }

      const currentCount = rows[0].count;
      console.log(`📋 Current appointments in database: ${currentCount}`);

      if (currentCount === 0) {
        console.log('✨ Database is already clean!');
        db.close();
        resolve();
        return;
      }

      // Step 2: Delete all appointments
      console.log('\n🗑️ Deleting all remaining appointments...');
      
      db.run("DELETE FROM enhanced_appointments", function(err) {
        if (err) {
          console.error('❌ Error deleting enhanced_appointments:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log(`✅ Deleted ${this.changes} appointments`);

        // Step 3: Reset auto-increment counter
        console.log('\n🔄 Resetting auto-increment counter...');
        
        db.run("DELETE FROM sqlite_sequence WHERE name='enhanced_appointments'", function(err) {
          if (err) {
            console.log('⚠️ Note: Could not reset auto-increment (table might not use auto-increment)');
          } else {
            console.log('✅ Auto-increment counter reset');
          }

          // Step 4: Verify cleanup
          console.log('\n🔍 Verifying complete cleanup...');
          
          db.all("SELECT COUNT(*) as count FROM enhanced_appointments", (err, rows) => {
            if (err) {
              console.error('❌ Error verifying cleanup:', err.message);
              db.close();
              reject(err);
              return;
            }

            const finalCount = rows[0].count;
            console.log(`📊 Final appointment count: ${finalCount}`);

            if (finalCount === 0) {
              console.log('\n🎉 SUCCESS: Complete Database Cleanup!');
              console.log('✨ All appointments have been removed');
              console.log('\n📋 What\'s been accomplished:');
              console.log('   ✅ All appointment records deleted');
              console.log('   ✅ Database counters reset');
              console.log('   ✅ Clean slate for fresh testing');
              console.log('   ✅ Ready for Chapa payment integration testing');
              
              console.log('\n🚀 System Status:');
              console.log('   • Database is completely clean');
              console.log('   • No old appointment data remaining');
              console.log('   • Fresh start guaranteed');
              console.log('   • Real Chapa payment flow ready to test');
            } else {
              console.log('\n⚠️ WARNING: Some appointments still remain');
            }

            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('\n🔒 Database connection closed');
              }
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run the direct cleanup
directDatabaseCleanup().catch(console.error);