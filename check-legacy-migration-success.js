/**
 * Check Legacy Migration Success
 * Verify that old Web2 records now have blockchain metadata
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3003/api';

async function checkLegacyMigrationSuccess() {
  try {
    console.log('🔍 ========== LEGACY MIGRATION SUCCESS CHECK ==========\n');

    // 1. Check migration status
    console.log('1️⃣ Checking migration status...');
    const statusResponse = await axios.get(`${API_BASE}/legacy-migration/status`);
    const status = statusResponse.data.data;
    
    console.log('📊 Migration Status:');
    console.log(`   Total Records: ${status.total}`);
    console.log(`   On Blockchain: ${status.onBlockchain}`);
    console.log(`   Web2 Only: ${status.web2only}`);
    console.log(`   Demo Mode: ${status.demo}`);
    console.log(`   Legacy Migrated: ${status.legacy}`);
    console.log(`   Real Blockchain: ${status.real}`);
    console.log(`   Migration Available: ${status.migrationAvailable}`);

    // 2. Check specific records
    console.log('\n2️⃣ Checking specific medical records...');
    
    // Get all patients to check their records
    const patients = [
      '0x1765374535552776ch',
      '0x1764894073908ypl7fp', 
      '0x1765212874227cyqjkd',
      '0x17651979962711di2gn'
    ];

    for (const patientWallet of patients) {
      try {
        const recordsResponse = await axios.get(`${API_BASE}/medical-records/${patientWallet}`);
        
        if (recordsResponse.data.success && recordsResponse.data.data.length > 0) {
          console.log(`\n👤 Patient: ${patientWallet.substring(0, 12)}...`);
          
          recordsResponse.data.data.forEach((record, index) => {
            console.log(`   📋 Record ${index + 1}: ${record.title || record.recordType}`);
            console.log(`      🔗 Blockchain TX: ${record.blockchainTxHash || 'None'}`);
            console.log(`      📦 Block Number: ${record.blockNumber || 'None'}`);
            console.log(`      ⛽ Gas Used: ${record.gasUsed || 'None'}`);
            console.log(`      ✅ On Blockchain: ${record.onBlockchain ? 'YES' : 'NO'}`);
            console.log(`      📁 IPFS Hash: ${record.ipfsHash || 'None'}`);
            
            // Determine record type
            let recordType = 'Unknown';
            if (record.blockchainTxHash?.startsWith('0xDEMO')) {
              recordType = 'Demo Mode';
            } else if (record.blockchainTxHash?.startsWith('0xLEGACY')) {
              recordType = 'Legacy Migrated';
            } else if (record.blockchainTxHash && record.onBlockchain) {
              recordType = 'Real Blockchain';
            } else {
              recordType = 'Web2 Only';
            }
            console.log(`      🏷️  Type: ${recordType}`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Error fetching records for ${patientWallet}: ${error.message}`);
      }
    }

    // 3. Summary
    console.log('\n3️⃣ Migration Summary:');
    if (status.web2only === 0) {
      console.log('✅ SUCCESS: All records are now on blockchain!');
      console.log(`   📈 ${status.legacy} legacy records successfully migrated`);
      console.log(`   🎯 ${status.demo} demo mode records available`);
      console.log(`   🔄 Background sync will move demo/legacy to real blockchain`);
    } else {
      console.log(`⚠️  ${status.web2only} records still need migration`);
    }

    console.log('\n🎉 Legacy migration verification complete!');

  } catch (error) {
    console.error('❌ Error checking migration success:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the check
checkLegacyMigrationSuccess();