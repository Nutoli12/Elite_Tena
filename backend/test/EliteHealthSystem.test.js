const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EliteHealthSystem", function () {
  let EliteHealthSystem, eliteHealth, owner, patient, doctor;

  beforeEach(async function () {
    [owner, patient, doctor] = await ethers.getSigners();
    
    EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
    eliteHealth = await EliteHealthSystem.deploy();
    await eliteHealth.waitForDeployment();
  });

  it("Should deploy with correct initial state", async function () {
    expect(await eliteHealth.owner()).to.equal(owner.address);
  });

  it("Should allow patient registration", async function () {
    await eliteHealth.connect(patient).registerPatient("John Doe", 30, "A+");
    const patientInfo = await eliteHealth.patients(patient.address);
    expect(patientInfo.name).to.equal("John Doe");
  });
});
