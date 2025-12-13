/**
 * Check Database Tables - Inspect what tables exist
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

async function checkDatabaseTables() {
  console.log('🔍 Checking Database Tables...\n');
  
  // Check if database file exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database file does not exist at:', DB_PATH);
    return;
  }
  
  console.log('✅ Database file exists at:', DB_PATH);

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database\n');
    });

    // Get all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        console.error('❌ Error getting tables:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log('📋 Available tables:');
      if (rows.length === 0) {
        console.log('   No tables found in database');
      } else {
        rows.forEach(row => {
          console.log(`   - ${row.name}`);
        });
      }

      // Check for appointment-related tables
      const appointmentTables = rows.filter(row => 
        row.name.toLowerCase().includes('appointment')
      );

      if (appointmentTables.length > 0) {
        console.log('\n📅 Appointment-related tables found:');
        appointmentTables.forEach(table => {
          console.log(`   - ${table.name}`);
        });

        // Check the first appointment table for records
        const tableName = appointmentTables[0].name;
        db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countRows) => {
          if (err) {
            console.error(`❌ Error counting records in ${tableName}:`, err.message);
          } else {
            console.log(`\n📊 Records in ${tableName}: ${countRows[0].count}`);
          }

          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err.message);
            }
            resolve();
          });
        });
      } else {
        console.log('\n📅 No appointment-related tables found');
        
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

// Run the check
checkDatabaseTables().catch(console.error);