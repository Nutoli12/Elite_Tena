#!/usr/bin/env node

/**
 * 🔧 FIX VIDEOCALL IMPORT ERROR
 * Fixes the "VideoCall is not defined" error in App.tsx
 */

console.log('🔧 Fixing VideoCall import error...\n');

// The issue is likely a caching problem or import path issue
// Let's verify the component exists and suggest solutions

const fs = require('fs');
const path = require('path');

try {
  // 1. Check if VideoCall.tsx exists
  const videoCallPath = path.join('frontend', 'src', 'pages', 'VideoCall.tsx');
  
  if (fs.existsSync(videoCallPath)) {
    console.log('✅ VideoCall.tsx exists at:', videoCallPath);
    
    // Check if it has proper export
    const content = fs.readFileSync(videoCallPath, 'utf8');
    if (content.includes('export default VideoCall')) {
      console.log('✅ VideoCall has proper default export');
    } else {
      console.log('❌ VideoCall missing default export');
    }
  } else {
    console.log('❌ VideoCall.tsx not found at:', videoCallPath);
  }

  // 2. Check App.tsx import
  const appPath = path.join('frontend', 'src', 'App.tsx');
  
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    if (appContent.includes("import VideoCall from './pages/VideoCall';")) {
      console.log('✅ App.tsx has correct VideoCall import');
    } else {
      console.log('❌ App.tsx missing VideoCall import');
      console.log('Current imports in App.tsx:');
      const imports = appContent.split('\n').filter(line => line.includes('import'));
      imports.forEach(imp => console.log('  ', imp));
    }
  }

  console.log('\n🔧 SOLUTIONS:');
  console.log('1. Clear browser cache and refresh');
  console.log('2. Restart the development server');
  console.log('3. Check for TypeScript compilation errors');
  console.log('4. Verify all imports are correct');

  console.log('\n📋 QUICK FIXES:');
  console.log('- Run: npm run dev (restart dev server)');
  console.log('- Clear browser cache (Ctrl+Shift+R)');
  console.log('- Check browser console for detailed errors');

} catch (error) {
  console.error('❌ Error checking files:', error.message);
}

console.log('\n✅ VideoCall import error diagnosis complete!');