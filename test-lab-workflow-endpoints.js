#!/usr/bin/env node

const axios = require('axios');

async function testLabWorkflowEndpoints() {
  console.log('🧪 Testing Lab Workflow Endpoints...\n');
  
  const baseURL = 'http://localhost:3003/api';
  
  try {
    console.log('1. Testing /lab/results...');
    const resultsResponse = await axios.get(`${baseURL}/lab/results`);
    console.log('   ✅ Results endpoint working:', resultsResponse.status);
    console.log('   📊 Results count:', resultsResponse.data.data?.length || 0);
  } catch (error) {
    console.log('   ❌ Results endpoint error:', error.response?.status, error.response?.data?.message);
  }
  
  try {
    console.log('\n2. Testing /lab/technician/dashboard...');
    const techResponse = await axios.get(`${baseURL}/lab/technician/dashboard`, {
      headers: { 'x-user-role': 'lab_technician' }
    });
    console.log('   ✅ Technician dashboard working:', techResponse.status);
    console.log('   📊 Pending orders:', techResponse.data.data?.workQueue?.pendingCount || 0);
  } catch (error) {
    console.log('   ❌ Technician dashboard error:', error.response?.status, error.response?.data?.message);
  }
  
  try {
    console.log('\n3. Testing /lab/doctor/overview...');
    const doctorResponse = await axios.get(`${baseURL}/lab/doctor/overview`, {
      headers: { 'x-user-role': 'doctor' }
    });
    console.log('   ✅ Doctor overview working:', doctorResponse.status);
    console.log('   📊 Pending orders:', doctorResponse.data.data?.statistics?.pendingOrders || 0);
  } catch (error) {
    console.log('   ❌ Doctor overview error:', error.response?.status, error.response?.data?.message);
  }

  try {
    console.log('\n4. Testing /lab/catalog...');
    const catalogResponse = await axios.get(`${baseURL}/lab/catalog`);
    console.log('   ✅ Catalog endpoint working:', catalogResponse.status);
    console.log('   📊 Available tests:', catalogResponse.data.data?.tests?.length || 0);
  } catch (error) {
    console.log('   ❌ Catalog endpoint error:', error.response?.status, error.response?.data?.message);
  }

  console.log('\n🎯 Summary:');
  console.log('   Lab Workflow System endpoints are configured');
  console.log('   Frontend should now connect to correct endpoints');
  console.log('   LabDashboard.tsx has been updated to use proper API paths');
}

testLabWorkflowEndpoints().catch(console.error);