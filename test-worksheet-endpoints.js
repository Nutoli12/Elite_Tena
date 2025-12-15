#!/usr/bin/env node

/**
 * Test Lab Worksheet Endpoints
 * Tests the newly created worksheet API endpoints
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3003/api';

// Test headers (simulating a lab technician)
const testHeaders = {
  'x-wallet-address': '0x1234567890123456789012345678901234567890',
  'x-user-role': 'lab_technician',
  'Content-Type': 'application/json'
};

async function testWorksheetEndpoints() {
  try {
    console.log('🧪 Testing Lab Worksheet Endpoints...');

    // Test 1: Get worksheets (should work now)
    console.log('\n📋 Test 1: GET /api/lab-workflow/worksheets');
    try {
      const response = await axios.get(`${API_BASE}/lab/worksheets`, {
        headers: testHeaders
      });
      console.log('✅ GET worksheets successful');
      console.log(`   Found ${response.data.data?.worksheets?.length || 0} worksheets`);
    } catch (error) {
      console.log('❌ GET worksheets failed:', error.response?.status, error.response?.data?.message || error.message);
    }

    // Test 2: Get lab orders (to see what orders exist)
    console.log('\n📋 Test 2: GET /api/lab-workflow/orders');
    try {
      const response = await axios.get(`${API_BASE}/lab/orders`, {
        headers: testHeaders
      });
      console.log('✅ GET orders successful');
      console.log(`   Found ${response.data.data?.orders?.length || 0} orders`);
      
      if (response.data.data?.orders?.length > 0) {
        const firstOrder = response.data.data.orders[0];
        console.log(`   First order ID: ${firstOrder.id}, Status: ${firstOrder.status}`);
        
        // Test 3: Create worksheet for first order
        console.log('\n📋 Test 3: POST /api/lab-workflow/worksheets (Create worksheet)');
        try {
          const worksheetData = {
            labOrderId: firstOrder.id,
            accessionNumber: `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-TEST`,
            technicianId: '0x1234567890123456789012345678901234567890',
            sampleCollectionStatus: 'pending',
            processingStatus: 'queued'
          };
          
          const createResponse = await axios.post(`${API_BASE}/lab/worksheets`, worksheetData, {
            headers: testHeaders
          });
          console.log('✅ Create worksheet successful');
          console.log(`   Created worksheet: ${createResponse.data.data?.worksheet?.accessionNumber}`);
          
          const worksheetId = createResponse.data.data?.worksheet?.id;
          
          if (worksheetId) {
            // Test 4: Get specific worksheet
            console.log('\n📋 Test 4: GET /api/lab-workflow/worksheets/:id');
            try {
              const getResponse = await axios.get(`${API_BASE}/lab/worksheets/${worksheetId}`, {
                headers: testHeaders
              });
              console.log('✅ GET specific worksheet successful');
              console.log(`   Worksheet: ${getResponse.data.data?.worksheet?.accessionNumber}`);
            } catch (error) {
              console.log('❌ GET specific worksheet failed:', error.response?.status, error.response?.data?.message || error.message);
            }
            
            // Test 5: Record sample collection
            console.log('\n📋 Test 5: POST /api/lab-workflow/worksheets/:id/sample-collection');
            try {
              const sampleData = {
                worksheetId,
                sampleType: 'blood',
                collectionMethod: 'venipuncture',
                sampleVolume: 5.0,
                containerType: 'EDTA tube',
                storageLocation: 'Refrigerator A1',
                collectedBy: 'Lab Tech 1',
                collectionDateTime: new Date().toISOString(),
                barcode: `SAMPLE-${Date.now()}`,
                specialHandling: 'Keep refrigerated'
              };
              
              const sampleResponse = await axios.post(`${API_BASE}/lab/worksheets/${worksheetId}/sample-collection`, sampleData, {
                headers: testHeaders
              });
              console.log('✅ Record sample collection successful');
            } catch (error) {
              console.log('❌ Record sample collection failed:', error.response?.status, error.response?.data?.message || error.message);
            }
            
            // Test 6: Start processing
            console.log('\n📋 Test 6: POST /api/lab-workflow/worksheets/:id/start-processing');
            try {
              const processingData = {
                worksheetId,
                instrumentUsed: 'Analyzer-001',
                operatorId: '0x1234567890123456789012345678901234567890',
                startTime: new Date().toISOString()
              };
              
              const processingResponse = await axios.post(`${API_BASE}/lab/worksheets/${worksheetId}/start-processing`, processingData, {
                headers: testHeaders
              });
              console.log('✅ Start processing successful');
            } catch (error) {
              console.log('❌ Start processing failed:', error.response?.status, error.response?.data?.message || error.message);
            }
          }
          
        } catch (error) {
          if (error.response?.status === 409) {
            console.log('⚠️  Worksheet already exists for this order');
          } else {
            console.log('❌ Create worksheet failed:', error.response?.status, error.response?.data?.message || error.message);
          }
        }
      }
    } catch (error) {
      console.log('❌ GET orders failed:', error.response?.status, error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Worksheet endpoint testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testWorksheetEndpoints();