const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'elite_health_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function addRealSepoliaRecord() {
  try {
    console.log('🔗 Adding real Sepolia transaction to medical records...');
    
    // Your real Sepolia transaction details
    const realTransaction = {
      patientWallet: '0x23C80449d4BE58945194C29D3A6AcCddca25fB04',
      doctorWallet: '0x23C80449d4BE58945194C29D3A6AcCddca25fB04',
      title: 'Patient Registration - Real Blockchain Verification',
      diagnosis: 'Successfully registered on Sepolia blockchain',
      treatment: 'Wallet registered as patient in Elite Health System smart contract',
      txHash: '0x69ce72aea1b7908ad55efdf07a384eed6332b7218ab130c18a31514eebc080f2',
      blockNumber: 9810739,
      gasUsed: '50000',
      ipfsHash: 'QmRealSepoliaRecord1234567890abcdef' // Mock IPFS for this demo
    };

    // Insert the real Sepolia record
    const insertQuery = `
      INSERT INTO medical_records (
        patientWalletAddress,
        doctorWalletAddress,
        recordType,
        title,
        diagnosis,
        treatment,
        symptoms,
        notes,
        ipfsHash,
        blockchainTxHash,
        blockNumber,
        gasUsed,
        onBlockchain,
        syncedToBlockchain,
        createdAt,
        updatedAt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const values = [
      realTransaction.patientWallet,
      realTransaction.doctorWallet,
      'registration',
      realTransaction.title,
      realTransaction.diagnosis,
      realTransaction.treatment,
      JSON.stringify(['blockchain_registration', 'wallet_verification']),
      'This record represents a real blockchain transaction on Sepolia testnet. Click the Etherscan link to verify!',
      realTransaction.ipfsHash,
      realTransaction.txHash,
      realTransaction.blockNumber,
      realTransaction.gasUsed,
      true, // onBlockchain
      true, // syncedToBlockchain
      new Date(),
      new Date()
    ];

    const result = await pool.query(insertQuery, values);
    
    console.log('✅ Real Sepolia record added successfully!');
    console.log('📋 Record details:');
    console.log('  - ID:', result.rows[0].id);
    console.log('  - Title:', result.rows[0].title);
    console.log('  - Transaction Hash:', result.rows[0].blockchainTxHash);
    console.log('  - Block Number:', result.rows[0].blockNumber);
    console.log('  - On Blockchain:', result.rows[0].onBlockchain);
    
    console.log('\n🔗 Etherscan Link:');
    console.log(`https://sepolia.etherscan.io/tx/${realTransaction.txHash}`);
    
    console.log('\n🎯 What to do next:');
    console.log('1. Refresh your medical records page');
    console.log('2. Look for the record: "Patient Registration - Real Blockchain Verification"');
    console.log('3. You should see a "REAL BLOCKCHAIN" badge');
    console.log('4. Click the external link icon next to the transaction hash');
    console.log('5. It will take you to Sepolia Etherscan showing your real transaction!');
    
  } catch (error) {
    console.error('❌ Error adding real Sepolia record:', error);
  } finally {
    await pool.end();
  }
}

addRealSepoliaRecord();