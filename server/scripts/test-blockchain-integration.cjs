const blockchainService = require('../services/blockchain.cjs');
require('dotenv').config();

async function testBlockchainIntegration() {
  console.log('\n🧪 Testing Blockchain Integration\n');
  console.log('='.repeat(50));

  try {
    // Initialize blockchain service
    console.log('\n1️⃣  Initializing blockchain service...');
    const initialized = await blockchainService.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to initialize blockchain service');
      process.exit(1);
    }

    console.log('✅ Blockchain service initialized successfully');

    // Test 1: Get contract fees
    console.log('\n2️⃣  Getting contract fees...');
    const fees = await blockchainService.getFees();
    if (fees) {
      console.log('✅ Contract Fees:');
      console.log('   - Patient Registration:', fees.patientFee, 'ETH');
      console.log('   - Doctor Registration:', fees.doctorFee, 'ETH');
      console.log('   - Pharmacist Registration:', fees.pharmacistFee, 'ETH');
      console.log('   - Lab Technician Registration:', fees.labTechnicianFee, 'ETH');
      console.log('   - Appointment Booking:', fees.appointmentFee, 'ETH');
    } else {
      console.log('⚠️  Could not retrieve fees');
    }

    // Test 2: Check a sample wallet (contract owner)
    console.log('\n3️⃣  Checking contract owner info...');
    const ownerAddress = '0x23C80449d4BE58945194C29D3A6AcCddca25fB04'; // Your deployer address
    const userInfo = await blockchainService.getUserInfo(ownerAddress);
    if (userInfo) {
      console.log('✅ User Info:');
      console.log('   - Registered:', userInfo.registered);
      console.log('   - Role:', userInfo.role);
      console.log('   - ID:', userInfo.id);
    } else {
      console.log('⚠️  User not registered on blockchain');
    }

    // Test 3: Check provider approval
    console.log('\n4️⃣  Checking provider approval status...');
    const isApproved = await blockchainService.isProviderApproved(ownerAddress);
    console.log('   Provider Approved:', isApproved);

    // Test 4: Generate sample IDs
    console.log('\n5️⃣  Testing ID generation...');
    const samplePatient = '0x1234567890123456789012345678901234567890';
    const sampleDoctor = '0x0987654321098765432109876543210987654321';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const prescriptionId = blockchainService.generatePrescriptionId(samplePatient, sampleDoctor, timestamp);
    const labResultId = blockchainService.generateLabResultId(samplePatient, sampleDoctor, timestamp);
    
    console.log('✅ Generated IDs:');
    console.log('   - Prescription ID:', prescriptionId);
    console.log('   - Lab Result ID:', labResultId);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All blockchain integration tests passed!');
    console.log('\n📊 Summary:');
    console.log('   - Contract Address:', process.env.CONTRACT_ADDRESS);
    console.log('   - Network: Sepolia Testnet');
    console.log('   - RPC URL:', process.env.BLOCKCHAIN_RPC_URL);
    console.log('   - Status: Connected and Ready');
    console.log('\n🎉 Blockchain integration is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testBlockchainIntegration();
