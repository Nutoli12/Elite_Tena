import { readFileSync, writeFileSync } from 'fs';

// Read the file
let content = readFileSync('server/src/server.js', 'utf8');

// Find the last occurrence of the closing brace and add export
const lastBraceIndex = content.lastIndexOf('});');
if (lastBraceIndex !== -1) {
  // Find the end of that line
  const endOfLine = content.indexOf('\n', lastBraceIndex);
  if (endOfLine !== -1) {
    // Keep everything up to and including that line, then add export
    content = content.substring(0, endOfLine + 1) + '\nexport default app;\n';
  }
}

// Write the fixed file
writeFileSync('server/src/server.js', content, 'utf8');
console.log('✅ Fixed server.js file');