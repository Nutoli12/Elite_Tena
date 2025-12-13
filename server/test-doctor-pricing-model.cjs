require('dotenv').config();
const { Sequelize } = require('sequelize');

// Import the model definition
const DoctorServicePricingModel = require('./src/models/DoctorServicePricing.js').default;

async function testDoctorPricingModel() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    // Initialize the model
    const DoctorServicePricing = DoctorServicePricingModel(sequelize);
    
    // Get the test doctor's pricing
    const pricing = await DoctorServicePricing.findOne({
      where: { doctor_wallet: '0x0987654321098765432109876543210987654321' }
    });

    if (!pricing) {
      console.log('❌ No pricing found for test doctor');
      return;
    }

    console.log('📋 Raw pricing data:', {
      acceptsInPerson: pricing.acceptsInPerson,
      acceptsVideoCalls: pricing.acceptsVideoCalls,
      acceptsChat: pricing.acceptsChat,
      inPersonFee: pricing.inPersonFee,
      videoCallFee: pricing.videoCallFee,
      chatFee: pricing.chatFee
    });

    // Test the instance methods
    console.log('\n🧪 Testing instance methods:');
    console.log('acceptsService("inPerson"):', pricing.acceptsService('inPerson'));
    console.log('acceptsService("in_person"):', pricing.acceptsService('in_person'));
    console.log('acceptsService("videoCall"):', pricing.acceptsService('videoCall'));
    console.log('acceptsService("chat"):', pricing.acceptsService('chat'));

    console.log('\n💰 Testing fee methods:');
    console.log('getFeeForService("inPerson"):', pricing.getFeeForService('inPerson'));
    console.log('getFeeForService("videoCall"):', pricing.getFeeForService('videoCall'));
    console.log('getFeeForService("chat"):', pricing.getFeeForService('chat'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testDoctorPricingModel();