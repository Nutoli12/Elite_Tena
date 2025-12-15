#!/usr/bin/env node

/**
 * 🧹 CLEANUP ALL VIDEO CALLS
 * Remove all video calls from database for fresh testing
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './server/.env' });

async function cleanupAllVideoCalls() {
  console.log('🧹 CLEANUP ALL VIDEO CALLS\n');

  try {
    // Connect to database
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Delete all video calls
    const result = await sequelize.query(
      'DELETE FROM "VideoCall" WHERE 1=1',
      { type: Sequelize.QueryTypes.DELETE }
    );

    console.log(`✅ Deleted all video calls from database`);
    console.log('🎯 Database is now clean for fresh testing');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupAllVideoCalls();