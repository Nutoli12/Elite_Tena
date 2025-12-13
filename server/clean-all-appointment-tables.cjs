/**
 * Clean All Appointment Tables - Remove appointments from all tables
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

async function cleanAllAppointmentTables() {
  console.log('🧹 Cleaning All Appointment Tables...\n');

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    // Get all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        console.error('❌ Error getting tables:', err.message);
        db.close();
        reject(err);
        return;
      }

      // Find all appointment-related tables
      const appointmentTables = rows.filter(row => 
        row.name.toLowerCase().includes('appointment')
      ).map(row => row.name);

      console.log('📋 Found appointment tables:', appointmentTables);

      if (appointmentTables.length === 0) {
        console.log('✨ No appointment tables found');
        db.close();
        resolve();
        return;
      }

      let completedTables = 0;
      let totalDeleted = 0;

      // Clean each appointment table
      appointmentTables.forEach(tableName => {
        console.log(`\n🗑️ Cleaning table: ${tableName}`);
        
        // First check count
        db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countRows) => {
          if (err) {
            console.error(`❌ Error counting ${tableName}:`, err.message);
            completedTables++;
            if (completedTables === appointmentTables.length) {
              finishCleanup();
            }
            return;
          }

          const count = countRows[0].count;
          console.log(`   Records before: ${count}`);

          if (count === 0) {
            console.log(`   ✅ ${tableName} already clean`);
            completedTables++;
            if (completedTables === appointmentTables.length) {
              finishCleanup();
            }
            return;
          }

          // Delete all records
          db.run(`DELETE FROM ${tableName}`, function(err) {
            if (err) {
              console.error(`❌ Error deleting from ${tableName}:`, err.message);
            } else {
              console.log(`   ✅ Deleted ${this.changes} records from ${tableName}`);
              totalDeleted += this.changes;
            }

            // Reset auto-increment if exists
            db.run(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`, function(err) {
              if (err) {
                console.log(`   ⚠️ Could not reset auto-increment for ${tableName}`);
              } else {
                console.log(`   ✅ Reset auto-increment for ${tableName}`);
              }

              completedTables++;
              if (completedTables === appointmentTables.length) {
                finishCleanup();
              }
            });
          });
        });
      });

      function finishCleanup() {
        console.log('\n🔍 Final verification...');
        
        let verifiedTables = 0;
        let finalTotal = 0;

        appointmentTables.forEach(tableName => {
          db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, rows) => {
            if (err) {
              console.error(`❌ Error verifying ${tableName}:`, err.message);
            } else {
              const count = rows[0].count;
              finalTotal += count;
              console.log(`   ${tableName}: ${count} records`);
            }

            verifiedTables++;
            if (verifiedTables === appointmentTables.length) {
              console.log('\n📊 Cleanup Summary:');
              console.log(`   Tables cleaned: ${appointmentTables.length}`);
              console.log(`   Total records deleted: ${totalDeleted}`);
              console.log(`   Final total records: ${finalTotal}`);

              if (finalTotal === 0) {
                console.log('\n🎉 SUCCESS: All appointment tables are clean!');
                console.log('✨ Database is ready for fresh testing');
                console.log('\n🚀 Ready for Chapa payment integration testing');
              } else {
                console.log('\n⚠️ WARNING: Some records still remain');
              }

              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err.message);
                }
                resolve();
              });
            }
          });
        });
      }
    });
  });
}

// Run the cleanup
cleanAllAppointmentTables().catch(console.error);