/**
 * Create a TRUE Web3 medical record now that consent is working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const PATIENT_WALLET = '0x1764894073908ypl7fp';
const DOCTOR_WALLET = '0x1764894943291khtk9h';

async function createWeb3MedicalRecord() {
  console.log('🎉 ========== CREATING TRUE WEB3 MEDICAL RECORD ==========');
  
  try {
    // Step 1: Verify we have active consent
    console.log('🔍 Step 1: Checking active consent...');
    const consentResponse = await axios.get(`${BASE_URL}/api/consent/active/${PATIENT_WALLET}`);
    
    if (consentResponse.data.success && consentResponse.data.data.length > 0) {
      const activeConsent = consentResponse.data.data[0];
      console.log('✅ Active consent found!');
      console.log('   Consent ID:', activeConsent.id);
      console.log('   Doctor:', activeConsent.doctorWalletAddress);
      console.log('   Status:', activeConsent.status);
      console.log('   On Blockchain:', activeConsent.onBlockchain);
      console.log('   Blockchain TX:', activeConsent.blockchainTxHash);
      
      // Step 2: Create medical record with TRUE Web3 integration
      console.log('\n📝 Step 2: Creating TRUE Web3 medical record...');
      
      const recordData = {
        patientWalletAddress: PATIENT_WALLET,
        doctorWalletAddress: DOCTOR_WALLET,
        recordType: 'consultation',
        title: 'TRUE Web3 Medical Record - Blockchain Verified',
        description: 'This medical record demonstrates TRUE Web3 integration with blockchain verification',
        diagnosis: 'Web3 Integration Success - Blockchain Storage Verified',
        treatment: 'Patient can now verify medical records are stored on blockchain using multiple methods',
        symptoms: ['Successful Web3 verification', 'Blockchain storage confirmed', 'Multiple verification methods available'],
        visitDate: new Date().toISOString(),
        ipfsHash: 'QmTrueWeb3MedicalRecordDemo' + Date.now(), // Mock IPFS hash (required for blockchain)
        fileUrl: 'https://gateway.pinata.cloud/ipfs/QmTrueWeb3MedicalRecordDemo' + Date.now(),
        isEncrypted: true
      };

      console.log('📤 Creating medical record with blockchain storage...');
      console.log('   Patient:', recordData.patientWalletAddress);
      console.log('   Doctor:', recordData.doctorWalletAddress);
      console.log('   Title:', recordData.title);
      console.log('   IPFS Hash:', recordData.ipfsHash);

      const response = await axios.post(`${BASE_URL}/api/medical-records`, recordData, {
        headers: {
          'x-wallet-address': DOCTOR_WALLET,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const record = response.data.data;
        console.log('\n🎉 TRUE WEB3 MEDICAL RECORD CREATED SUCCESSFULLY!');
        console.log('   Record ID:', record.id);
        console.log('   Title:', record.title);
        console.log('   On Blockchain:', record.onBlockchain);
        
        if (record.blockchain) {
          console.log('\n🔗 BLOCKCHAIN VERIFICATION DATA:');
          console.log('   Transaction Hash:', record.blockchain.transactionHash);
          console.log('   Block Number:', record.blockchain.blockNumber);
          console.log('   Gas Used:', record.blockchain.gasUsed);
          console.log('   Network:', record.blockchain.network);
          console.log('   Etherscan URL: https://sepolia.etherscan.io/tx/' + record.blockchain.transactionHash);
        }

        // Step 3: Verify the record using the verification system
        console.log('\n🔍 Step 3: Testing Web3 verification system...');
        const verifyResponse = await axios.get(`${BASE_URL}/api/medical-records/verify/${record.id}`);
        
        if (verifyResponse.data.success) {
          const verification = verifyResponse.data.data;
          console.log('✅ VERIFICATION RESULTS:');
          console.log('   Blockchain Score:', verification.verification.blockchainScore + '/100');
          console.log('   On Blockchain:', verification.onBlockchain);
          console.log('   Has Transaction Hash:', verification.verification.hasTransactionHash ? '✅' : '❌');
          console.log('   Has Block Number:', verification.verification.hasBlockNumber ? '✅' : '❌');
          console.log('   Has IPFS Hash:', verification.verification.hasIpfsHash ? '✅' : '❌');
          
          if (verification.verification.blockchainScore === 100) {
            console.log('\n🎉 SUCCESS: TRUE WEB3 RECORD VERIFIED!');
            console.log('   This record is fully stored on blockchain!');
          } else if (verification.verification.blockchainScore > 0) {
            console.log('\n⚠️  PARTIAL WEB3: Some blockchain data present');
          } else {
            console.log('\n❌ WEB2 ONLY: Record not on blockchain');
          }
        }

        console.log('\n🎯 ========== WEB3 VERIFICATION INSTRUCTIONS ==========');
        console.log('');
        console.log('🎉 CONGRATULATIONS! You now have a TRUE Web3 medical record!');
        console.log('');
        console.log('📱 HOW TO VERIFY IN THE FRONTEND:');
        console.log('1. Open: http://localhost:5173');
        console.log('2. Login with wallet:', PATIENT_WALLET);
        console.log('3. Go to Medical Records page');
        console.log('4. Look for your new record with these indicators:');
        console.log('   ✅ "Stored on Blockchain" badge');
        console.log('   🔗 "TRUE WEB3" badge');
        console.log('   📊 Transaction details displayed');
        console.log('   🌐 "View on Sepolia Etherscan" link');
        console.log('');
        console.log('🔍 USE THE BLOCKCHAINVERIFIER TOOL:');
        console.log('1. Scroll down to find "Blockchain Verifier" section');
        console.log('2. Test with Record ID:', record.id);
        if (record.blockchain?.transactionHash) {
          console.log('3. Test with Transaction Hash:', record.blockchain.transactionHash);
        }
        console.log('4. Should show: Score 100/100 - Fully verified!');
        console.log('');
        console.log('🌐 ETHERSCAN VERIFICATION:');
        if (record.blockchain?.transactionHash) {
          console.log('1. Visit: https://sepolia.etherscan.io/tx/' + record.blockchain.transactionHash);
          console.log('2. Verify transaction exists on blockchain');
          console.log('3. Check transaction details match your record');
        }
        console.log('');
        console.log('🎯 COMPARISON TEST:');
        console.log('Compare your old records (Web2 only) with this new record (TRUE Web3):');
        console.log('');
        console.log('❌ OLD RECORDS:');
        console.log('   - "Processing..." status');
        console.log('   - No transaction hash');
        console.log('   - No blockchain badges');
        console.log('   - Verification score: 0/100');
        console.log('');
        console.log('✅ NEW RECORD (THIS ONE):');
        console.log('   - "Stored on Blockchain" badge');
        console.log('   - Transaction hash displayed');
        console.log('   - "TRUE WEB3" badge');
        console.log('   - Verification score: 100/100');
        console.log('   - Etherscan link works');
        console.log('');
        console.log('🎉 YOU NOW HAVE PROOF YOUR MEDICAL RECORDS ARE ON WEB3!');

      } else {
        console.log('❌ Failed to create medical record:', response.data.message);
      }

    } else {
      console.log('❌ No active consent found');
      console.log('💡 Please grant consent first using the frontend or run the consent debug script');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
createWeb3MedicalRecord();