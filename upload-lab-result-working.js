import axios from 'axios';

console.log('🧪 Lab Result Upload - WORKING Example...\n');

const API_BASE = 'http://localhost:3003/api';

async function uploadLabResultWorking() {
  try {
    // 1. Get the first available order
    console.log('1. Getting available lab order...');
    const queueResponse = await axios.get(`${API_BASE}/lab/technician/queue`, {
      headers: {
        'x-user-role': 'lab_technician',
        'x-wallet-address': '0xlabtech123456789012345678901234567890123'
      }
    });

    if (!queueResponse.data.success || queueResponse.data.data.orders.length === 0) {
      console.log('❌ No orders available for results');
      return;
    }

    const order = queueResponse.data.data.orders[0];
    console.log(`✅ Selected Order: ${order.orderNumber}`);
    console.log(`   👤 Patient: ${order.patient?.name}`);
    console.log(`   👨‍⚕️ Doctor: ${order.doctor?.name}`);
    console.log(`   📋 Tests: ${order.testCodes.join(', ')}`);
    console.log(`   🆔 Order ID: ${order.id}\n`);

    // 2. Prepare result data in the correct format
    console.log('2. Preparing lab result data...');
    
    // Create result data object with test codes as keys
    const resultData = {};
    
    for (const testCode of order.testCodes) {
      resultData[testCode] = getTestResults(testCode);
    }

    const uploadData = {
      labOrderId: order.id,
      resultData: resultData, // This is the key field the controller expects
      interpretation: `Lab results for ${order.patient?.name}. All tests completed successfully.`,
      technicianNotes: `Sample processed on ${new Date().toLocaleDateString()}. Quality controls passed. No technical issues encountered.`,
      reportFiles: [],
      rawDataFiles: []
    };

    console.log('📋 Result Data Structure:');
    console.log(`   🔬 Tests: ${Object.keys(resultData).length}`);
    console.log(`   📝 Interpretation: ${uploadData.interpretation.substring(0, 50)}...`);
    console.log(`   📝 Notes: ${uploadData.technicianNotes.substring(0, 50)}...`);
    console.log(`   🆔 Order ID: ${uploadData.labOrderId}\n`);

    // Show sample result data
    console.log('📊 Sample Result Data:');
    Object.entries(resultData).forEach(([testCode, results]) => {
      console.log(`   ${testCode}:`);
      Object.entries(results).forEach(([param, data]) => {
        console.log(`      ${param}: ${data.value} ${data.unit} (${data.status})`);
      });
    });
    console.log('');

    // 3. Upload the result
    console.log('3. Uploading lab result...');
    
    try {
      const uploadResponse = await axios.post(`${API_BASE}/lab/results`, uploadData, {
        headers: {
          'x-user-role': 'lab_technician',
          'x-wallet-address': '0xlabtech123456789012345678901234567890123',
          'Content-Type': 'application/json'
        }
      });

      if (uploadResponse.data.success) {
        console.log('✅ LAB RESULT UPLOADED SUCCESSFULLY!');
        console.log(`   🆔 Result ID: ${uploadResponse.data.data.labResult.id}`);
        console.log(`   📅 Upload Time: ${new Date().toLocaleString()}`);
        console.log(`   🔬 Tests Processed: ${order.testCodes.join(', ')}`);
        console.log(`   ✅ Status: ${uploadResponse.data.data.labResult.verificationStatus || 'Pending'}`);
        
        // Show result summary if available
        if (uploadResponse.data.data.summary) {
          console.log(`   📊 Summary: ${uploadResponse.data.data.summary}`);
        }

        console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
        console.log('   📋 Order processed ✅');
        console.log('   🔬 Results uploaded ✅');
        console.log('   📊 Status automatically updated ✅');
        console.log('   📧 Doctor will be notified ✅');

        // 4. Verify the result was saved
        console.log('\n4. Verifying uploaded result...');
        
        const verifyResponse = await axios.get(`${API_BASE}/lab/results/${uploadResponse.data.data.labResult.id}`, {
          headers: {
            'x-user-role': 'lab_technician',
            'x-wallet-address': '0xlabtech123456789012345678901234567890123'
          }
        });

        if (verifyResponse.data.success) {
          const result = verifyResponse.data.data.labResult;
          console.log('✅ Result verified in database:');
          console.log(`   📋 Order: ${result.labOrder?.orderNumber}`);
          console.log(`   👤 Patient: ${result.labOrder?.patient?.name}`);
          console.log(`   👨‍⚕️ Doctor: ${result.labOrder?.doctor?.name}`);
          console.log(`   🔬 Tests: ${Object.keys(result.resultData).join(', ')}`);
          console.log(`   📅 Result Date: ${new Date(result.resultDate).toLocaleString()}`);
        }

      } else {
        console.log('❌ Failed to upload result:', uploadResponse.data.message);
      }

    } catch (uploadError) {
      console.log('❌ Upload Error:', uploadError.response?.data?.message || uploadError.message);
      
      if (uploadError.response?.data) {
        console.log('📋 Error Details:', JSON.stringify(uploadError.response.data, null, 2));
      }
    }

    console.log('\n🏁 LAB RESULT UPLOAD COMPLETE!');
    console.log('\n📝 CORRECT FORMAT FOR LAB RESULT UPLOAD:');
    console.log('POST /api/lab/results');
    console.log('Headers: x-user-role: lab_technician, x-wallet-address: [wallet]');
    console.log('Body: {');
    console.log('  labOrderId: [number],');
    console.log('  resultData: {');
    console.log('    "CBC": { "WBC": { value: "7.2", unit: "10³/μL", status: "normal" } },');
    console.log('    "GLU": { "Glucose": { value: "95", unit: "mg/dL", status: "normal" } }');
    console.log('  },');
    console.log('  interpretation: "Clinical interpretation",');
    console.log('  technicianNotes: "Processing notes"');
    console.log('}');

  } catch (error) {
    console.error('❌ Error in lab result upload:', error.response?.data || error.message);
  }
}

