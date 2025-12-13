const fs = require('fs');
const path = require('path');

/**
 * Fix Chapa Integration Issues
 * This script addresses the common Chapa payment integration problems
 */

console.log('🔧 Fixing Chapa Integration Issues...');

// 1. Check environment configuration
function checkEnvironmentConfig() {
  console.log('\n📋 Checking Environment Configuration...');
  
  const envPath = path.join(__dirname, 'server', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ server/.env file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const requiredVars = [
    'CHAPA_SECRET_KEY',
    'CHAPA_PUBLIC_KEY',
    'BACKEND_URL',
    'FRONTEND_URL'
  ];
  
  const missingVars = [];
  const configuredVars = [];
  
  requiredVars.forEach(varName => {
    const line = lines.find(l => l.startsWith(varName + '='));
    if (!line || line.split('=')[1].trim() === '' || line.includes('your-actual')) {
      missingVars.push(varName);
    } else {
      configuredVars.push(varName);
    }
  });
  
  console.log('✅ Configured variables:', configuredVars);
  if (missingVars.length > 0) {
    console.log('❌ Missing/Invalid variables:', missingVars);
    return false;
  }
  
  return true;
}

// 2. Create proper environment template
function createEnvironmentTemplate() {
  console.log('\n📝 Creating Environment Template...');
  
  const envTemplate = `# Chapa Payment Configuration
# Get your credentials from: https://dashboard.chapa.co/
CHAPA_SECRET_KEY=CHASECK_TEST-your-actual-chapa-secret-key-here
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-your-actual-chapa-public-key-here

# Server URLs (update for production)
BACKEND_URL=http://localhost:3005
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=elite_tena_healthcare
DB_USER=root
DB_PASSWORD=your_password

# Other Payment Methods
TELEBIRR_APP_ID=your-telebirr-app-id
TELEBIRR_APP_KEY=your-telebirr-app-key
TELEBIRR_MERCHANT_ID=your-merchant-id

# Blockchain Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-project-id
PRIVATE_KEY=your-private-key
CONTRACT_ADDRESS=your-contract-address

# IPFS Configuration
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_PROJECT_ID=your-ipfs-project-id
IPFS_PROJECT_SECRET=your-ipfs-secret
`;

  const envExamplePath = path.join(__dirname, 'server', '.env.example');
  fs.writeFileSync(envExamplePath, envTemplate);
  
  console.log('✅ Created server/.env.example template');
  console.log('📋 Next steps:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Get Chapa credentials from https://dashboard.chapa.co/');
  console.log('   3. Replace placeholder values with actual credentials');
}

// 3. Test Chapa API connection
async function testChapaConnection() {
  console.log('\n🔍 Testing Chapa API Connection...');
  
  try {
    const axios = require('axios');
    
    // Test with a minimal request to check API accessibility
    const response = await axios.get('https://api.chapa.co/v1/banks', {
      timeout: 5000
    });
    
    console.log('✅ Chapa API is accessible');
    console.log('📊 Available banks:', response.data.data?.length || 0);
    return true;
  } catch (error) {
    console.log('❌ Chapa API connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('🌐 Check internet connection');
    }
    return false;
  }
}

// 4. Create Chapa test script
function createChapaTestScript() {
  console.log('\n🧪 Creating Chapa Test Script...');
  
  const testScript = `const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

/**
 * Test Chapa Payment Integration
 * Run this script to test your Chapa configuration
 */

async function testChapaIntegration() {
  console.log('🧪 Testing Chapa Integration...');
  
  const secretKey = process.env.CHAPA_SECRET_KEY;
  
  if (!secretKey || secretKey.includes('your-actual')) {
    console.log('❌ CHAPA_SECRET_KEY not configured properly');
    console.log('📋 Steps to fix:');
    console.log('   1. Go to https://dashboard.chapa.co/');
    console.log('   2. Sign up or log in');
    console.log('   3. Get your API credentials');
    console.log('   4. Update server/.env file');
    return;
  }
  
  console.log('🔑 Secret key configured:', secretKey.substring(0, 15) + '...');
  
  try {
    // Test payment initialization
    const paymentData = {
      amount: 100,
      currency: 'ETB',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '+251911234567',
      tx_ref: \`TEST-\${Date.now()}\`,
      callback_url: 'http://localhost:3005/api/payments/callback',
      return_url: 'http://localhost:5173/payments/success',
      customization: {
        title: 'Elite Tena',
        description: 'Test Payment'
      }
    };
    
    console.log('📤 Sending test payment request...');
    
    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      paymentData,
      {
        headers: {
          Authorization: \`Bearer \${secretKey}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Chapa API Response:', {
      status: response.data.status,
      message: response.data.message,
      checkout_url: response.data.data?.checkout_url ? 'Generated' : 'Missing'
    });
    
    if (response.data.data?.checkout_url) {
      console.log('🎉 Chapa integration is working!');
      console.log('🔗 Test checkout URL:', response.data.data.checkout_url);
    }
    
  } catch (error) {
    console.log('❌ Chapa API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication failed - check your secret key');
    } else if (error.response?.status === 400) {
      console.log('📋 Bad request - check payment data format');
    }
  }
}

testChapaIntegration();`;

  fs.writeFileSync('test-chapa-integration.js', testScript);
  console.log('✅ Created test-chapa-integration.js');
  console.log('🚀 Run: node test-chapa-integration.js');
}

// 5. Update payment service with better error handling
function updatePaymentService() {
  console.log('\n🔧 Updating Payment Service...');
  
  const paymentServicePath = path.join(__dirname, 'server', 'services', 'payment.cjs');
  
  if (!fs.existsSync(paymentServicePath)) {
    console.log('❌ Payment service file not found');
    return;
  }
  
  // Read current content
  let content = fs.readFileSync(paymentServicePath, 'utf8');
  
  // Add better error handling for Chapa
  const errorHandlingCode = `
  /**
   * Enhanced error handling for Chapa API
   */
  handleChapaError(error) {
    const errorMap = {
      401: 'Invalid API credentials - check your secret key',
      400: 'Invalid request data - check payment parameters',
      422: 'Validation error - check required fields',
      429: 'Rate limit exceeded - try again later',
      500: 'Chapa server error - try again later'
    };
    
    const status = error.response?.status;
    const message = errorMap[status] || error.message;
    
    return {
      success: false,
      error: message,
      status: status,
      details: error.response?.data,
      troubleshooting: this.getTroubleshootingSteps(status)
    };
  }
  
  getTroubleshootingSteps(status) {
    switch(status) {
      case 401:
        return [
          'Verify CHAPA_SECRET_KEY in .env file',
          'Check if key is from correct environment (test/live)',
          'Ensure key is not expired'
        ];
      case 400:
        return [
          'Check all required fields are provided',
          'Verify email format is valid',
          'Ensure amount is positive number',
          'Check phone number format (+251...)'
        ];
      default:
        return ['Check Chapa status page', 'Try again in a few minutes'];
    }
  }`;
  
  // Insert error handling before the last closing brace
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex > -1) {
    content = content.slice(0, lastBraceIndex) + errorHandlingCode + '\n' + content.slice(lastBraceIndex);
    fs.writeFileSync(paymentServicePath, content);
    console.log('✅ Enhanced payment service error handling');
  }
}

