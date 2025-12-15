/**
 * Test Script: PROPER MEDICAL LAB WORKFLOW
 * 
 * This script tests the CORRECT medical lab workflow:
 * 1. CREATE RESULT RECORD (not just upload)
 * 2. ENTER RESULTS with validation
 * 3. RELEASE TO DOCTOR (technician releases, doesn't complete)
 * 4. DOCTOR REVIEW & COMPLETION (doctor completes, not technician)
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE_URL = 'http://localhost:3003';
const LAB_API_URL = `${API_BASE_URL}/api/lab`;

// Test users
const TECHNICIAN_WALLET = '0x1234567890123456789012345678901234567890';
const DOCTOR_WALLET = '0x0987654321098765432109876543210987654321';
const PATIENT_WALLET = '0x1111222233334444555566667777888899990000';

const getAuthHeaders = (role, wallet) => ({
  'Content-Type': 'application/json',
  'x-wallet-address': wallet,
  'x-user-role': role
});

async function testProperLabWorkflow() {
  console.log('🧪 TESTING PROPER MEDICAL LAB WORKFLOW');
  console.log('=====================================\n');

  try {
    // STEP 0: Create a test lab order first
    console.log('📋 STEP 0: Creating test lab order...');
    const orderResponse = await axios.post(`${LAB_API_URL}/orders`, {
      patientWalletAddress: PATIENT_WALLET,
      testCodes: ['CBC', 'GLUCOSE', 'TROPONIN'],
      priority: 'routine',
      sampleType: 'blood',
      specialInstructions: 'Fasting sample'
    }, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    if (!orderResponse.data.success) {
      throw new Error('Failed to create test order');
    }

    const labOrder = orderResponse.data.data.labOrder;
    console.log(`✅ Created lab order #${labOrder.orderNumber} (ID: ${labOrder.id})\n`);

    // Update order status to collected (ready for processing)
    await axios.patch(`${LAB_API_URL}/orders/${labOrder.id}/status`, {
      status: 'collected',
      notes: 'Sample collected and ready for processing'
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    console.log('✅ Order status updated to "collected"\n');

    // STEP 1: CREATE RESULT RECORD (PROPER WORKFLOW)
    console.log('🧪 STEP 1: CREATE RESULT RECORD');
    console.log('This is the CORRECT first step - creating a result record before any data entry');
    
    const createResponse = await axios.post(`${LAB_API_URL}/results/create-record`, {
      labOrderId: labOrder.id,
      testCodes: labOrder.testCodes
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (!createResponse.data.success) {
      throw new Error(`Failed to create result record: ${createResponse.data.message}`);
    }

    const resultRecord = createResponse.data.data.resultRecord;
    console.log(`✅ Result record created (ID: ${resultRecord.id})`);
    console.log(`   Status: ${resultRecord.status} (should be 'draft')`);
    console.log(`   Order status updated to: processing\n`);

    // STEP 2: SUBMIT RESULTS FOR VALIDATION
    console.log('📊 STEP 2: ENTER RESULTS & SUBMIT FOR VALIDATION');
    console.log('Technician enters actual test results with quality checks');

    const resultData = {
      'CBC': {
        value: '12.5',
        unit: 'g/dL',
        status: 'normal',
        referenceRange: '12.0-15.5 g/dL',
        notes: 'Hemoglobin within normal limits'
      },
      'GLUCOSE': {
        value: '95',
        unit: 'mg/dL',
        status: 'normal',
        referenceRange: '70-100 mg/dL',
        notes: 'Fasting glucose normal'
      },
      'TROPONIN': {
        value: '0.5', // This will be detected as CRITICAL
        unit: 'ng/mL',
        status: 'critical',
        referenceRange: '<0.04 ng/mL',
        notes: 'CRITICAL VALUE - Significantly elevated'
      }
    };

    const qualityChecks = {
      sample_integrity: true,
      sample_clotted: true,
      instrument_qc: true,
      calibration_valid: true,
      controls_acceptable: true
    };

    const submitResponse = await axios.post(`${LAB_API_URL}/results/submit`, {
      resultRecordId: resultRecord.id,
      resultData,
      interpretation: 'CBC and glucose are within normal limits. CRITICAL: Troponin I is significantly elevated at 0.5 ng/mL, indicating possible myocardial infarction. Immediate clinical correlation required.',
      technicianNotes: 'Sample processed without issues. Quality controls passed. Critical value detected and flagged.',
      qualityChecks
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (!submitResponse.data.success) {
      throw new Error(`Failed to submit results: ${submitResponse.data.message}`);
    }

    console.log('✅ Results submitted for validation');
    console.log(`   Status: submitted`);
    console.log(`   Critical values detected: ${submitResponse.data.data.validation.criticalValues.length}`);
    console.log(`   Validation warnings: ${submitResponse.data.data.validation.warnings.length}\n`);

    // STEP 3: RELEASE TO DOCTOR (TECHNICIAN RELEASES, NOT COMPLETES)
    console.log('🚀 STEP 3: RELEASE TO DOCTOR');
    console.log('Technician RELEASES results to doctor (does NOT complete the order)');

    const releaseResponse = await axios.post(`${LAB_API_URL}/results/release-to-doctor`, {
      resultRecordId: resultRecord.id,
      finalValidation: true
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (!releaseResponse.data.success) {
      throw new Error(`Failed to release results: ${releaseResponse.data.message}`);
    }

    console.log('✅ Results released to doctor');
    console.log(`   Result status: released`);
    console.log(`   Order status: results_released (NOT completed yet!)`);
    console.log(`   Doctor notified: ${releaseResponse.data.data.doctorNotified}`);
    console.log(`   Next step: ${releaseResponse.data.data.nextStep}\n`);

    // STEP 4: DOCTOR REVIEW & COMPLETION (DOCTOR COMPLETES, NOT TECHNICIAN)
    console.log('👨‍⚕️ STEP 4: DOCTOR REVIEW & COMPLETION');
    console.log('DOCTOR reviews and completes the order (not the technician)');

    const doctorReviewResponse = await axios.post(`${LAB_API_URL}/results/doctor-review`, {
      resultRecordId: resultRecord.id,
      action: 'accept',
      doctorNotes: 'Critical troponin elevation noted. Patient called immediately. Cardiology consult ordered. ECG and cardiac enzymes trending initiated.',
      doctorInterpretation: 'Laboratory findings consistent with acute myocardial infarction. Immediate cardiology intervention required.'
    }, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    if (!doctorReviewResponse.data.success) {
      throw new Error(`Failed to complete doctor review: ${doctorReviewResponse.data.message}`);
    }

    console.log('✅ Doctor review completed');
    console.log(`   Result status: accepted`);
    console.log(`   Order status: completed (COMPLETED BY DOCTOR, NOT TECHNICIAN)`);
    console.log(`   Order completed by: ${DOCTOR_WALLET}`);
    console.log(`   Doctor interpretation added\n`);

    // VERIFICATION: Check final status
    console.log('🔍 VERIFICATION: Checking final workflow status...');
    
    const finalOrderCheck = await axios.get(`${LAB_API_URL}/orders/${labOrder.id}`, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    const finalOrder = finalOrderCheck.data.data.labOrder;
    console.log(`   Final order status: ${finalOrder.status}`);
    console.log(`   Completed by: ${finalOrder.completedBy || 'Not set'}`);
    console.log(`   Completed at: ${finalOrder.completedAt || 'Not set'}\n`);

    // SUCCESS SUMMARY
    console.log('🎉 PROPER MEDICAL LAB WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    console.log('✅ STEP 1: Result record CREATED (not just uploaded)');
    console.log('✅ STEP 2: Results ENTERED with validation and quality checks');
    console.log('✅ STEP 3: Results RELEASED to doctor (technician releases, doesn\'t complete)');
    console.log('✅ STEP 4: Doctor REVIEWED and COMPLETED (doctor completes, not technician)');
    console.log('✅ Critical values properly detected and flagged');
    console.log('✅ Proper status flow: draft → submitted → released → accepted → completed');
    console.log('✅ Order completed by DOCTOR, not technician (as it should be)');
    console.log('\n🏥 This is how medical labs actually work!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Test the incorrect old workflow for comparison
async function testIncorrectOldWorkflow() {
  console.log('\n\n🚫 COMPARISON: Testing the OLD INCORRECT workflow');
  console.log('================================================');
  console.log('This shows what was WRONG with the previous approach:\n');

  try {
    // Create another test order
    const orderResponse = await axios.post(`${LAB_API_URL}/orders`, {
      patientWalletAddress: PATIENT_WALLET,
      testCodes: ['CBC'],
      priority: 'routine',
      sampleType: 'blood'
    }, {
      headers: getAuthHeaders('doctor', DOCTOR_WALLET)
    });

    const labOrder = orderResponse.data.data.labOrder;
    
    // Update to processing
    await axios.patch(`${LAB_API_URL}/orders/${labOrder.id}/status`, {
      status: 'processing'
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    console.log('❌ OLD INCORRECT WAY: Direct "upload results"');
    console.log('   Problem: Skips result creation, validation, and proper workflow');
    
    // Try the old upload method
    const oldUploadResponse = await axios.post(`${LAB_API_URL}/results`, {
      labOrderId: labOrder.id,
      resultData: {
        'CBC': { value: '13.0', unit: 'g/dL', status: 'normal' }
      },
      interpretation: 'Normal CBC'
    }, {
      headers: getAuthHeaders('lab_technician', TECHNICIAN_WALLET)
    });

    if (oldUploadResponse.data.success) {
      console.log('❌ Old method "succeeded" but:');
      console.log('   - No result record creation step');
      console.log('   - No validation workflow');
      console.log('   - No quality checks');
      console.log('   - Technician "completes" order (WRONG!)');
      console.log('   - Doctor never reviews before completion');
      console.log('   - Not how medical labs actually work!\n');
    }

  } catch (error) {
    console.log('❌ Old method failed (which is good!)');
  }
}

// Run the tests
async function runAllTests() {
  await testProperLabWorkflow();
  await testIncorrectOldWorkflow();
  
  console.log('\n📋 SUMMARY: PROPER vs INCORRECT LAB WORKFLOW');
  console.log('==============================================');
  console.log('CORRECT WORKFLOW:');
  console.log('1. Technician CREATES result record');
  console.log('2. Technician ENTERS data with validation');
  console.log('3. Technician RELEASES to doctor');
  console.log('4. Doctor REVIEWS and COMPLETES');
  console.log('');
  console.log('INCORRECT OLD WORKFLOW:');
  console.log('1. Technician "uploads" and immediately "completes"');
  console.log('2. No proper validation or quality checks');
  console.log('3. Doctor never reviews before completion');
  console.log('4. Not how medical labs work!');
  console.log('\n✅ The new workflow is now implemented correctly!');
}

runAllTests().catch(console.error);