const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  // Get balance using provider
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get the deployed contract - replace with actual address from deployment
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const helloWorld = HelloWorld.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // default first local address

  // Test basic functions
  console.log("Contract address:", helloWorld.target);
  
  const currentGreeting = await helloWorld.getGreeting();
  console.log("Current greeting:", currentGreeting);
  
  // Test setting a new greeting
  console.log("Setting new greeting...");
  const tx = await helloWorld.setGreeting("Hello, Hardhat!");
  await tx.wait();
  
  const newGreeting = await helloWorld.getGreeting();
  console.log("New greeting:", newGreeting);
  
  console.log("All tests passed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