// Main execution
async function main() {
  console.log('🏥 Elite-Tena Chapa Integration Fix');
  console.log('=====================================');
  
  // Check current configuration
  const isConfigured = checkEnvironmentConfig();
  
  // Create template regardless
  createEnvironmentTemplate();
  
  // Test API connection
  const apiAccessible = await testChapaConnection();
  
  // Create test script
  createChapaTestScript();
  
  // Update payment service
  updatePaymentService();
  
  console.log('\n📋 Summary:');
  console.log('✅ Environment template created');
  console.log('✅ Test script created');
  console.log('✅ Payment service updated');
  console.log(isConfigured ? '✅ Environment configured' : '❌ Environment needs configuration');
  console.log(apiAccessible ? '✅ Chapa API accessible' : '❌ Chapa API connection issues');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Configure server/.env with actual Chapa credentials');
  console.log('2. Run: node test-chapa-integration.js');
  console.log('3. Test payment flow in application');
  console.log('4. Monitor payment logs for issues');
  
  console.log('\n📚 Resources:');
  console.log('- Chapa Dashboard: https://dashboard.chapa.co/');
  console.log('- Chapa Documentation: https://developer.chapa.co/docs');
  console.log('- Test Cards: https://developer.chapa.co/docs/test-cards');
}

main().catch(console.error);