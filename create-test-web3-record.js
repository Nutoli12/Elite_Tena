/**
 * Create a test medical record with TRUE Web3 integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const PATIENT_WALLET = '0x1764894073908ypl7fp';
const DOCTOR_WALLET = '0x1764894943291khtk9h';

async function createTestWeb3Record() {
  console.log('📝 ========== CREATING TEST WEB3 MEDICAL RECORD ==========');
  
  try {
    // Create a medical record with IPFS hash (required for blockchain storage)
    const recordData = {
      patientWalletAddress: PATIENT_WALLET,
      doctorWalletAddress: DOCTOR_WALLET,
      recordType: 'consultation',
      title: 'Web3 Test Record - Blockchain Verification',
      description: 'This is a test medical record to verify TRUE Web3 integration',
      diagnosis: 'Blockchain Storage Test',
      treatment: 'Verify on Sepolia Etherscan',
      symptoms: ['Web3 verification', 'Blockchain testing'],
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

      // Now verify the record
      console.log('\n🔍 Verifying the new record...');
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
        } else {
          console.log('⚠️  Partial blockchain storage - Score:', verification.verification.blockchainScore);
        }
      }

      console.log('\n📋 TESTING INSTRUCTIONS:');
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

    } else {
      console.log('❌ Failed to create medical record:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Error creating test record:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
createTestWeb3Record();