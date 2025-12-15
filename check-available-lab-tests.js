#!/usr/bin/env node

/**
 * Check Available Lab Tests
 * Shows what test codes are available in the lab test catalog
 */

import db from './server/src/models/index.js';

const { LabWorkflowTestCatalog } = db;

async function checkAvailableLabTests() {
  console.log('🧪 Checking Available Lab Tests...\n');

  try {
    const tests = await LabWorkflowTestCatalog.findAll({
      where: { isActive: true },
      attributes: ['testCode', 'testName', 'testCategory', 'turnaroundTimeHours'],
      order: [['testCategory', 'ASC'], ['testName', 'ASC']]
    });

    if (tests.length === 0) {
      console.log('❌ No lab tests found in catalog');
      console.log('   Need to populate the lab test catalog first');
      return;
    }

    console.log(`✅ Found ${tests.length} available lab tests:\n`);

    // Group by category
    const testsByCategory = {};
    tests.forEach(test => {
      const category = test.testCategory || 'General';
      if (!testsByCategory[category]) {
        testsByCategory[category] = [];
      }
      testsByCategory[category].push(test);
    });

    // Display tests by category
    Object.entries(testsByCategory).forEach(([category, categoryTests]) => {
      console.log(`📋 ${category}:`);
      categoryTests.forEach(test => {
        console.log(`   • ${test.testCode} - ${test.testName}`);
        console.log(`     Turnaround: ${test.turnaroundTimeHours}h`);
      });
      console.log('');
    });

    // Show test codes for easy copying
    console.log('🔗 Available Test Codes (for API calls):');
    const testCodes = tests.map(test => test.testCode);
    console.log(`   [${testCodes.map(code => `"${code}"`).join(', ')}]`);

    console.log('\n📝 Example API call:');
    console.log('   testCodes: ["' + testCodes.slice(0, 3).join('", "') + '"]');

  } catch (error) {
    console.error('❌ Error checking lab tests:', error);
  } finally {
    await db.sequelize.close();
  }
}

// Run the check
checkAvailableLabTests().catch(console.error);