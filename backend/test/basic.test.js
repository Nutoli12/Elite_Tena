const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic Setup Test", function () {
  it("Should have accounts available", async function () {
    const [owner] = await ethers.getSigners();
    expect(owner.address).to.not.be.undefined;
    console.log("Owner address:", owner.address);
  });

  it("Should compile contracts", async function () {
    // This will fail if contracts don't compile
    const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
    expect(EliteHealthSystem).to.not.be.undefined;
  });
});