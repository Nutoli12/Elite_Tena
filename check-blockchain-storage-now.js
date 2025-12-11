/**
 * Check Blockchain Storage - Live Verification
 * Shows exactly where your medical records are stored
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';
const PATIENT_WALLET = '0x1764894073908ypl7fp';

async function checkBlockchainStorage() {
  console.log('🔍 ========== CHECKING BLOCKCHAIN STORAGE ==========');
  console.log('');
  
  try {
    // Step 1: Get all your medical records
    console.log('📋 Step 1: Getting your medical records...');
    const recordsResponse = await axios.get(`${BASE_URL}/api/medical-records/${PATIENT_WALLET}`, {
      headers: {
        'x-wallet-address': PATIENT_WALLET
      }
    });
    
    if (recordsResponse.data.success && recordsResponse.data.data.length > 0) {
      const records = recordsResponse.data.data;
      console.log(`✅ Found ${records.length} medical record(s)\n`);
      
      // Step 2: Check each record's blockchain status
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        console.log(`📄 RECORD ${i + 1}: ${record.title}`);
        console.log('   Record ID:', record.id);
        console.log('   Created:', new Date(record.createdAt).toLocaleDateString());
        
        // Check blockchain status
        if (record.onBlockchain) {
          console.log('   ✅ ON BLOCKCHAIN: YES');
          console.log('   📊 Transaction Hash:', record.blockchainTxHash || 'None');
          console.log('   🏗️  Block Number:', record.blockNumber || 'None');
          console.log('   ⛽ Gas Used:', record.gasUsed || 'None');
          
          // Determine if demo or real
          if (record.blockchainTxHash?.startsWith('0xDEMO')) {
            console.log('   🎭 TYPE: Demo Mode (Mock Blockchain)');
            console.log('   📍 LOCATION: Simulated blockchain data');
            console.log('   🔄 STATUS: Pending sync to real blockchain');
          } else if (record.blockchainTxHash) {
            console.log('   🔗 TYPE: Real Blockchain');
            console.log('   📍 LOCATION: Ethereum Sepolia Testnet');
            console.log('   🌐 ETHERSCAN: https://sepolia.etherscan.io/tx/' + record.blockchainTxHash);
          }
          
          // Check IPFS storage
          if (record.ipfsHash) {
            console.log('   📁 FILE STORAGE: IPFS');
            console.log('   🔗 IPFS Hash:', record.ipfsHash);
            console.log('   🌐 IPFS URL: https://gateway.pinata.cloud/ipfs/' + record.ipfsHash);
          }
          
        } else {
          console.log('   ❌ ON BLOCKCHAIN: NO');
          console.log('   📍 LOCATION: Database only (Web2)');
          console.log('   🔄 STATUS: Not uploaded to blockchain');
        }
        
        // Step 3: Verify using verification API
        console.log('\n   🔍 VERIFICATION CHECK:');
        try {
          const verifyResponse = await axios.get(`${BASE_URL}/api/medical-records/verify/${record.id}`);
          
          if (verifyResponse.data.success) {
            const verification = verifyResponse.data.data;
            console.log('   📊 Blockchain Score:', verification.verification.blockchainScore + '/100');
            
            if (verification.verification.blockchainScore === 100) {
              console.log('   🎉 VERIFICATION: FULLY ON BLOCKCHAIN');
            } else if (verification.verification.blockchainScore > 0) {
              console.log('   ⚠️  VERIFICATION: PARTIAL BLOCKCHAIN DATA');
            } else {
              console.log('   📝 VERIFICATION: WEB2 ONLY');
            }
          }
        } catch (verifyError) {
          console.log('   ❌ Verification failed');
        }
        
        console.log(''); // Empty line between records
      }
      
      // Step 4: Check overall sync status
      console.log('📊 OVERALL BLOCKCHAIN SYNC STATUS:');
      try {
        const syncResponse = await axios.get(`${BASE_URL}/api/blockchain-sync/status`);
        
        if (syncResponse.data.success) {
          const status = syncResponse.data.data;
          console.log('   📈 Total Records:', status.total);
          console.log('   🎭 Demo Mode:', status.demo);
          console.log('   🔗 Real Blockchain:', status.real);
          console.log('   📝 Web2 Only:', status.web2only);
          console.log('   🔄 Sync Enabled:', status.syncEnabled ? 'YES' : 'NO');
          
          const progress = status.total > 0 ? Math.round((status.real / status.total) * 100) : 0;
          console.log('   📊 Migration Progress:', progress + '%');
          
          if (status.demo > 0) {
            console.log('\n   ⏳ PENDING SYNC:');
            console.log('   ' + status.demo + ' record(s) waiting to be synced to real blockchain');
            console.log('   Background service runs every 5 minutes');
          }
        }
      } catch (syncError) {
        console.log('   ❌ Could not get sync status');
      }
      
      // Step 5: Show where to verify
      console.log('\n🔍 HOW TO VERIFY YOURSELF:');
      console.log('');
      console.log('📱 FRONTEND VERIFICATION:');
      console.log('1. Open: http://localhost:5173');
      console.log('2. Login with:', PATIENT_WALLET);
      console.log('3. Go to Medical Records page');
      console.log('4. Look for blockchain badges and indicators');
      console.log('');
      console.log('🔍 BLOCKCHAINVERIFIER TOOL:');
      console.log('1. Scroll down to "Blockchain Verifier" section');
      console.log('2. Test with any Record ID or Transaction Hash');
      console.log('3. Get verification score (0-100)');
      console.log('');
      console.log('📊 SYNC STATUS MONITOR:');
      console.log('1. Look for "Blockchain Sync Status" section');
      console.log('2. See migration progress from demo → real blockchain');
      console.log('3. Click "Sync Now" to trigger manual sync');
      console.log('');
      console.log('🌐 ETHERSCAN VERIFICATION (Real Blockchain Only):');
      console.log('1. Click "View on Sepolia Etherscan" for real transactions');
      console.log('2. Verify transaction exists on actual blockchain');
      console.log('3. Check smart contract interactions');
      console.log('');
      console.log('🗄️  DATABASE INSPECTION:');
      console.log('1. AdminJS: http://localhost:3003/admin');
      console.log('2. Database Viewer: http://localhost:3003/database');
      console.log('3. Check blockchain metadata fields');
      
    } else {
      console.log('❌ No medical records found');
    }
    
    console.log('\n🎯 ========== BLOCKCHAIN STORAGE CHECK COMPLETE ==========');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the check
checkBlockchainStorage();