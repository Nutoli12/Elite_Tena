const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking with account:", deployer.address);

  // Check the default address
  const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const code = await ethers.provider.getCode(address);
  
  console.log("Code at", address, ":", code === '0x' ? 'EMPTY (no contract)' : 'CONTRACT EXISTS');
  
  if (code !== '0x') {
    console.log("Trying to interact with contract...");
    try {
      // Try to get the contract with different names
      const HelloWorld = await ethers.getContractFactory("HelloWorld");
      const contract = HelloWorld.attach(address);
      
      // Try different possible function names
      console.log("Testing available functions...");
      
      if (typeof contract.greeting === 'function') {
        const greeting = await contract.greeting();
        console.log("✓ greeting():", greeting);
      }
      
      if (typeof contract.getGreeting === 'function') {
        const getGreeting = await contract.getGreeting();
        console.log("✓ getGreeting():", getGreeting);
      }
      
      if (typeof contract.getMessage === 'function') {
        const getMessage = await contract.getMessage();
        console.log("✓ getMessage():", getMessage);
      }
      
    } catch (error) {
      console.log("Error interacting with contract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
