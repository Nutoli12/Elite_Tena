const fs = require('fs');
const path = require('path');

// Files to process (from our search results)
const filesToProcess = [
  'frontend/src/components/Chat.tsx',
  'frontend/src/components/VideoCall.tsx',
  'frontend/src/components/appointments/BookingWizard.tsx',
  'frontend/src/components/doctor/PatientQueue.tsx',
  'frontend/src/components/doctor/PaymentReceiptsReview.tsx',
  'frontend/src/components/video/IncomingCallModal.tsx',
  'frontend/src/components/video/VideoConsultationDemo.tsx',
  'frontend/src/components/modals/BookAppointmentModal.tsx',
  'frontend/src/components/modals/CreatePrescriptionModal.tsx',
  'frontend/src/components/modals/OrderLabTestModal.tsx',
  'frontend/src/components/modals/PaymentModal.tsx',
  'frontend/src/components/modals/RequestAccessModal.tsx',
  'frontend/src/components/modals/QuickApproveModal.tsx',
  'frontend/src/components/modals/RevokeAccessModal.tsx',
  'frontend/src/components/modals/UploadReceiptModal.tsx',
  'frontend/src/components/modals/UploadLabResultsModal.tsx'
];

// Replacement patterns
const replacements = [
  // Simple alert() calls
  {
    pattern: /alert\(['"`]([^'"`]+)['"`]\);?/g,
    replacement: (match, message) => {
      return `Modal.error('${message}', 'Alert');`;
    }
  },
  
  // Alert with template literals
  {
    pattern: /alert\(`([^`]+)`\);?/g,
    replacement: (match, message) => {
      return `Modal.error(\`${message}\`, 'Alert');`;
    }
  },
  
  // Alert with variables
  {
    pattern: /alert\(([^)]+)\);?/g,
    replacement: (match, variable) => {
      // Skip if it's already a string literal (handled above)
      if (variable.match(/^['"`]/)) return match;
      return `Modal.error(${variable}, 'Alert');`;
    }
  },
  
  // Simple confirm() calls
  {
    pattern: /if\s*\(\s*confirm\(['"`]([^'"`]+)['"`]\)\s*\)\s*\{([^}]+)\}/g,
    replacement: (match, message, action) => {
      return `Modal.showConfirm({
  title: 'Confirm',
  message: '${message}',
  onConfirm: () => {${action}},
  type: 'info'
});`;
    }
  }
];

function addImportIfNeeded(content, filePath) {
  // Check if Modal import already exists
  if (content.includes("import { Modal }") || content.includes("from '../services/modalService'")) {
    return content;
  }
  
  // Determine the correct import path based on file location
  const depth = filePath.split('/').length - 2; // -2 for 'frontend/src'
  const importPath = '../'.repeat(depth - 1) + 'services/modalService';
  
  // Find the last import statement
  const importRegex = /import[^;]+;/g;
  const imports = content.match(importRegex) || [];
  
  if (imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertIndex) + 
           `\nimport { Modal } from '${importPath}';` + 
           content.slice(insertIndex);
  } else {
    // No imports found, add at the beginning
    return `import { Modal } from '${importPath}';\n` + content;
  }
}

function processFile(filePath) {
  try {
    console.log(`Processing ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Check if file contains alert() or confirm()
    if (!content.includes('alert(') && !content.includes('confirm(')) {
      console.log(`  ✅ No alert() or confirm() calls found`);
      return;
    }
    
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  🔄 Found ${matches.length} matches for pattern`);
        content = content.replace(pattern, replacement);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      // Add Modal import
      content = addImportIfNeeded(content, filePath);
      
      // Write back to file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated successfully`);
    } else {
      console.log(`  ℹ️  No changes needed`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
  }
}

// Process all files
console.log('🚀 Starting alert() and confirm() replacement...\n');

filesToProcess.forEach(processFile);

console.log('\n✨ Replacement complete!');
console.log('\n📝 Manual steps needed:');
console.log('1. Review the changes and adjust any complex alert/confirm logic');
console.log('2. Test the new modal system');
console.log('3. Update any remaining alert() calls that need custom handling');
console.log('4. Consider using specific modal types (success, error, warning) where appropriate');