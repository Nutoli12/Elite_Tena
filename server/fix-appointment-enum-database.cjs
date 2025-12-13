/**
 * Fix Appointment Enum Database Issue
 * The database has appointments with status "payment_pending" but this is not in the enum
 */

const { Client } = require('pg');
require('dotenv').config();

async function fixAppointmentEnumDatabase() {
  console.log('🔧 FIXING APPOINTMENT ENUM DATABASE ISSUE\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // 1. Check current enum values
    console.log('\n1. Checking current enum values...');
    
    const enumQuery = `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_appointments_status'
      )
      ORDER BY enumsortorder;
    `;
    
    const enumResult = await client.query(enumQuery);
    console.log('Current enum values:', enumResult.rows.map(row => row.enumlabel));
    
    // 2. Check what status values exist in the appointments table
    console.log('\n2. Checking existing status values in appointments...');
    
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM appointments 
      GROUP BY status
      ORDER BY count DESC;
    `;
    
    const statusResult = await client.query(statusQuery);
    console.log('Existing status values:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} appointments`);
    });
    
    // 3. Check payment status values
    console.log('\n3. Checking payment status values...');
    
    const paymentStatusQuery = `
      SELECT "paymentStatus", COUNT(*) as count
      FROM appointments 
      WHERE "paymentStatus" IS NOT NULL
      GROUP BY "paymentStatus"
      ORDER BY count DESC;
    `;
    
    const paymentStatusResult = await client.query(paymentStatusQuery);
    console.log('Existing payment status values:');
    paymentStatusResult.rows.forEach(row => {
      console.log(`  ${row.paymentStatus}: ${row.count} appointments`);
    });
    
    // 4. Add missing enum values if needed
    console.log('\n4. Adding missing enum values...');
    
    const requiredStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'payment_pending'];
    const currentStatuses = enumResult.rows.map(row => row.enumlabel);
    
    for (const status of requiredStatuses) {
      if (!currentStatuses.includes(status)) {
        console.log(`Adding enum value: ${status}`);
        try {
          await client.query(`ALTER TYPE enum_appointments_status ADD VALUE '${status}';`);
          console.log(`✅ Added enum value: ${status}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ Enum value ${status} already exists`);
          } else {
            console.log(`❌ Failed to add enum value ${status}:`, error.message);
          }
        }
      } else {
        console.log(`✅ Enum value ${status} already exists`);
      }
    }
    
    // 5. Fix any invalid status values
    console.log('\n5. Fixing invalid status values...');
    
    // Update any appointments with invalid status
    const invalidStatuses = statusResult.rows
      .map(row => row.status)
      .filter(status => !requiredStatuses.includes(status));
    
    if (invalidStatuses.length > 0) {
      console.log('Found invalid statuses:', invalidStatuses);
      
      for (const invalidStatus of invalidStatuses) {
        // Map invalid statuses to valid ones
        let validStatus = 'pending';
        if (invalidStatus && invalidStatus.includes('payment')) {
          validStatus = 'payment_pending';
        } else if (invalidStatus && invalidStatus.includes('confirm')) {
          validStatus = 'confirmed';
        }
        
        console.log(`Updating ${invalidStatus} → ${validStatus}`);
        
        const updateQuery = `
          UPDATE appointments 
          SET status = $1 
          WHERE status = $2;
        `;
        
        const updateResult = await client.query(updateQuery, [validStatus, invalidStatus]);
        console.log(`✅ Updated ${updateResult.rowCount} appointments`);
      }
    }
    
    // 6. Verify the fix
    console.log('\n6. Verifying the fix...');
    
    const verifyQuery = `
      SELECT status, COUNT(*) as count
      FROM appointments 
      GROUP BY status
      ORDER BY count DESC;
    `;
    
    const verifyResult = await client.query(verifyQuery);
    console.log('Status values after fix:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} appointments`);
    });
    
    console.log('\n✅ Database enum fix completed!');
    console.log('You can now test the Chapa payment integration.');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
  } finally {
    await client.end();
  }
}

fixAppointmentEnumDatabase();