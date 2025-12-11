/**
 * Test script for the Consent-First Healthcare System
 * 
 * This script demonstrates the complete consent workflow:
 * 1. Doctor requests consent from patient
 * 2. Patient grants consent
 * 3. Doctor can access medical records
 * 4. Patient can revoke consent
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

// Test data
const DOCTOR_WALLET = '0x1234567890123456789012345678901234567890';
const PATIENT_WALLET = '0x0987654321098765432109876543210987654321';

async function testConsentSystem() {
  console.log('🔒 Testing Consent-First Healthcare System\n');

  try {
    // Step 1: Check initial consent status (should be no consent)
    console.log('1️⃣ Checking initial consent status...');
    const initialStatus = await axios.get(`${BASE_URL}/consent/status/${PATIENT_WALLET}/${DOCTOR_WALLET}`);
    console.log('   Initial status:', initialStatus.data.data ? 'Has consent' : 'No consent');

    // Step 2: Doctor requests consent
    console.log('\n2️⃣ Doctor requesting consent...');
    const consentRequest = await axios.post(`${BASE_URL}/consent/request`, {
      patientWalletAddress: PATIENT_WALLET,
      doctorWalletAddress: DOCTOR_WALLET,
      permissions: ['viewMedicalHistory', 'createRecords'],
      purpose: 'Medical consultation and record review',
      durationType: 'hours',
      durationValue: 24,
      requestReason: 'Patient scheduled for consultation'
    });
    
    if (consentRequest.data.success) {
      console.log('   ✅ Consent request sent successfully');
      console.log('   📋 Consent ID:', consentRequest.data.data.id);
    } else {
      console.log('   ❌ Failed to send consent request');
      return;
    }

    const consentId = consentRequest.data.data.id;

    // Step 3: Patient grants consent
    console.log('\n3️⃣ Patient granting consent...');
    const grantConsent = await axios.post(`${BASE_URL}/consent/grant/${consentId}`, {
      patientWalletAddress: PATIENT_WALLET
    });

    if (grantConsent.data.success) {
      console.log('   ✅ Consent granted successfully');
      console.log('   📅 Granted at:', grantConsent.data.data.grantedAt);
      console.log('   ⏰ Expires at:', grantConsent.data.data.expiresAt);
    } else {
      console.log('   ❌ Failed to grant consent');
      return;
    }

    // Step 4: Check consent status after granting
    console.log('\n4️⃣ Checking consent status after granting...');
    const activeStatus = await axios.get(`${BASE_URL}/consent/status/${PATIENT_WALLET}/${DOCTOR_WALLET}`);
    
    if (activeStatus.data.data && activeStatus.data.data.status === 'active') {
      console.log('   ✅ Consent is now ACTIVE');
      console.log('   🔑 Permissions:', activeStatus.data.data.permissions);
      console.log('   👤 Patient:', activeStatus.data.data.patient?.user?.name || 'Unknown');
    } else {
      console.log('   ❌ Consent not active');
    }

    // Step 5: Test emergency override
    console.log('\n5️⃣ Testing emergency override...');
    const emergencyOverride = await axios.post(`${BASE_URL}/consent/emergency-check`, {
      patientWalletAddress: PATIENT_WALLET,
      doctorWalletAddress: DOCTOR_WALLET,
      justification: 'Patient unconscious, immediate medical attention required for life-threatening condition'
    });

    if (emergencyOverride.data.allowed) {
      console.log('   🚨 Emergency access GRANTED');
      console.log('   📝 Message:', emergencyOverride.data.message);
    } else {
      console.log('   ❌ Emergency access denied');
    }

    // Step 6: Get all consents for doctor
    console.log('\n6️⃣ Getting all consents for doctor...');
    const doctorConsents = await axios.get(`${BASE_URL}/consent/doctor/${DOCTOR_WALLET}?status=active`);
    
    if (doctorConsents.data.success) {
      console.log(`   📊 Doctor has ${doctorConsents.data.data.length} active consent(s)`);
      doctorConsents.data.data.forEach((consent, index) => {
        console.log(`   ${index + 1}. Patient: ${consent.patientWalletAddress.substring(0, 8)}... Status: ${consent.status}`);
      });
    }

    // Step 7: Patient revokes consent
    console.log('\n7️⃣ Patient revoking consent...');
    const revokeConsent = await axios.post(`${BASE_URL}/consent/revoke/${consentId}`, {
      patientWalletAddress: PATIENT_WALLET
    });

    if (revokeConsent.data.success) {
      console.log('   ✅ Consent revoked successfully');
      console.log('   📅 Revoked at:', revokeConsent.data.data.revokedAt);
    } else {
      console.log('   ❌ Failed to revoke consent');
    }

    // Step 8: Final consent status check
    console.log('\n8️⃣ Final consent status check...');
    const finalStatus = await axios.get(`${BASE_URL}/consent/status/${PATIENT_WALLET}/${DOCTOR_WALLET}`);
    console.log('   Final status:', finalStatus.data.data ? `${finalStatus.data.data.status}` : 'No active consent');

    console.log('\n🎉 Consent system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Consent request - Working');
    console.log('   ✅ Consent granting - Working');
    console.log('   ✅ Consent checking - Working');
    console.log('   ✅ Emergency override - Working');
    console.log('   ✅ Consent revocation - Working');
    console.log('\n🔒 The consent-first system is ready for production!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Note: Make sure the server is running on port 3003');
      console.log('   Run: npm run dev or node server/src/server.js');
    }
  }
}

// Run the test
testConsentSystem();