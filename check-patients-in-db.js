#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();

function checkPatients() {
  console.log('🔍 Checking patients in database...\n');
  
  const db = new sqlite3.Database('./database.sqlite');

  db.all('SELECT walletAddress, email, role, profileData FROM users WHERE role = ?', ['patient'], (err, rows) => {
    if (err) {
      console.log('❌ Error:', err.message);
    } else {
      console.log(`📊 Patients found in database: ${rows.length}\n`);
      
      if (rows.length > 0) {
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.email}`);
          console.log(`   Wallet: ${row.walletAddress}`);
          
          if (row.profileData) {
            try {
              const profile = JSON.parse(row.profileData);
              const fullName = profile.fullName || 
                              (profile.firstName && profile.lastName 
                                ? `${profile.firstName} ${profile.lastName}` 
                                : 'Unknown');
              console.log(`   Name: ${fullName}`);
            } catch (e) {
              console.log('   Name: Unknown (invalid profile data)');
            }
          } else {
            console.log('   Name: No profile data');
          }
          console.log('');
        });
      } else {
        console.log('⚠️  No patients found in database.');
        console.log('💡 You may need to register some test patients first.');
      }
    }
    
    db.close();
  });
}

checkPatients();