/**
 * Check Chapa Dashboard Visibility
 * Explains why payments may not appear in Chapa dashboard and how to verify real payments
 */

const axios = require('axios');

async function checkChapaDashboardVisibility() {
  console.log('📊 CHAPA DASHBOARD VISIBILITY CHECK');
  console.log('===================================\n');

  const baseURL = 'http://localhost:3005';

  console.log('🤔 WHY PAYMENTS MIGHT NOT SHOW IN CHAPA DASHBOARD:\n');

  console.log('1. 🧪 TEST MODE vs LIVE MODE:');
  console.log('   • Test payments appear in TEST dashboard section');
  console.log('   • Live payments appear in LIVE dashboard section');
  console.log('   • Make sure you\'re checking the right mode\n');

  console.log('2. 🔑 SECRET KEY TYPE:');
  console.log('   • CHASECK_TEST-xxx = Test mode payments');
  console.log('   • CHASECK_LIVE-xxx = Live mode payments');
  console.log('   • Different keys show in different dashboard sections\n');

  console.log('3. ⏱️ TIMING ISSUES:');
  console.log('   • Payments may take a few minutes to appear');
  console.log('   • Dashboard updates are not always instant');
  console.log('   • Try refreshing the dashboard page\n');

  console.log('4. 🚫 DEMO MODE FALLBACK:');
  console.log('   • If Chapa API fails, system creates demo payments');
  console.log('   • Demo payments DON\'T appear in Chapa dashboard');
  console.log('   • Only real Chapa API calls create dashboard entries\n');

  // Check current secret key type
  try {
    const debugResponse = await axios.get(`${baseURL}/api/payments/debug`);
    
    if (debugResponse.data.success) {
      const chapaKey = debugResponse.data.debug.chapaSecretKey;
      console.log('🔍 CURRENT CHAPA CONFIGURATION:');
      console.log(`   Secret Key: ${chapaKey}`);
      
      if (chapaKey.includes('TEST')) {
        console.log('   ✅ Using TEST mode - check TEST section in dashboard');
        console.log('   📍 Dashboard URL: https://dashboard.chapa.co/dashboard/transactions');
        console.log('   📍 Make sure "Test" toggle is ON in dashboard\n');
      } else if (chapaKey.includes('LIVE')) {
        console.log('   ✅ Using LIVE mode - check LIVE section in dashboard');
        console.log('   📍 Dashboard URL: https://dashboard.chapa.co/dashboard/transactions');
        console.log('   📍 Make sure "Test" toggle is OFF in dashboard\n');
      } else {
        console.log('   ⚠️ Unknown key format - may not be valid Chapa key\n');
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check Chapa configuration\n');
  }

  // Check recent payments to see if they're real or demo
  try {
    const paymentsResponse = await axios.get(`${baseURL}/api/appointments`);
    
    if (paymentsResponse.data.success) {
      const appointments = paymentsResponse.data.data;
      const recentPayments = appointments.filter(apt => apt.chapa_transaction_id);
      
      console.log('💳 RECENT PAYMENT ANALYSIS:');
      console.log(`   Found ${recentPayments.length} payments with Chapa transaction IDs\n`);
      
      if (recentPayments.length > 0) {
        console.log('📋 PAYMENT DETAILS:');
        recentPayments.slice(0, 3).forEach((apt, index) => {
          console.log(`   Payment ${index + 1}:`);
          console.log(`   • Transaction ID: ${apt.chapa_transaction_id}`);
          console.log(`   • Amount: ${apt.fee} ETB`);
          console.log(`   • Status: ${apt.paymentStatus}`);
          console.log(`   • Should appear in dashboard: ${apt.chapa_transaction_id ? 'YES' : 'NO'}`);
          console.log('');
        });
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check recent payments\n');
  }

  console.log('🔍 HOW TO VERIFY REAL CHAPA PAYMENTS:\n');

  console.log('✅ SIGNS OF REAL CHAPA PAYMENTS:');
  console.log('   • Transaction ID starts with your prefix (e.g., ELITE-CHAPA-...)');
  console.log('   • Checkout URL is https://checkout.chapa.co/...');
  console.log('   • Payment record has real Chapa response data');
  console.log('   • Appears in Chapa dashboard (correct mode)\n');

  console.log('❌ SIGNS OF DEMO PAYMENTS:');
  console.log('   • Checkout URL is localhost/payments/demo-chapa');
  console.log('   • Provider data contains "demo: true"');
  console.log('   • Does NOT appear in Chapa dashboard');
  console.log('   • Created when Chapa API fails\n');

  console.log('🧪 HOW TO TEST REAL CHAPA INTEGRATION:\n');

  console.log('1. 📱 Make a test payment');
  console.log('2. 🔍 Check the checkout URL:');
  console.log('   • Real: https://checkout.chapa.co/checkout/payment/...');
  console.log('   • Demo: http://localhost:5173/payments/demo-chapa...');
  console.log('3. 📊 Check Chapa dashboard (correct test/live mode)');
  console.log('4. 🔄 Wait a few minutes and refresh dashboard\n');

  console.log('🎯 DASHBOARD ACCESS TIPS:\n');

  console.log('• Login to https://dashboard.chapa.co/');
  console.log('• Navigate to Transactions section');
  console.log('• Toggle between Test/Live mode as needed');
  console.log('• Look for your transaction reference');
  console.log('• Check the date/time range filter\n');

  console.log('🚀 NEXT STEPS TO VERIFY:\n');

  console.log('1. Make a new payment and note the checkout URL');
  console.log('2. If URL is localhost/demo-chapa → Still in demo mode');
  console.log('3. If URL is checkout.chapa.co → Real Chapa payment');
  console.log('4. Check dashboard in correct mode (test/live)');
  console.log('5. Search by transaction ID or amount');
}

checkChapaDashboardVisibility();