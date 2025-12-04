const BlockchainListener = require('./blockchain-listener.service');
const path = require('path');
const fs = require('fs');

async function initializeAllIntegrations() {
  console.log('🔗 Initializing blockchain integrations...');

  try {
    // Get contract ABI - try multiple locations
    const contractABIPaths = [
      path.join(__dirname, '../contracts/EliteHealthSystemEnhanced.json'),
      path.join(__dirname, '../../shared/contracts/EliteHealthSystemEnhanced.json'),
      path.join(__dirname, '../../elite-tena-smart-contracts/artifacts/contracts/EliteHealthSystemEnhanced.sol/EliteHealthSystemEnhanced.json')
    ];
    
    let contractABI;
    let abiFound = false;
    
    for (const abiPath of contractABIPaths) {
      if (fs.existsSync(abiPath)) {
        const contractJSON = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        contractABI = contractJSON.abi;
        console.log('✅ Contract ABI loaded from:', abiPath);
        abiFound = true;
        break;
      }
    }
    
    if (!abiFound) {
      console.warn('⚠️  Contract ABI not found. Blockchain integration disabled.');
      console.warn('   Run: cd elite-tena-smart-contracts && node scripts/export-abi.js');
      return null;
    }

    // Get configuration from environment
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const providerUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

    if (!contractAddress) {
      console.warn('⚠️  CONTRACT_ADDRESS not set. Blockchain integration disabled.');
      console.warn('   Deploy contract and update .env file');
      return null;
    }

    // Initialize blockchain listener
    const blockchainListener = new BlockchainListener(
      contractAddress,
      contractABI,
      providerUrl
    );

    // Start event listeners
    await blockchainListener.startListening();

    console.log('✅ All integrations initialized');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Network: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);

    return blockchainListener;
  } catch (error) {
    console.error('❌ Failed to initialize integrations:', error.message);
    console.warn('⚠️  Continuing without blockchain integration');
    return null;
  }
}

module.exports = { initializeAllIntegrations };
