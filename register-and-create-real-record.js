/**
 * Register User and Create Real Sepolia Medical Record
 * First register as a user, then create a real blockchain medical record
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

async function registerAndCreateRealRecord() {
  try {
    console.log('🚀 ========== REGISTER USER & CREATE REAL RECORD ==========\n');

    // 1. Setup provider and wallet
    console.log('1️⃣ Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('   👤 Wallet Address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('   💰 Balance:', ethers.formatEther(balance), 'ETH');

    // 2. Load contract
    console.log('\n2️⃣ Loading smart contract...');
    const abiPath = path.join('elite-tena-smart-contracts', 'artifacts', 'contracts', 'EliteHealthSystemEnhanced.sol', 'EliteHealthSystemEnhanced.json');
    const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, wallet);
    
    console.log('   📋 Contract Address:', CONTRACT_ADDRESS);

    // 3. Check if user is already registered
    console.log('\n3️⃣ Checking user registration...');
    try {
      const user = await contract.users(wallet.address);
      console.log('   📋 User Role:', user.role.toString());
      console.log('   ✅ Is Registered:', user.isRegistered);
      
      if (!user.isRegistered) {
        console.log('   ❌ User not registered. Registering as patient...');
        
        // Register as patient (role = 1)
        console.log('\n4️⃣ Registering as patient...');
        const patientFee = await contract.patientFee();
        console.log('   💰 Registration Fee:', ethers.formatEther(patientFee), 'ETH');
        
        const registerTx = await contract.registerPatient('Patient Profile Data', {
          value: patientFee
        });
        
        console.log('   📤 Registration TX:', registerTx.hash);
        console.log('   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + registerTx.hash);
        
        const registerReceipt = await registerTx.wait();
        console.log('   ✅ Registration confirmed in block:', registerReceipt.blockNumber);
        
        // Also register as doctor (role = 2) so we can store medical records
        console.log('\n5️⃣ Registering as doctor...');
        const doctorFee = await contract.doctorFee();
        console.log('   💰 Doctor Fee:', ethers.formatEther(doctorFee), 'ETH');
        
        const doctorTx = await contract.registerDoctor('Doctor Profile Data', {
          value: doctorFee
        });
        
        console.log('   📤 Doctor Registration TX:', doctorTx.hash);
        console.log('   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + doctorTx.hash);
        
        const doctorReceipt = await doctorTx.wait();
        console.log('   ✅ Doctor registration confirmed in block:', doctorReceipt.blockNumber);
        
      } else {
        console.log('   ✅ User already registered');
      }
    } catch (error) {
      console.log('   ❌ Error checking registration:', error.message);
    }

    // 6. Create medical record
    console.log('\n6️⃣ Creating medical record...');
    const ipfsHash = 'QmRealRecord' + Date.now() + Math.random().toString(36).substring(2, 8);
    console.log('   📁 IPFS Hash:', ipfsHash);
    console.log('   👤 Patient:', wallet.address);
    
    // Estimate gas
    try {
      const gasEstimate = await contract.storeMedicalRecord.estimateGas(
        wallet.address,
        ipfsHash
      );
      console.log('   ⛽ Estimated Gas:', gasEstimate.toString());
    } catch (error) {
      console.log('   ⚠️ Gas estimation failed:', error.message);
    }

    // Create the transaction
    console.log('   ⏳ Sending medical record transaction...');
    const tx = await contract.storeMedicalRecord(
      wallet.address,
      ipfsHash
    );

    console.log('   📤 Transaction Hash:', tx.hash);
    console.log('   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    // Wait for confirmation
    console.log('\n7️⃣ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    console.log('   ✅ Transaction confirmed!');
    console.log('   📦 Block Number:', receipt.blockNumber);
    console.log('   ⛽ Gas Used:', receipt.gasUsed.toString());
    
    const totalCost = receipt.gasUsed * receipt.gasPrice;
    console.log('   💸 Total Cost:', ethers.formatEther(totalCost), 'ETH');

    // Extract events
    console.log('\n8️⃣ Extracting events...');
    for (let i = 0; i < receipt.logs.length; i++) {
      try {
        const decodedEvent = contract.interface.parseLog(receipt.logs[i]);
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

    // Success summary
    console.log('\n🎉 ========== SUCCESS! REAL BLOCKCHAIN RECORD CREATED ==========');
    console.log('');
    console.log('📋 REAL TRANSACTION DETAILS:');
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Network: Sepolia Testnet`);
    console.log('');
    console.log('🔗 VIEW ON SEPOLIA ETHERSCAN:');
    console.log(`   https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log('');
    console.log('✅ THIS IS A REAL BLOCKCHAIN TRANSACTION!');
    console.log('   - You can click the Etherscan link above');
    console.log('   - You will see your actual transaction on Sepolia');
    console.log('   - This is NOT a demo or legacy transaction');
    console.log('   - This is stored on the real Ethereum Sepolia blockchain');
    console.log('');
    console.log('📱 NEXT STEPS:');
    console.log('   1. Click the Etherscan link to verify');
    console.log('   2. Update your database with this real transaction');
    console.log('   3. Your medical record will show "✅ REAL BLOCKCHAIN"');
    console.log('');
    console.log('💾 DATABASE UPDATE COMMAND:');
    console.log(`   UPDATE medical_records SET`);
    console.log(`     blockchainTxHash = '${tx.hash}',`);
    console.log(`     blockNumber = ${receipt.blockNumber},`);
    console.log(`     gasUsed = '${receipt.gasUsed.toString()}',`);
    console.log(`     onBlockchain = true,`);
    console.log(`     syncedToBlockchain = true,`);
    console.log(`     ipfsHash = '${ipfsHash}'`);
    console.log(`   WHERE patientWalletAddress = '${wallet.address}';`);

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      ipfsHash: ipfsHash,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
    };

  } catch (error) {
    console.error('❌ Error:', error);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 SOLUTION: Get more Sepolia ETH');
      console.log('   Registration fees: ~0.03 ETH total');
      console.log('   Go to: https://sepoliafaucet.com/');
    }
    
    return { success: false, error: error.message };
  }
}

// Run the function
registerAndCreateRealRecord();