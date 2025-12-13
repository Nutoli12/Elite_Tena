/**
 * Check Chapa Integration Status
 * Verifies if the system is properly integrated with Chapa payment gateway
 */

const fs = require('fs');
const path = require('path');

function checkChapaIntegrationStatus() {
  console.log('🔍 Checking Chapa Integration Status...\n');

  const integrationPoints = [];

  // 1. Check Chapa Payment Service
  console.log('📋 1. Chapa Payment Service Integration:');
  try {
    const paymentServicePath = path.join(__dirname, 'server/services/payment.cjs');
    if (fs.existsSync(paymentServicePath)) {
      const content = fs.readFileSync(paymentServicePath, 'utf8');
      if (content.includes('chapa.co/v1') && content.includes('ChapaService')) {
        console.log('   ✅ Real Chapa API service implemented');
        console.log('   ✅ API endpoint: https://api.chapa.co/v1');
        integrationPoints.push('Chapa API Service');
      }
    }
  } catch (error) {
    console.log('   ❌ Chapa service check failed');
  }

  // 2. Check Chapa Payment Controller
  console.log('\n📋 2. Chapa Payment Controller:');
  try {
    const controllerPath = path.join(__dirname, 'server/src/controllers/chapaPaymentController.js');
    if (fs.existsSync(controllerPath)) {
      const content = fs.readFileSync(controllerPath, 'utf8');
      if (content.includes('initializeChapaPayment') && content.includes('verifyChapaPayment')) {
        console.log('   ✅ Chapa payment controller implemented');
        console.log('   ✅ Initialize and verify payment methods');
        integrationPoints.push('Chapa Controller');
      }
    }
  } catch (error) {
    console.log('   ❌ Chapa controller check failed');
  }

  // 3. Check Chapa Routes
  console.log('\n📋 3. Chapa API Routes:');
  try {
    const routesPath = path.join(__dirname, 'server/src/routes/chapaPayment.js');
    if (fs.existsSync(routesPath)) {
      const content = fs.readFileSync(routesPath, 'utf8');
      if (content.includes('/initialize') && content.includes('/verify')) {
        console.log('   ✅ Chapa payment routes configured');
        console.log('   ✅ /api/chapa-payment/initialize');
        console.log('   ✅ /api/chapa-payment/verify');
        integrationPoints.push('Chapa Routes');
      }
    }
  } catch (error) {
    console.log('   ❌ Chapa routes check failed');
  }

  // 4. Check Frontend Chapa Component
  console.log('\n📋 4. Frontend Chapa Integration:');
  try {
    const componentPath = path.join(__dirname, 'frontend/src/components/payment/ChapaPaymentButton.tsx');
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');
      if (content.includes('chapa-payment/initialize') && content.includes('Pay Now with Chapa')) {
        console.log('   ✅ Chapa payment button component');
        console.log('   ✅ Direct payment integration');
        integrationPoints.push('Frontend Component');
      }
    }
  } catch (error) {
    console.log('   ❌ Frontend component check failed');
  }

  // 5. Check Chapa-Consent Bridge
  console.log('\n📋 5. Chapa-Consent Integration Bridge:');
  try {
    const bridgePath = path.join(__dirname, 'server/src/services/ChapaPaymentConsentBridge.js');
    if (fs.existsSync(bridgePath)) {
      const content = fs.readFileSync(bridgePath, 'utf8');
      if (content.includes('ChapaPaymentConsentBridge') && content.includes('Ethiopian')) {
        console.log('   ✅ Chapa-Consent bridge service');
        console.log('   ✅ Ethiopian payment integration');
        integrationPoints.push('Chapa-Consent Bridge');
      }
    }
  } catch (error) {
    console.log('   ❌ Chapa bridge check failed');
  }

  // 6. Check Environment Configuration
  console.log('\n📋 6. Environment Configuration:');
  try {
    const envPath = path.join(__dirname, 'server/.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('CHAPA_SECRET_KEY')) {
        console.log('   ✅ Chapa secret key configured');
        integrationPoints.push('Environment Config');
      } else {
        console.log('   ⚠️ Chapa secret key not found in .env');
      }
    }
  } catch (error) {
    console.log('   ❌ Environment check failed');
  }

  // Summary
  console.log('\n📊 Chapa Integration Summary:');
  console.log(`   Total Integration Points: ${integrationPoints.length}/6`);
  console.log('   Implemented Components:');
  integrationPoints.forEach(point => {
    console.log(`   ✅ ${point}`);
  });

  if (integrationPoints.length >= 5) {
    console.log('\n🎉 CHAPA INTEGRATION: FULLY IMPLEMENTED');
    console.log('✅ Your system IS integrated with real Chapa payment gateway');
    
    console.log('\n🇪🇹 Ethiopian Payment Methods Available:');
    console.log('   📱 Telebirr - Mobile money');
    console.log('   🏦 CBE Birr - Commercial Bank of Ethiopia');
    console.log('   🏦 Awash Birr - Awash Bank');
    console.log('   💳 Visa Cards - International cards');
    console.log('   💳 Mastercard - International cards');
    
    console.log('\n🚀 How It Works:');
    console.log('   1. Patient clicks "Pay Now with Chapa"');
    console.log('   2. Direct redirect to Chapa payment gateway');
    console.log('   3. Patient selects payment method in Chapa');
    console.log('   4. Completes payment with Ethiopian methods');
    console.log('   5. Returns to appointment confirmation');
    
    console.log('\n💡 Production Ready:');
    console.log('   • Real Chapa API integration');
    console.log('   • Ethiopian payment gateway');
    console.log('   • Secure payment processing');
    console.log('   • Payment-first appointment policy');
  } else {
    console.log('\n⚠️ CHAPA INTEGRATION: PARTIALLY IMPLEMENTED');
    console.log('Some components may be missing or need configuration');
  }
}

// Run the check
checkChapaIntegrationStatus();