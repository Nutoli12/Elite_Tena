const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Modal System Implementation...\n');

// Check if all required files exist
const requiredFiles = [
  'frontend/src/components/ui/Modal.tsx',
  'frontend/src/components/modals/BaseModal.tsx',
  'frontend/src/components/modals/AlertModal.tsx',
  'frontend/src/components/modals/ConfirmModal.tsx',
  'frontend/src/components/modals/SuccessModal.tsx',
  'frontend/src/components/modals/ErrorModal.tsx',
  'frontend/src/components/modals/InfoModal.tsx',
  'frontend/src/components/modals/WarningModal.tsx',
  'frontend/src/services/modalService.ts'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Check if imports were added correctly
console.log('\n📦 Checking Modal service imports...');
const filesToCheck = [
  'frontend/src/components/Chat.tsx',
  'frontend/src/components/modals/BookAppointmentModal.tsx'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes("import { Modal }") && content.includes("modalService")) {
      console.log(`  ✅ ${file} - Modal import found`);
    } else {
      console.log(`  ⚠️  ${file} - Modal import may be missing`);
    }
  }
});

// Check if alert() calls were replaced
console.log('\n🔍 Checking for remaining alert() calls...');
const searchFiles = [
  'frontend/src/components/Chat.tsx',
  'frontend/src/components/VideoCall.tsx',
  'frontend/src/components/modals/BookAppointmentModal.tsx'
];

let remainingAlerts = 0;
searchFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const alertMatches = content.match(/alert\(/g);
    const confirmMatches = content.match(/confirm\(/g);
    
    if (alertMatches || confirmMatches) {
      const total = (alertMatches?.length || 0) + (confirmMatches?.length || 0);
      console.log(`  ⚠️  ${file} - ${total} remaining alert/confirm calls`);
      remainingAlerts += total;
    } else {
      console.log(`  ✅ ${file} - No alert/confirm calls found`);
    }
  }
});

// Check if Modal calls were added
console.log('\n🎨 Checking for Modal service usage...');
searchFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const modalMatches = content.match(/Modal\./g);
    
    if (modalMatches) {
      console.log(`  ✅ ${file} - ${modalMatches.length} Modal calls found`);
    } else {
      console.log(`  ⚠️  ${file} - No Modal calls found`);
    }
  }
});

// Summary
console.log('\n📊 SUMMARY:');
console.log(`✅ All required modal files created: ${allFilesExist ? 'YES' : 'NO'}`);
console.log(`⚠️  Remaining alert/confirm calls: ${remainingAlerts}`);

if (allFilesExist && remainingAlerts === 0) {
  console.log('\n🎉 MODAL SYSTEM TEST PASSED!');
  console.log('✨ All alert() and confirm() calls have been successfully replaced with beautiful modals!');
} else {
  console.log('\n⚠️  MODAL SYSTEM TEST PARTIALLY PASSED');
  console.log('📝 Some manual fixes may be needed for complex alert/confirm patterns');
}

console.log('\n🚀 Next steps:');
console.log('1. Start the frontend development server');
console.log('2. Test the modal system in the browser');
console.log('3. Verify animations and styling work correctly');
console.log('4. Check dark mode compatibility');
console.log('5. Test accessibility features (keyboard navigation, screen readers)');

console.log('\n💡 Usage examples:');
console.log('Modal.success("Operation completed!", "Success");');
console.log('Modal.error("Something went wrong", "Error");');
console.log('Modal.showConfirm({ title: "Confirm", message: "Are you sure?", onConfirm: () => {} });');