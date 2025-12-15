#!/usr/bin/env node

/**
 * 🧹 CLEANUP TEST CALLS
 * Clean up any existing test video calls
 */

const { Sequelize } = require('sequelize');

async function cleanupTestCalls() {
  console.log('🧹 Cleaning up test video calls...\n');

  try {
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/elitetena', {
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Delete all video calls for test users
    const [result] = await sequelize.query(`
      DELETE FROM video_calls 
      WHERE "initiatorWallet" IN ('0x1765645107928ugnsg', '0x1765645107820qldzw')
         OR "receiverWallet" IN ('0x1765645107928ugnsg', '0x1765645107820qldzw')
    `);

    console.log(`✅ Cleaned up ${result.rowCount || 0} test video calls`);

    await sequelize.close();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupTestCalls();