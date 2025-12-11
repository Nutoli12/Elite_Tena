/**
 * Create Real Sepolia Blockchain Medical Record
 * This will create an actual transaction on Sepolia that you can see on Etherscan
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: 'elite-tena-smart-contracts/.env' });

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function createRealSepoliaMedicalRecord() {
  try {
    console.log('🚀 ========== CREATING REAL SEPOLIA MEDICAL RECORD ==========\n');

    // 1. Setup provider and wallet
    console.log('1️⃣ Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('   📍 Network:', await provider.getNetwork());
    console.log('   👤 Wallet Address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('   💰 Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      console.log('❌ No ETH balance! You need Sepolia ETH to create transactions.');
      console.log('   Get free Sepolia ETH from: https://sepoliafaucet.com/');
      return;
    }

    // 2. Load contract ABI
    console.log('\n2️⃣ Loading smart contract...');
    const abiPath = path.join('elite-tena-smart-contracts', 'artifacts', 'contracts', 'EliteHealthSystemEnhanced.sol', 'EliteHealthSystemEnhanced.json');
    
    if (!fs.existsSync(abiPath)) {
      console.log('❌ Contract ABI not found. Compiling contract...');
      // You might need to run: cd elite-tena-smart-contracts && npx hardhat compile
      return;
    }
    
    const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, wallet);
    
    console.log('   📋 Contract Address:', CONTRACT_ADDRESS);
    console.log('   ✅ Contract loaded successfully');

    // 3. Create medical record data
    console.log('\n3️⃣ Preparing medical record data...');
    const medicalRecordData = {
      patientAddress: wallet.address, // Using wallet as patient for demo
      doctorAddress: wallet.address,  // Using wallet as doctor for demo
      recordType: 'Real Blockchain Consultation',
      ipfsHash: 'QmRealRecord' + Date.now() + Math.random().toString(36).substring(2, 8),
      diagnosis: 'Real blockchain medical record test',
      treatment: 'Successfully stored on Sepolia blockchain',
      symptoms: ['blockchain verification', 'real transaction'],
      visitDate: Math.floor(Date.now() / 1000), // Unix timestamp
      isEncrypted: true
    };

    console.log('   👤 Patient:', medicalRecordData.patientAddress);
    console.log('   👨‍⚕️ Doctor:', medicalRecordData.doctorAddress);
    console.log('   📋 Type:', medicalRecordData.recordType);
    console.log('   📁 IPFS Hash:', medicalRecordData.ipfsHash);

    // 4. Estimate gas
    console.log('\n4️⃣ Estimating gas...');
    try {
      const gasEstimate = await contract.storeMedicalRecord.estimateGas(
        medicalRecordData.patientAddress,
        medicalRecordData.ipfsHash
      );
      
      console.log('   ⛽ Estimated Gas:', gasEstimate.toString());
      
      // Get current gas price
      const gasPrice = await provider.getFeeData();
      console.log('   💰 Gas Price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
      
      const estimatedCost = gasEstimate * gasPrice.gasPrice;
      console.log('   💸 Estimated Cost:', ethers.formatEther(estimatedCost), 'ETH');
      
    } catch (error) {
      console.log('   ⚠️ Gas estimation failed:', error.message);
    }

    // 5. Create the transaction
    console.log('\n5️⃣ Creating blockchain transaction...');
    console.log('   ⏳ Sending transaction to Sepolia...');
    
    const tx = await contract.storeMedicalRecord(
      medicalRecordData.patientAddress,
      medicalRecordData.ipfsHash
    );

    console.log('   📤 Transaction Hash:', tx.hash);
    console.log('   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    // 6. Wait for confirmation
    console.log('\n6️⃣ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    console.log('   ✅ Transaction confirmed!');
    console.log('   📦 Block Number:', receipt.blockNumber);
    console.log('   ⛽ Gas Used:', receipt.gasUsed.toString());
    console.log('   💰 Gas Price:', ethers.formatUnits(receipt.gasPrice, 'gwei'), 'gwei');
    
    const totalCost = receipt.gasUsed * receipt.gasPrice;
    console.log('   💸 Total Cost:', ethers.formatEther(totalCost), 'ETH');

    // 7. Extract event data
    console.log('\n7️⃣ Extracting event data...');
    const events = receipt.logs;
    console.log('   📋 Events emitted:', events.length);
    
    // Try to decode events
    for (let i = 0; i < events.length; i++) {
      try {
        const decodedEvent = contract.interface.parseLog(events[i]);
        if (decodedEvent.name === 'MedicalRecordStored') {
          console.log('   🎉 MedicalRecordStored event found!');
          console.log('   👤 Patient:', decodedEvent.args.patient);
          console.log('   👨‍⚕️ Doctor:', decodedEvent.args.doctor);
          console.log('   📁 IPFS Hash:', decodedEvent.args.ipfsHash);
        }
      } catch (e) {
        // Event might not be from our contract
      }
    }

    // 8. Success summary
    console.log('\n🎉 ========== SUCCESS! REAL BLOCKCHAIN RECORD CREATED ==========');
    console.log('');
    console.log('📋 TRANSACTION DETAILS:');
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Network: Sepolia Testnet`);
    console.log('');
    console.log('🔗 VIEW ON ETHERSCAN:');
    console.log(`   https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log('');
    console.log('📱 WHAT TO DO NEXT:');
    console.log('   1. Click the Etherscan link above');
    console.log('   2. You will see your REAL blockchain transaction');
    console.log('   3. Update your database with this real transaction hash');
    console.log('   4. Your medical record will show "✅ REAL BLOCKCHAIN" badge');
    console.log('');
    console.log('💡 DATABASE UPDATE NEEDED:');
    console.log('   Update medical record with:');
    console.log(`   - blockchainTxHash: "${tx.hash}"`);
    console.log(`   - blockNumber: ${receipt.blockNumber}`);
    console.log(`   - gasUsed: "${receipt.gasUsed.toString()}"`);
    console.log(`   - onBlockchain: true`);
    console.log(`   - syncedToBlockchain: true`);

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
    };

  } catch (error) {
    console.error('❌ Error creating real blockchain medical record:', error);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 SOLUTION: Get Sepolia ETH');
      console.log('   1. Go to: https://sepoliafaucet.com/');
      console.log('   2. Enter your wallet address:', wallet?.address || 'YOUR_WALLET_ADDRESS');
      console.log('   3. Request free Sepolia ETH');
      console.log('   4. Wait for the transaction to confirm');
      console.log('   5. Run this script again');
    }
    
    return { success: false, error: error.message };
  }
}

// Run the function
createRealSepoliaMedicalRecord();