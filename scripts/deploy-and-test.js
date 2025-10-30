const { ethers } = require("hardhat");

async function main() {
  console.log("=== DEPLOYING CONTRACT ===");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const helloWorld = await HelloWorld.deploy();
  await helloWorld.waitForDeployment();
  
  const contractAddress = helloWorld.target;
  console.log("âœ… Contract deployed to:", contractAddress);

  console.log("\n=== TESTING CONTRACT ===");
  // Test functions
  try {
    const currentGreeting = await helloWorld.getGreeting();
    console.log("âœ“ getGreeting():", currentGreeting);
    
    console.log("Setting new greeting...");
    const tx = await helloWorld.setGreeting("Hello, Hardhat!");
    await tx.wait();
    
    const newGreeting = await helloWorld.getGreeting();
    console.log("âœ“ New greeting:", newGreeting);
    
    console.log("\ní¾‰ ALL TESTS PASSED!");
    console.log("Contract address for future tests:", contractAddress);
  } catch (error) {
    console.error("âŒ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
