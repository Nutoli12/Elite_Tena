const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Check if there's a contract at the address
  const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const code = await ethers.provider.getCode(address);
  
  if (code === '0x') {
    console.log("❌ No contract deployed at address:", address);
    console.log("You need to deploy the contract first!");
  } else {
    console.log("✅ Contract found at address:", address);
    console.log("Contract code length:", code.length);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
