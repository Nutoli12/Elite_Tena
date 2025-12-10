#!/usr/bin/env node

/**
 * Documentation Maintenance Script
 * Helps organize and maintain the docs folder
 */

const fs = require('fs');
const path = require('path');

const docsDir = __dirname;
const rootDir = path.join(__dirname, '..');

// Check for any MD files in root that should be in docs
function checkForMisplacedDocs() {
    console.log('🔍 Checking for misplaced documentation files...');
    
    const rootFiles = fs.readdirSync(rootDir);
    const mdFiles = rootFiles.filter(file => 
        file.endsWith('.md') && 
        file !== 'README.md' && 
        !file.startsWith('.')
    );
    
    if (mdFiles.length > 0) {
        console.log('⚠️  Found MD files in root directory:');
        mdFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
        console.log('\n💡 Run this to move them to docs:');
        console.log('   Get-ChildItem "*.md" | Where-Object { $_.Name -ne "README.md" } | ForEach-Object { Move-Item $_.FullName "docs\\" -Force }');
    } else {
        console.log('✅ All documentation files are properly organized in docs/');
    }
}

// Count documentation files
function countDocs() {
    const docFiles = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
    console.log(`📊 Total documentation files: ${docFiles.length}`);
    return docFiles.length;
}

// Generate a simple file list
function listDocs() {
    console.log('\n📋 Documentation files:');
    const docFiles = fs.readdirSync(docsDir)
        .filter(file => file.endsWith('.md'))
        .sort();
    
    docFiles.forEach((file, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${file}`);
    });
}

// Main execution
function main() {
    console.log('🏥 Elite Tena Documentation Maintenance\n');
    
    checkForMisplacedDocs();
    console.log('');
    countDocs();
    
    // If --list argument is provided, show all files
    if (process.argv.includes('--list')) {
        listDocs();
    }
    
    console.log('\n📖 For complete documentation index, see: docs/INDEX.md');
    console.log('🔗 Main documentation entry point: README.md');
}

if (require.main === module) {
    main();
}

module.exports = { checkForMisplacedDocs, countDocs, listDocs };