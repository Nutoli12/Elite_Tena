require('dotenv').config();
const { Sequelize } = require('sequelize');

async function fixDoctorServiceAcceptance() {
  console.log('🔧 Fixing Doctor Service Acceptance');
  console.log('='.repeat(40));

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    // Update the doctor to accept all services
    const [results] = await sequelize.query(`
      UPDATE doctor_service_pricing 
      SET 
        accepts_in_person = true,
        accepts_video_calls = true,
        accepts_chat = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE doctor_wallet = '0x0987654321098765432109876543210987654321'
    `);

    console.log('✅ Updated doctor service acceptance');

    // Verify the update
    const [verification] = await sequelize.query(`
      SELECT doctor_wallet, accepts_in_person, accepts_video_calls, accepts_chat 
      FROM doctor_service_pricing 
      WHERE doctor_wallet = '0x0987654321098765432109876543210987654321'
    `);

    console.log('📋 Verification:', verification[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixDoctorServiceAcceptance();