const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying EliteHealthSystem contract...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
  const eliteHealth = await EliteHealthSystem.deploy();
  
  await eliteHealth.deployed();

  console.log("✅ EliteHealthSystem deployed to:", eliteHealth.address);
  
  // Save deployment info
  const deploymentInfo = {
    address: eliteHealth.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: 'local'
  };
  
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, 'local.json'), 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Save ABI to shared folder
  const sharedContractsDir = path.join(__dirname, '../../shared/contracts');
  if (!fs.existsSync(sharedContractsDir)) {
    fs.mkdirSync(sharedContractsDir, { recursive: true });
  }
  
  const contractArtifact = await artifacts.readArtifact("EliteHealthSystem");
  fs.writeFileSync(
    path.join(sharedContractsDir, 'EliteHealthSystem.json'),
    JSON.stringify(contractArtifact, null, 2)
  );
  
  console.log("📄 Deployment info saved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });