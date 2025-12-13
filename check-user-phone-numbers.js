/**
 * Check User Phone Numbers
 * Find invalid phone numbers that are causing Chapa to fail
 */

const axios = require('axios');

async function checkUserPhoneNumbers() {
  console.log('📱 CHECKING USER PHONE NUMBERS');
  console.log('==============================\n');

  const baseURL = 'http://localhost:3005';

  try {
    // Get all appointments with user data
    const response = await axios.get(`${baseURL}/api/appointments`);

    if (response.data.success) {
      const appointments = response.data.data;
      console.log(`Found ${appointments.length} appointments\n`);

      // Get unique patient wallet addresses
      const patientWallets = [...new Set(appointments.map(apt => apt.patientWalletAddress))];
      
      console.log('📋 PATIENT PHONE NUMBERS:\n');

      for (const wallet of patientWallets) {
        try {
          // Get user data for this wallet
          const userResponse = await axios.get(`${baseURL}/api/auth/user/${wallet}`);
          
          if (userResponse.data.success) {
            const user = userResponse.data.user;
            const profileData = user.profileData || {};
            
            console.log(`👤 User: ${user.email || 'No email'}`);
            console.log(`   Wallet: ${wallet}`);
            console.log(`   Phone (direct): ${profileData.phoneNumber || 'Not set'}`);
            console.log(`   Phone (alt): ${profileData.phone || 'Not set'}`);
            
            // Check phone number validity
            const phoneNumber = profileData.phoneNumber || profileData.phone;
            if (phoneNumber) {
              const isValid = validateEthiopianPhoneNumber(phoneNumber);
              console.log(`   ✅ Valid: ${isValid ? 'YES' : 'NO'}`);
              
              if (!isValid) {
                console.log(`   🔧 Suggested fix: ${fixEthiopianPhoneNumber(phoneNumber)}`);
              }
            } else {
              console.log(`   ⚠️ No phone number found`);
            }
            console.log('');
          }
        } catch (userError) {
          console.log(`❌ Could not get user data for wallet: ${wallet}`);
        }
      }

      // Show Ethiopian phone number format rules
      console.log('\n📱 ETHIOPIAN PHONE NUMBER RULES:');
      console.log('✅ Valid formats:');
      console.log('   +251911234567 (international format)');
      console.log('   +251901234567 (Ethio Telecom)');
      console.log('   +251921234567 (Safaricom)');
      console.log('   +251931234567 (other operators)');
      console.log('\n❌ Invalid formats:');
      console.log('   +25195676453737 (too many digits)');
      console.log('   0911234567 (missing country code)');
      console.log('   251911234567 (missing +)');

    } else {
      console.log('❌ Failed to get appointments:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with:');
      console.log('   cd server && npm start');
    }
  }
}

function validateEthiopianPhoneNumber(phoneNumber) {
  // Ethiopian phone number validation
  // Format: +251XXXXXXXXX (13 digits total)
  // Mobile prefixes: 90, 91, 92, 93, 94, 95, 96, 97, 98, 99
  const ethiopianPhoneRegex = /^\+251(9[0-9])\d{7}$/;
  return ethiopianPhoneRegex.test(phoneNumber);
}

function fixEthiopianPhoneNumber(phoneNumber) {
  // Try to fix common issues
  let fixed = phoneNumber.toString().trim();
  
  // Remove spaces and dashes
  fixed = fixed.replace(/[\s-]/g, '');
  
  // If it starts with 0, replace with +251
  if (fixed.startsWith('0')) {
    fixed = '+251' + fixed.substring(1);
  }
  
  // If it starts with 251, add +
  if (fixed.startsWith('251') && !fixed.startsWith('+251')) {
    fixed = '+' + fixed;
  }
  
  // If it's too long, truncate to proper length
  if (fixed.startsWith('+251') && fixed.length > 13) {
    fixed = fixed.substring(0, 13);
  }
  
  // If it doesn't start with +251, try to add it
  if (!fixed.startsWith('+251') && fixed.length >= 9) {
    // Assume it's a local number starting with 9
    if (fixed.startsWith('9')) {
      fixed = '+251' + fixed;
    }
  }
  
  return fixed;
}

checkUserPhoneNumbers();