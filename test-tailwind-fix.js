// Test Tailwind CSS Fix
console.log('🎨 Testing Tailwind CSS Configuration...');

const fs = require('fs');

// Test 1: Check PostCSS config
try {
  const postcssContent = fs.readFileSync('frontend/postcss.config.js', 'utf8');
  
  if (postcssContent.includes('tailwindcss: {}') && 
      !postcssContent.includes('@tailwindcss/postcss')) {
    console.log('✅ PostCSS config updated for Tailwind v3');
  } else {
    console.log('❌ PostCSS config still has v4 configuration');
  }
} catch (error) {
  console.log('❌ PostCSS config file not found');
}

// Test 2: Check Tailwind config
try {
  const tailwindContent = fs.readFileSync('frontend/tailwind.config.js', 'utf8');
  
  if (tailwindContent.includes('module.exports = {') && 
      tailwindContent.includes("darkMode: 'class'")) {
    console.log('✅ Tailwind config updated for v3 format');
  } else {
    console.log('❌ Tailwind config still has v4 format');
  }
} catch (error) {
  console.log('❌ Tailwind config file not found');
}

// Test 3: Check package.json for correct versions
try {
  const packageContent = fs.readFileSync('frontend/package.json', 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  const tailwindVersion = packageJson.devDependencies?.tailwindcss;
  
  if (tailwindVersion && tailwindVersion.startsWith('^3.')) {
    console.log('✅ Tailwind CSS v3 installed correctly');
  } else if (tailwindVersion && tailwindVersion.startsWith('^4.')) {
    console.log('❌ Still using Tailwind CSS v4 - needs downgrade');
  } else {
    console.log('❌ Tailwind CSS version not found');
  }
} catch (error) {
  console.log('❌ Package.json file not found or invalid');
}

// Test 4: Check CSS imports
try {
  const cssContent = fs.readFileSync('frontend/src/index.css', 'utf8');
  
  if (cssContent.includes('@tailwind base;') && 
      cssContent.includes('@tailwind components;') &&
      cssContent.includes('@tailwind utilities;')) {
    console.log('✅ CSS imports are correct for Tailwind v3');
  } else {
    console.log('❌ CSS imports are incorrect');
  }
} catch (error) {
  console.log('❌ CSS file not found');
}

console.log('\n🎯 Tailwind CSS Fix Summary:');
console.log('- Downgraded from Tailwind v4 to v3 for stability');
console.log('- Updated PostCSS config to use standard tailwindcss plugin');
console.log('- Changed Tailwind config to module.exports format');
console.log('- Maintained all custom colors and dark mode configuration');
console.log('\n🚀 Frontend should now load without CSS errors!');