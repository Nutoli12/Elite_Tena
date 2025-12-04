const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying EliteHealthSystemEnhanced...\n");

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);

  // Get deployer account
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  console.log("Deploying contract...");
  const EliteHealthSystemEnhanced = await hre.ethers.getContractFactory("EliteHealthSystemEnhanced");
  const contract = await EliteHealthSystemEnhanced.deploy();
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n✅ EliteHealthSystemEnhanced deployed to:", contractAddress);

  // Get deployment transaction
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log("\nContract Details:");
    console.log("  - Address:", contractAddress);
    console.log("  - Transaction:", deployTx.hash);
    console.log("  - Block:", deployTx.blockNumber);
    console.log("  - Gas Used:", deployTx.gasLimit.toString());
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: deployTx?.hash
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to deployment-info.json");
  console.log("\n🎉 Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("  1. Update server/.env with CONTRACT_ADDRESS=" + contractAddress);
  console.log("  2. Restart backend server");
  console.log("  3. Test contract functions\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
