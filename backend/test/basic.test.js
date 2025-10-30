const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic EliteHealthSystem Setup", function () {
  it("Should deploy the contract", async function () {
    const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
    const eliteHealth = await EliteHealthSystem.deploy();
    
    // Use the correct ethers v6 syntax
    expect(eliteHealth.target).to.not.equal(ethers.ZeroAddress);
    console.log("✅ Contract deployed to:", eliteHealth.target);
  });

  it("Should have accounts available", async function () {
    const [deployer] = await ethers.getSigners();
    expect(deployer.address).to.not.be.undefined;
    console.log("✅ Accounts available");
  });
});
