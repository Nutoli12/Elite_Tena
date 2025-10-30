const fs = require('fs');
const path = require('path');

console.log("Checking OpenZeppelin installation...");

const ozPath = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts');

if (!fs.existsSync(ozPath)) {
  console.log("âŒ OpenZeppelin contracts not installed");
  process.exit(1);
}

console.log("âœ… OpenZeppelin contracts installed");

// Check for specific files
const filesToCheck = [
  'utils/ReentrancyGuard.sol',
  'security/ReentrancyGuard.sol',
  'utils/Pausable.sol', 
  'security/Pausable.sol'
];

filesToCheck.forEach(file => {
  const fullPath = path.join(ozPath, file);
  if (fs.existsSync(fullPath)) {
    console.log(`âœ… Found: ${file}`);
  }
});

// List all directories
console.log("\ní³ All directories in OpenZeppelin contracts:");
const items = fs.readdirSync(ozPath, { withFileTypes: true });
items.forEach(item => {
  if (item.isDirectory()) {
    console.log(`   í³‚ ${item.name}/`);
  }
});
