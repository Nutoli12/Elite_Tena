/**
 * Detailed Payment Status Checker
 * Answers your questions:
 * 1. Why some appointments show in Chapa dashboard but others don't
 * 2. How to know if payment is actually paid vs processing
 * 3. Where to see payment status if not in Chapa
 */

const axios = require('axios');

async function checkPaymentStatusDetailed() {
  console.log('🔍 DETAILED PAYMENT STATUS CHECK\n');
  console.log('This will help you understand:');
  console.log('• Why some payments show in Chapa dashboard');
  console.log('• How to tell if payment is really paid');
  console.log('• Where to see all payment information\n');

  const baseURL = 'http://localhost:3005';

  try {
    // 1. Check all appointments and their payment status
    console.log('📋 1. CHECKING ALL APPOINTMENTS AND PAYMENTS\n');
    
    const appointmentsResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (appointmentsResponse.data.success) {
      const appointments = appointmentsResponse.data.data;
      console.log(`Found ${appointments.length} total appointments\n`);
      
      let paidCount = 0;
      let processingCount = 0;
      let pendingCount = 0;
      let chapaCount = 0;
      
      for (let i = 0; i < appointments.length; i++) {
        const apt = appointments[i];
        console.log(`📅 Appointment ${i + 1}:`);
        console.log(`   ID: ${apt.id}`);
        console.log(`   Fee: ${apt.fee} ETB`);
        console.log(`   Payment Method: ${apt.paymentMethod || 'Not set'}`);
        console.log(`   Payment Status: ${apt.paymentStatus || 'Not set'}`);
        console.log(`   Appointment Status: ${apt.status || 'Not set'}`);
        console.log(`   Chapa Transaction ID: ${apt.chapa_transaction_id || 'None'}`);
        console.log(`   Payment Confirmed At: ${apt.paymentConfirmedAt || 'Not confirmed'}`);
        
        // Count different statuses
        if (apt.paymentStatus === 'paid') paidCount++;
        else if (apt.paymentStatus === 'pending') pendingCount++;
        else if (apt.paymentStatus === 'processing') processingCount++;
        
        if (apt.chapa_transaction_id) chapaCount++;
        
        // Check if this payment should show in Chapa
        if (apt.chapa_transaction_id) {
          console.log(`   🔍 CHAPA STATUS: Should appear in Chapa dashboard`);
          console.log(`   📱 Transaction Reference: ${apt.chapa_transaction_id}`);
        } else {
          console.log(`   ⚠️ CHAPA STATUS: No Chapa transaction - won't show in dashboard`);
        }
        
        console.log(''); // Empty line
      }
      
      // Summary
      console.log('📊 PAYMENT STATUS SUMMARY:');
      console.log(`   💰 Paid: ${paidCount}`);
      console.log(`   ⏳ Processing: ${processingCount}`);
      console.log(`   🔄 Pending: ${pendingCount}`);
      console.log(`   📱 With Chapa Transaction: ${chapaCount}`);
      console.log(`   🚫 Without Chapa Transaction: ${appointments.length - chapaCount}`);
      
    } else {
      console.log('❌ Failed to get appointments:', appointmentsResponse.data.error);
    }

    // 2. Check Payment Records Table
    console.log('\n📋 2. CHECKING PAYMENT RECORDS TABLE\n');
    
    try {
      const paymentsResponse = await axios.get(`${baseURL}/api/payments`);
      
      if (paymentsResponse.data.success) {
        const payments = paymentsResponse.data.data;
        console.log(`Found ${payments.length} payment records\n`);
        
        payments.forEach((payment, index) => {
          console.log(`💳 Payment Record ${index + 1}:`);
          console.log(`   Payment ID: ${payment.id}`);
          console.log(`   Appointment ID: ${payment.appointmentId}`);
          console.log(`   Amount: ${payment.amount} ${payment.currency}`);
          console.log(`   Status: ${payment.status}`);
          console.log(`   Payment Method: ${payment.paymentMethod}`);
          console.log(`   Transaction ID: ${payment.transactionId}`);
          console.log(`   Created: ${payment.createdAt}`);
          console.log(`   Verified: ${payment.verifiedAt || 'Not verified'}`);
          
          if (payment.providerData) {
            console.log(`   Provider Data: ${JSON.stringify(payment.providerData, null, 2)}`);
          }
          console.log('');
        });
      } else {
        console.log('⚠️ No payment records endpoint or no payments found');
      }
    } catch (error) {
      console.log('⚠️ Could not fetch payment records (endpoint may not exist)');
    }

    // 3. Explain why some show in Chapa and others don't
    console.log('\n🤔 3. WHY SOME PAYMENTS SHOW IN CHAPA DASHBOARD:\n');
    
    console.log('✅ WILL SHOW IN CHAPA:');
    console.log('   • Payments with chapa_transaction_id');
    console.log('   • Payments that went through Chapa API');
    console.log('   • Real Chapa payment attempts');
    console.log('   • Both successful AND failed Chapa payments');
    
    console.log('\n❌ WON\'T SHOW IN CHAPA:');
    console.log('   • Appointments created without payment');
    console.log('   • Payments that failed before reaching Chapa');
    console.log('   • Free appointments (fee = 0)');
    console.log('   • Appointments with payment errors');

    // 4. How to tell if payment is really paid
    console.log('\n💰 4. HOW TO TELL IF PAYMENT IS REALLY PAID:\n');
    
    console.log('🎯 DEFINITELY PAID:');
    console.log('   • paymentStatus = "paid"');
    console.log('   • paymentConfirmedAt has a date');
    console.log('   • status = "confirmed" or "scheduled"');
    console.log('   • Shows in doctor\'s appointment queue');
    
    console.log('\n⏳ STILL PROCESSING:');
    console.log('   • paymentStatus = "pending" or "processing"');
    console.log('   • paymentConfirmedAt is null');
    console.log('   • status = "payment_pending"');
    console.log('   • Does NOT show in doctor\'s queue');
    
    console.log('\n❌ PAYMENT FAILED:');
    console.log('   • paymentStatus = "failed"');
    console.log('   • status = "payment_pending" (stuck)');
    console.log('   • Does NOT show in doctor\'s queue');

    // 5. Where to check payment status
    console.log('\n📍 5. WHERE TO CHECK PAYMENT STATUS:\n');
    
    console.log('🏥 IN YOUR SYSTEM:');
    console.log('   • Database: appointments table');
    console.log('   • Database: payments table (if exists)');
    console.log('   • Frontend: appointment status');
    console.log('   • Doctor dashboard: paid appointments only');
    
    console.log('\n📱 IN CHAPA DASHBOARD:');
    console.log('   • Only payments with transaction IDs');
    console.log('   • Real payment attempts');
    console.log('   • Both test and live transactions');
    console.log('   • Check by transaction reference');

    // 6. Test specific transaction if provided
    console.log('\n🔍 6. TESTING SPECIFIC CHAPA TRANSACTIONS:\n');
    
    // Get recent Chapa transactions
    try {
      const recentAppointments = await axios.get(`${baseURL}/api/appointments?limit=5`);
      
      if (recentAppointments.data.success) {
        const appointments = recentAppointments.data.data;
        const chapaAppointments = appointments.filter(apt => apt.chapa_transaction_id);
        
        if (chapaAppointments.length > 0) {
          console.log('Testing recent Chapa transactions:');
          
          for (const apt of chapaAppointments) {
            console.log(`\n🧪 Testing Transaction: ${apt.chapa_transaction_id}`);
            
            try {
              const verifyResponse = await axios.get(`${baseURL}/api/chapa-payment/verify/${apt.chapa_transaction_id}`);
              
              if (verifyResponse.data.success) {
                console.log(`   ✅ Verification successful`);
                console.log(`   Status: ${verifyResponse.data.data.status}`);
                console.log(`   Payment ID: ${verifyResponse.data.data.payment?.id}`);
              } else {
                console.log(`   ❌ Verification failed: ${verifyResponse.data.error}`);
              }
            } catch (verifyError) {
              console.log(`   ⚠️ Could not verify: ${verifyError.message}`);
            }
          }
        } else {
          console.log('No recent Chapa transactions found to test');
        }
      }
    } catch (error) {
      console.log('Could not test recent transactions');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

console.log('🔍 PAYMENT STATUS DETECTIVE');
console.log('==========================');
console.log('This will help you understand exactly what\'s happening with your payments!\n');

checkPaymentStatusDetailed();