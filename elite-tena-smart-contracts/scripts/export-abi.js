const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n📦 Exporting Contract ABI...\n");

  // Source path
  const artifactPath = path.join(
    __dirname,
    '../artifacts/contracts/EliteHealthSystemEnhanced.sol/EliteHealthSystemEnhanced.json'
  );

  // Destination paths
  const sharedPath = path.join(__dirname, '../../shared/contracts');
  const serverPath = path.join(__dirname, '../../server/contracts');

  // Read the artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Extract ABI and bytecode
  const exportData = {
    contractName: "EliteHealthSystemEnhanced",
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    deployedBytecode: artifact.deployedBytecode,
    linkReferences: artifact.linkReferences,
    deployedLinkReferences: artifact.deployedLinkReferences
  };

  // Create directories if they don't exist
  if (!fs.existsSync(sharedPath)) {
    fs.mkdirSync(sharedPath, { recursive: true });
  }
  if (!fs.existsSync(serverPath)) {
    fs.mkdirSync(serverPath, { recursive: true });
  }

  // Write to shared folder
  const sharedFile = path.join(sharedPath, 'EliteHealthSystemEnhanced.json');
  fs.writeFileSync(sharedFile, JSON.stringify(exportData, null, 2));
  console.log("✅ Exported to:", sharedFile);

  // Write to server folder
  const serverFile = path.join(serverPath, 'EliteHealthSystemEnhanced.json');
  fs.writeFileSync(serverFile, JSON.stringify(exportData, null, 2));
  console.log("✅ Exported to:", serverFile);

  // Also export just the ABI for easier frontend use
  const abiOnlyPath = path.join(sharedPath, 'EliteHealthSystemEnhanced.abi.json');
  fs.writeFileSync(abiOnlyPath, JSON.stringify(artifact.abi, null, 2));
  console.log("✅ Exported ABI only to:", abiOnlyPath);

  console.log("\n🎉 ABI export complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
