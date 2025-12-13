const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript and JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to analyze alert usage in a file
function analyzeAlerts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const alerts = [];
  
  lines.forEach((line, index) => {
    // Look for alert() calls
    const alertMatches = line.match(/alert\s*\(\s*[`"']([^`"']*)[`"']\s*\)/g);
    if (alertMatches) {
      alertMatches.forEach(match => {
        const message = match.match(/alert\s*\(\s*[`"']([^`"']*)[`"']\s*\)/)[1];
        alerts.push({
          line: index + 1,
          original: match,
          message: message,
          type: detectAlertType(message)
        });
      });
    }
    
    // Look for more complex alert calls
    const complexAlertMatches = line.match(/alert\s*\([^)]+\)/g);
    if (complexAlertMatches) {
      complexAlertMatches.forEach(match => {
        if (!alertMatches || !alertMatches.includes(match)) {
          alerts.push({
            line: index + 1,
            original: match,
            message: 'Complex alert call',
            type: 'info',
            complex: true
          });
        }
      });
    }
  });
  
  return alerts;
}

// Function to detect alert type based on message content
function detectAlertType(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('success') || lowerMessage.includes('created') || 
      lowerMessage.includes('saved') || lowerMessage.includes('completed') ||
      lowerMessage.includes('✅')) {
    return 'success';
  }
  
  if (lowerMessage.includes('error') || lowerMessage.includes('failed') || 
      lowerMessage.includes('cannot') || lowerMessage.includes('❌')) {
    return 'error';
  }
  
  if (lowerMessage.includes('warning') || lowerMessage.includes('alert') || 
      lowerMessage.includes('⚠️') || lowerMessage.includes('🚨')) {
    return 'warning';
  }
  
  return 'info';
}

// Function to generate replacement code
function generateReplacement(alert) {
  const { type, message, complex } = alert;
  
  if (complex) {
    return `// TODO: Replace complex alert with notification
    // Original: ${alert.original}
    // Use: show${type.charAt(0).toUpperCase() + type.slice(1)}(message, title)`;
  }
  
  const methodName = `show${type.charAt(0).toUpperCase() + type.slice(1)}`;
  return `${methodName}('${message}')`;
}

// Main analysis function
function analyzeProject() {
  console.log('🔍 Analyzing project for alert() usage...\n');
  
  const frontendDir = path.join(__dirname, 'frontend', 'src');
  const files = findFiles(frontendDir);
  
  let totalAlerts = 0;
  const fileResults = [];
  
  files.forEach(filePath => {
    const alerts = analyzeAlerts(filePath);
    if (alerts.length > 0) {
      totalAlerts += alerts.length;
      fileResults.push({
        file: path.relative(__dirname, filePath),
        alerts: alerts
      });
    }
  });
  
  console.log(`📊 ANALYSIS RESULTS:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files with alerts: ${fileResults.length}`);
  console.log(`   Total alerts found: ${totalAlerts}\n`);
  
  if (fileResults.length > 0) {
    console.log('📋 DETAILED RESULTS:\n');
    
    fileResults.forEach(result => {
      console.log(`📁 ${result.file}`);
      result.alerts.forEach(alert => {
        console.log(`   Line ${alert.line}: ${alert.original}`);
        console.log(`   Type: ${alert.type}`);
        console.log(`   Replacement: ${generateReplacement(alert)}`);
        console.log('');
      });
    });
    
    // Generate replacement instructions
    console.log('🔧 REPLACEMENT INSTRUCTIONS:\n');
    console.log('1. Add useNotification hook to components:');
    console.log('   import { useNotification } from \'../contexts/NotificationContext\';');
    console.log('   const { showSuccess, showError, showWarning, showInfo } = useNotification();\n');
    
    console.log('2. Replace alert() calls with appropriate notification methods:\n');
    
    const typeCount = { success: 0, error: 0, warning: 0, info: 0 };
    fileResults.forEach(result => {
      result.alerts.forEach(alert => {
        typeCount[alert.type]++;
      });
    });
    
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   ${type}: ${count} alerts`);
        console.log(`   Example: showSuccess('Operation completed successfully!')`);
      }
    });
    
    // Generate a replacement script
    console.log('\n📝 GENERATING REPLACEMENT SCRIPT...');
    generateReplacementScript(fileResults);
    
  } else {
    console.log('✅ No alert() calls found in the project!');
  }
}

// Function to generate a replacement script
function generateReplacementScript(fileResults) {
  let script = `// Auto-generated alert replacement script
// Run this to replace alert() calls with notification system

const replacements = [
`;

  fileResults.forEach(result => {
    result.alerts.forEach(alert => {
      if (!alert.complex) {
        script += `  {
    file: '${result.file}',
    line: ${alert.line},
    original: '${alert.original.replace(/'/g, "\\'")}',
    replacement: '${generateReplacement(alert).replace(/'/g, "\\'")}'
  },
`;
      }
    });
  });

  script += `];

// Function to apply replacements
function applyReplacements() {
  const fs = require('fs');
  
  replacements.forEach(replacement => {
    try {
      const content = fs.readFileSync(replacement.file, 'utf8');
      const newContent = content.replace(replacement.original, replacement.replacement);
      fs.writeFileSync(replacement.file, newContent);
      console.log(\`✅ Replaced alert in \${replacement.file} at line \${replacement.line}\`);
    } catch (error) {
      console.error(\`❌ Failed to replace alert in \${replacement.file}:\`, error.message);
    }
  });
}

// Uncomment to run replacements
// applyReplacements();
`;

  fs.writeFileSync('alert-replacement-script.js', script);
  console.log('   ✅ Replacement script saved as: alert-replacement-script.js');
}

// Run the analysis
analyzeProject();