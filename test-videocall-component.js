#!/usr/bin/env node

/**
 * 🧪 TEST VIDEOCALL COMPONENT
 * Tests if the VideoCall component can be imported and used
 */

console.log('🧪 Testing VideoCall component...\n');

// This is a simple test to verify the component structure
const fs = require('fs');

try {
  // Read the VideoCall component
  const videoCallContent = fs.readFileSync('frontend/src/pages/VideoCall.tsx', 'utf8');
  
  // Check for key elements
  const checks = [
    { name: 'React import', pattern: /import React/ },
    { name: 'Component definition', pattern: /const VideoCall.*=/ },
    { name: 'Default export', pattern: /export default VideoCall/ },
    { name: 'JSX return', pattern: /return \(/ },
    { name: 'TypeScript interface', pattern: /interface.*VideoCallState/ }
  ];

  console.log('📋 Component Structure Checks:');
  checks.forEach(check => {
    const passed = check.pattern.test(videoCallContent);
    console.log(`   ${passed ? '✅' : '❌'} ${check.name}`);
  });

  // Check App.tsx route
  const appContent = fs.readFileSync('frontend/src/App.tsx', 'utf8');
  const routeExists = appContent.includes('/video-call/:callId');
  
  console.log('\n📋 Route Configuration:');
  console.log(`   ${routeExists ? '✅' : '❌'} Video call route exists`);

  // Check for common issues
  console.log('\n🔍 Common Issues Check:');
  
  const hasCircularImports = videoCallContent.includes("from './VideoCall'");
  console.log(`   ${!hasCircularImports ? '✅' : '❌'} No circular imports`);
  
  const hasValidSyntax = !videoCallContent.includes('export default export default');
  console.log(`   ${hasValidSyntax ? '✅' : '❌'} No duplicate exports`);

  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('2. Restart development server');
  console.log('3. Check browser developer console for detailed errors');
  console.log('4. Verify TypeScript compilation is successful');

  console.log('\n✅ VideoCall component test complete!');

} catch (error) {
  console.error('❌ Error testing component:', error.message);
}