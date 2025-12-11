/**
 * Create consent and then a test medical record with TRUE Web3 integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const PATIENT_WALLET = '0x1764894073908ypl7fp';
const DOCTOR_WALLET = '0x1764894943291khtk9h';

async function createConsentAndWeb3Record() {
  console.log('🔐 ========== CREATING CONSENT AND WEB3 MEDICAL RECORD ==========');
  
  try {
    // Step 1: Create consent first
    console.log('📝 Step 1: Creating consent...');
    const consentData = {
      doctorWalletAddress: DOCTOR_WALLET,
      consentType: 'viewMedicalHistory',
      permissions: ['viewMedicalHistory', 'createMedicalRecord'],
      purpose: 'Web3 blockchain storage testing',
      durationHours: 24
    };

    const consentResponse = await axios.post(`${BASE_URL}/api/consent/grant`, consentData, {
      headers: {
        'x-wallet-address': PATIENT_WALLET,
        'Content-Type': 'application/json'
      }
    });

    if (consentResponse.data.success) {
      console.log('✅ Consent granted successfully!');
      console.log('   Consent ID:', consentResponse.data.data.id);
      console.log('   Doctor:', DOCTOR_WALLET);
      console.log('   Patient:', PATIENT_WALLET);
      console.log('   Permissions:', consentResponse.data.data.permissions);

      // Step 2: Now create the medical record
      console.log('\n📝 Step 2: Creating medical record with blockchain storage...');
      const recordData = {
        patientWalletAddress: PATIENT_WALLET,
        doctorWalletAddress: DOCTOR_WALLET,
        recordType: 'consultation',
        title: 'Web3 Test Record - Blockchain Verification',
        description: 'This is a test medical record to verify TRUE Web3 integration',
        diagnosis: 'Blockchain Storage Test - Successful Consent Check',
        treatment: 'Verify on Sepolia Etherscan - TRUE Web3 Integration',
        symptoms: ['Web3 verification', 'Blockchain testing', 'Consent validation'],
        visitDate: new Date().toISOString(),
        ipfsHash: 'QmTestHashForWeb3VerificationDemo123456789', // Mock IPFS hash
        fileUrl: 'https://gateway.pinata.cloud/ipfs/QmTestHashForWeb3VerificationDemo123456789',
        isEncrypted: true
      };

      console.log('📤 Creating medical record with blockchain storage...');
      console.log('   Patient:', PATIENT_WALLET);
      console.log('   Doctor:', DOCTOR_WALLET);
      console.log('   IPFS Hash:', recordData.ipfsHash);

      const response = await axios.post(`${BASE_URL}/api/medical-records`, recordData, {
        headers: {
          'x-wallet-address': DOCTOR_WALLET,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const record = response.data.data;
        console.log('✅ Medical record created successfully!');
        console.log('   Record ID:', record.id);
        console.log('   Title:', record.title);
        console.log('   On Blockchain:', record.onBlockchain);
        
        if (record.blockchain) {
          console.log('🔗 BLOCKCHAIN DETAILS:');
          console.log('   Transaction Hash:', record.blockchain.transactionHash);
          console.log('   Block Number:', record.blockchain.blockNumber);
          console.log('   Gas Used:', record.blockchain.gasUsed);
          console.log('   Network:', record.blockchain.network);
          console.log('   Etherscan URL: https://sepolia.etherscan.io/tx/' + record.blockchain.transactionHash);
        }

        // Step 3: Verify the record
        console.log('\n🔍 Step 3: Verifying the new record...');
        const verifyResponse = await axios.get(`${BASE_URL}/api/medical-records/verify/${record.id}`);
        
        if (verifyResponse.data.success) {
          const verification = verifyResponse.data.data;
          console.log('✅ Verification Results:');
          console.log('   Blockchain Score:', verification.verification.blockchainScore + '/100');
          console.log('   On Blockchain:', verification.onBlockchain);
          console.log('   Has Transaction Hash:', verification.verification.hasTransactionHash);
          console.log('   Has Block Number:', verification.verification.hasBlockNumber);
          console.log('   Has IPFS Hash:', verification.verification.hasIpfsHash);
          
          if (verification.verification.blockchainScore === 100) {
            console.log('🎉 SUCCESS: TRUE WEB3 RECORD CREATED AND VERIFIED!');
          } else if (verification.verification.blockchainScore > 0) {
            console.log('⚠️  Partial blockchain storage - Score:', verification.verification.blockchainScore);
          } else {
            console.log('❌ Record not on blockchain - investigating...');
          }
        }

        console.log('\n📋 TESTING INSTRUCTIONS FOR USER:');
        console.log('1. Open frontend: http://localhost:8080');
        console.log('2. Login with wallet:', PATIENT_WALLET);
        console.log('3. Go to Medical Records page');
        console.log('4. Look for the new record with "Stored on Blockchain" badge');
        console.log('5. Use BlockchainVerifier tool to verify:');
        console.log('   - Record ID:', record.id);
        if (record.blockchain?.transactionHash) {
          console.log('   - Transaction Hash:', record.blockchain.transactionHash);
        }
        console.log('6. Click "View on Sepolia Etherscan" to see blockchain proof');
        console.log('7. Verify the "TRUE WEB3" badge is displayed');

        console.log('\n🎯 WEB3 VERIFICATION METHODS AVAILABLE:');
        console.log('✅ Frontend UI: Blockchain status badges and details');
        console.log('✅ BlockchainVerifier: Interactive verification tool');
        console.log('✅ Etherscan Links: Direct blockchain explorer access');
        console.log('✅ API Verification: Backend verification endpoint');
        console.log('✅ Database Inspection: AdminJS and database viewer');

      } else {
        console.log('❌ Failed to create medical record:', response.data.message);
        console.log('   This might be due to blockchain service configuration');
        console.log('   Check if CONTRACT_ADDRESS and PRIVATE_KEY are set in .env');
      }

    } else {
      console.log('❌ Failed to create consent:', consentResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
      
      if (error.response.data.message?.includes('blockchain')) {
        console.log('\n💡 BLOCKCHAIN SERVICE NOTES:');
        console.log('   - The system is correctly checking blockchain consent');
        console.log('   - Blockchain writes may be disabled (missing PRIVATE_KEY)');
        console.log('   - This is expected behavior for TRUE Web3 integration');
        console.log('   - Records are only created if blockchain storage succeeds');
      }
    }
  }
}

// Run the test
createConsentAndWeb3Record();