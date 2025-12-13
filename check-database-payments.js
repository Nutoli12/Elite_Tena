/**
 * Direct Database Payment Check
 * Checks the database directly to see payment status
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkDatabasePayments() {
  console.log('🗄️ DIRECT DATABASE PAYMENT CHECK\n');

  // Database connection
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check appointments table
    console.log('📋 1. APPOINTMENTS TABLE:\n');
    
    const appointmentsQuery = `
      SELECT 
        id,
        fee,
        "paymentMethod",
        "paymentStatus", 
        status,
        "chapa_transaction_id",
        "paymentConfirmedAt",
        "createdAt"
      FROM appointments 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `;
    
    const appointmentsResult = await client.query(appointmentsQuery);
    
    if (appointmentsResult.rows.length > 0) {
      appointmentsResult.rows.forEach((row, index) => {
        console.log(`📅 Appointment ${index + 1}:`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Fee: ${row.fee} ETB`);
        console.log(`   Payment Method: ${row.paymentMethod || 'NULL'}`);
        console.log(`   Payment Status: ${row.paymentStatus || 'NULL'}`);
        console.log(`   Appointment Status: ${row.status || 'NULL'}`);
        console.log(`   Chapa Transaction: ${row.chapa_transaction_id || 'NULL'}`);
        console.log(`   Payment Confirmed: ${row.paymentConfirmedAt || 'NULL'}`);
        console.log(`   Created: ${row.createdAt}`);
        
        // Analysis
        if (row.chapa_transaction_id) {
          console.log(`   🔍 ANALYSIS: Should appear in Chapa dashboard`);
        } else {
          console.log(`   ⚠️ ANALYSIS: No Chapa transaction - won't show in dashboard`);
        }
        
        if (row.paymentStatus === 'paid' && row.paymentConfirmedAt) {
          console.log(`   ✅ PAYMENT: Definitely paid and confirmed`);
        } else if (row.paymentStatus === 'pending' || row.paymentStatus === 'processing') {
          console.log(`   ⏳ PAYMENT: Still processing or pending`);
        } else {
          console.log(`   ❓ PAYMENT: Status unclear or not set`);
        }
        
        console.log('');
      });
    } else {
      console.log('No appointments found');
    }

    // 2. Check if payments table exists
    console.log('\n💳 2. PAYMENTS TABLE:\n');
    
    try {
      const paymentsQuery = `
        SELECT 
          id,
          "appointmentId",
          amount,
          currency,
          status,
          "paymentMethod",
          "transactionId",
          "verifiedAt",
          "createdAt"
        FROM payments 
        ORDER BY "createdAt" DESC 
        LIMIT 10
      `;
      
      const paymentsResult = await client.query(paymentsQuery);
      
      if (paymentsResult.rows.length > 0) {
        paymentsResult.rows.forEach((row, index) => {
          console.log(`💳 Payment ${index + 1}:`);
          console.log(`   Payment ID: ${row.id}`);
          console.log(`   Appointment ID: ${row.appointmentId}`);
          console.log(`   Amount: ${row.amount} ${row.currency}`);
          console.log(`   Status: ${row.status}`);
          console.log(`   Method: ${row.paymentMethod}`);
          console.log(`   Transaction ID: ${row.transactionId}`);
          console.log(`   Verified: ${row.verifiedAt || 'NULL'}`);
          console.log(`   Created: ${row.createdAt}`);
          console.log('');
        });
      } else {
        console.log('No payment records found');
      }
    } catch (error) {
      console.log('⚠️ Payments table does not exist or has different structure');
    }

    // 3. Count payment statuses
    console.log('\n📊 3. PAYMENT STATUS SUMMARY:\n');
    
    const statusQuery = `
      SELECT 
        "paymentStatus",
        COUNT(*) as count
      FROM appointments 
      WHERE fee > 0
      GROUP BY "paymentStatus"
    `;
    
    const statusResult = await client.query(statusQuery);
    
    console.log('Payment Status Counts:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.paymentStatus || 'NULL'}: ${row.count}`);
    });

    // 4. Count Chapa transactions
    console.log('\n📱 4. CHAPA TRANSACTION SUMMARY:\n');
    
    const chapaQuery = `
      SELECT 
        COUNT(*) as total_appointments,
        COUNT("chapa_transaction_id") as with_chapa_transaction,
        COUNT(*) - COUNT("chapa_transaction_id") as without_chapa_transaction
      FROM appointments 
      WHERE fee > 0
    `;
    
    const chapaResult = await client.query(chapaQuery);
    const chapaStats = chapaResult.rows[0];
    
    console.log(`Total Paid Appointments: ${chapaStats.total_appointments}`);
    console.log(`With Chapa Transaction: ${chapaStats.with_chapa_transaction}`);
    console.log(`Without Chapa Transaction: ${chapaStats.without_chapa_transaction}`);
    
    console.log('\n🎯 WHAT THIS MEANS:');
    console.log(`• ${chapaStats.with_chapa_transaction} payments should show in Chapa dashboard`);
    console.log(`• ${chapaStats.without_chapa_transaction} payments won't show in Chapa dashboard`);

    // 5. Recent processing payments
    console.log('\n⏳ 5. CURRENTLY PROCESSING PAYMENTS:\n');
    
    const processingQuery = `
      SELECT 
        id,
        "chapa_transaction_id",
        "paymentStatus",
        status,
        "createdAt"
      FROM appointments 
      WHERE "paymentStatus" IN ('pending', 'processing')
      ORDER BY "createdAt" DESC
    `;
    
    const processingResult = await client.query(processingQuery);
    
    if (processingResult.rows.length > 0) {
      console.log('Payments still processing:');
      processingResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}`);
        console.log(`      Chapa TX: ${row.chapa_transaction_id || 'None'}`);
        console.log(`      Payment Status: ${row.paymentStatus}`);
        console.log(`      Created: ${row.createdAt}`);
        
        const createdTime = new Date(row.createdAt);
        const now = new Date();
        const minutesAgo = Math.floor((now - createdTime) / (1000 * 60));
        
        console.log(`      Age: ${minutesAgo} minutes ago`);
        
        if (minutesAgo > 10) {
          console.log(`      ⚠️ This payment is stuck (over 10 minutes old)`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No payments currently processing');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabasePayments();