/**
 * Check Current Medical Records
 * See what's actually in the database right now
 */

import db from './server/src/models/index.js';
const { MedicalRecord } = db;

async function checkCurrentRecords() {
  try {
    console.log('🔍 ========== CHECKING CURRENT MEDICAL RECORDS ==========\n');

    const records = await MedicalRecord.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log(`📋 Found ${records.length} records in database:\n`);

    records.forEach((record, index) => {
      console.log(`${index + 1}. ${record.title}`);
      console.log(`   📋 ID: ${record.id}`);
      console.log(`   🔗 TX: ${record.blockchainTxHash?.substring(0, 20)}...`);
      console.log(`   📦 Block: ${record.blockNumber || 'None'}`);
      console.log(`   ✅ On Blockchain: ${record.onBlockchain}`);
      console.log(`   👤 Patient: ${record.patientWalletAddress?.substring(0, 10)}...`);
      console.log('');
    });

    // Check specifically for our real transaction
    const realTxRecord = records.find(r => 
      r.blockchainTxHash === '0x69ce72aea1b7908ad55efdf07a384eed6332b7218ab130c18a31514eebc080f2'
    );

    if (realTxRecord) {
      console.log('🎉 FOUND REAL TRANSACTION RECORD!');
      console.log(`   📋 Title: ${realTxRecord.title}`);
      console.log(`   🔗 TX: ${realTxRecord.blockchainTxHash}`);
      console.log(`   📦 Block: ${realTxRecord.blockNumber}`);
      console.log(`   👤 Patient: ${realTxRecord.patientWalletAddress}`);
      console.log('');
      console.log('✅ This record should show "REAL BLOCKCHAIN" badge in frontend');
      console.log('✅ Etherscan link should be clickable');
      console.log('🔗 https://sepolia.etherscan.io/tx/' + realTxRecord.blockchainTxHash);
    } else {
      console.log('❌ Real transaction record not found in database');
      console.log('💡 The update might not have worked properly');
    }

  } catch (error) {
    console.error('❌ Error checking records:', error.message);
  }
}

checkCurrentRecords();