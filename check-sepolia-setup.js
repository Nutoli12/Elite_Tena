/**
 * Check Sepolia Setup
 * Verify if everything is ready to create real blockchain transactions
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: 'elite-tena-smart-contracts/.env' });

async function checkSepoliaSetup() {
  try {
    console.log('🔍 ========== SEPOLIA SETUP CHECK ==========\n');

    // 1. Check environment variables
    console.log('1️⃣ Checking configuration...');
    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    console.log('   📡 Sepolia RPC:', SEPOLIA_RPC_URL ? '✅ Configured' : '❌ Missing');
    console.log('   🔑 Private Key:', PRIVATE_KEY ? '✅ Configured' : '❌ Missing');
    console.log('   📋 Contract Address:', CONTRACT_ADDRESS ? '✅ Configured' : '❌ Missing');

    if (!SEPOLIA_RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
      console.log('\n❌ Configuration incomplete. Check elite-tena-smart-contracts/.env file');
      return;
    }

    // 2. Test network connection
    console.log('\n2️⃣ Testing network connection...');
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    
    try {
      const network = await provider.getNetwork();
      console.log('   🌐 Network Name:', network.name);
      console.log('   🆔 Chain ID:', network.chainId.toString());
      console.log('   ✅ Connection successful');
    } catch (error) {
      console.log('   ❌ Network connection failed:', error.message);
      return;
    }

    // 3. Check wallet
    console.log('\n3️⃣ Checking wallet...');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log('   👤 Wallet Address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('   💰 Balance:', balanceEth, 'ETH');
    
    if (balance === 0n) {
      console.log('   ❌ No ETH balance - you need Sepolia ETH to create transactions');
      console.log('\n💡 HOW TO GET SEPOLIA ETH:');
      console.log('   1. Go to: https://sepoliafaucet.com/');
      console.log('   2. Enter your wallet address:', wallet.address);
      console.log('   3. Complete the captcha');
      console.log('   4. Click "Send Me ETH"');
      console.log('   5. Wait 1-2 minutes for the transaction');
      console.log('   6. Run this script again to verify');
      return;
    } else {
      console.log('   ✅ Sufficient balance for transactions');
    }

    // 4. Check contract
    console.log('\n4️⃣ Checking smart contract...');
    
    // Check if contract exists
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log('   ❌ Contract not deployed at address:', CONTRACT_ADDRESS);
      console.log('\n💡 DEPLOY CONTRACT:');
      console.log('   1. cd elite-tena-smart-contracts');
      console.log('   2. npm install');
      console.log('   3. npx hardhat compile');
      console.log('   4. npx hardhat run scripts/deploy-enhanced.js --network sepolia');
      return;
    } else {
      console.log('   ✅ Contract deployed at:', CONTRACT_ADDRESS);
      console.log('   📏 Contract size:', code.length, 'bytes');
    }

    // 5. Check ABI file
    console.log('\n5️⃣ Checking contract ABI...');
    const abiPath = 'elite-tena-smart-contracts/artifacts/contracts/EliteHealthSystemEnhanced.sol/EliteHealthSystemEnhanced.json';
    
    if (!fs.existsSync(abiPath)) {
      console.log('   ❌ Contract ABI not found');
      console.log('\n💡 COMPILE CONTRACT:');
      console.log('   1. cd elite-tena-smart-contracts');
      console.log('   2. npx hardhat compile');
      return;
    } else {
      console.log('   ✅ Contract ABI found');
    }

    // 6. Test contract interaction
    console.log('\n6️⃣ Testing contract interaction...');
    try {
      const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      // Try to call a read-only function (if it exists)
      console.log('   ✅ Contract interface loaded');
      console.log('   📋 Available functions:', Object.keys(contract.interface.functions).length);
    } catch (error) {
      console.log('   ❌ Contract interaction failed:', error.message);
      return;
    }

    // 7. Success summary
    console.log('\n🎉 ========== SETUP COMPLETE! ==========');
    console.log('');
    console.log('✅ All requirements met for real blockchain transactions:');
    console.log('   🌐 Sepolia network connection');
    console.log('   👤 Wallet with ETH balance');
    console.log('   📋 Smart contract deployed');
    console.log('   🔧 Contract ABI available');
    console.log('');
    console.log('🚀 READY TO CREATE REAL BLOCKCHAIN RECORDS!');
    console.log('');
    console.log('📱 NEXT STEPS:');
    console.log('   1. Run: node create-real-sepolia-medical-record.js');
    console.log('   2. Wait for transaction confirmation');
    console.log('   3. View your transaction on Sepolia Etherscan');
    console.log('   4. Update your database with the real transaction hash');
    console.log('');
    console.log('🔗 USEFUL LINKS:');
    console.log('   Sepolia Etherscan: https://sepolia.etherscan.io/');
    console.log('   Your Contract: https://sepolia.etherscan.io/address/' + CONTRACT_ADDRESS);
    console.log('   Your Wallet: https://sepolia.etherscan.io/address/' + wallet.address);

  } catch (error) {
    console.error('❌ Setup check failed:', error);
  }
}

// Run the check
checkSepoliaSetup();