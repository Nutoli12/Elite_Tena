const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing EliteHealthSystem contract...");
  
  const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
  const contract = await EliteHealthSystem.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Default local address

  // Test basic functions
  const admin = await contract.owner();
  console.log("👑 Admin:", admin);
  
  const patientFee = await contract.patientFee();
  const doctorFee = await contract.doctorFee();
  const appointmentFee = await contract.appointmentFee();
  
  console.log("💰 Patient fee:", ethers.utils.formatEther(patientFee), "ETH");
  console.log("💰 Doctor fee:", ethers.utils.formatEther(doctorFee), "ETH");
  console.log("💰 Appointment fee:", ethers.utils.formatEther(appointmentFee), "ETH");
  
  console.log("✅ Contract is working!");
}

main().catch(console.error);