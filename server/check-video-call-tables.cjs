#!/usr/bin/env node

/**
 * 🔍 CHECK VIDEO CALL TABLES
 * Check what video call related tables exist
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkVideoCallTables() {
  console.log('🔍 CHECKING VIDEO CALL TABLES\n');

  try {
    // Connect to database
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check for video call related tables
    const tables = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%video%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('📋 Video-related tables found:');
    if (tables.length === 0) {
      console.log('   ❌ No video-related tables found');
    } else {
      tables.forEach(table => {
        console.log(`   📄 ${table.tablename}`);
      });
    }

    // Check for call-related tables
    const callTables = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%call%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('\n📋 Call-related tables found:');
    if (callTables.length === 0) {
      console.log('   ❌ No call-related tables found');
    } else {
      callTables.forEach(table => {
        console.log(`   📄 ${table.tablename}`);
      });
    }

    // List all tables
    const allTables = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('\n📋 All tables in database:');
    allTables.forEach(table => {
      console.log(`   📄 ${table.tablename}`);
    });

    await sequelize.close();

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkVideoCallTables();