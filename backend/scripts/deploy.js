const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  
  // Use correct ethers v6 syntax
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy EliteHealthSystem
  const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
  const eliteHealth = await EliteHealthSystem.deploy();
  
  await eliteHealth.waitForDeployment();
  
  console.log("EliteHealthSystem deployed to:", eliteHealth.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