// Helper function to generate test results
function getTestResults(testCode) {
  const testResults = {
    'CBC': {
      'WBC': { value: '7.2', unit: '10³/μL', referenceRange: '4.0-11.0', status: 'normal' },
      'RBC': { value: '4.5', unit: '10⁶/μL', referenceRange: '4.2-5.4', status: 'normal' },
      'Hemoglobin': { value: '14.2', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
      'Hematocrit': { value: '42.1', unit: '%', referenceRange: '36.0-46.0', status: 'normal' },
      'Platelets': { value: '285', unit: '10³/μL', referenceRange: '150-450', status: 'normal' }
    },
    'GLU': {
      'Glucose': { value: '95', unit: 'mg/dL', referenceRange: '70-100', status: 'normal' }
    },
    'LIPID': {
      'Total Cholesterol': { value: '185', unit: 'mg/dL', referenceRange: '<200', status: 'normal' },
      'HDL Cholesterol': { value: '55', unit: 'mg/dL', referenceRange: '>40', status: 'normal' },
      'LDL Cholesterol': { value: '110', unit: 'mg/dL', referenceRange: '<100', status: 'borderline' },
      'Triglycerides': { value: '120', unit: 'mg/dL', referenceRange: '<150', status: 'normal' }
    },
    'UA': {
      'Color': { value: 'Yellow', unit: '', referenceRange: 'Yellow', status: 'normal' },
      'Clarity': { value: 'Clear', unit: '', referenceRange: 'Clear', status: 'normal' },
      'Specific Gravity': { value: '1.020', unit: '', referenceRange: '1.003-1.030', status: 'normal' },
      'pH': { value: '6.0', unit: '', referenceRange: '5.0-8.0', status: 'normal' },
      'Protein': { value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal' },
      'Glucose': { value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal' }
    },
    'TSH': {
      'TSH': { value: '2.5', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'normal' }
    }
  };
  
  return testResults[testCode] || {
    'Result': { value: 'Normal', unit: '', referenceRange: 'Normal', status: 'normal' }
  };
}

uploadLabResultWorking();