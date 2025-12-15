// Test script to diagnose Vercel deployment issues
const https = require('https');

const testUrl = 'https://elite-tena-healthcare.netlify.app';

console.log('🔍 Testing Vercel deployment...');
console.log('URL:', testUrl);

https.get(testUrl, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response length:', data.length);
    console.log('First 500 characters:');
    console.log(data.substring(0, 500));
    
    // Check for common issues
    if (data.includes('<!DOCTYPE html>')) {
      console.log('✅ HTML document found');
    } else {
      console.log('❌ No HTML document found');
    }
    
    if (data.includes('<div id="root">')) {
      console.log('✅ React root div found');
    } else {
      console.log('❌ React root div missing');
    }
    
    if (data.includes('script')) {
      console.log('✅ JavaScript files found');
    } else {
      console.log('❌ No JavaScript files found');
    }
  });
}).on('error', (err) => {
  console.log('❌ Error:', err.message);
});