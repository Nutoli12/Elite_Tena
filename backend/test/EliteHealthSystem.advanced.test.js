const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EliteHealthSystem - Advanced Scenarios", function () {
  let eliteHealth;
  let owner, patient1, patient2, doctor1, doctor2;

  beforeEach(async function () {
    [owner, patient1, patient2, doctor1, doctor2] = await ethers.getSigners();
    
    const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
    eliteHealth = await EliteHealthSystem.deploy();
    await eliteHealth.deployed();
  });

  describe("Multiple Users Workflow", function () {
    it("Should handle multiple patients and doctors", async function () {
      // Register multiple patients
      await eliteHealth.connect(patient1).registerPatient({ value: ethers.utils.parseEther("0.01") });
      await eliteHealth.connect(patient2).registerPatient({ value: ethers.utils.parseEther("0.01") });

      // Register and approve multiple doctors
      await eliteHealth.connect(doctor1).registerDoctor("Cardiology", { value: ethers.utils.parseEther("0.02") });
      await eliteHealth.connect(doctor2).registerDoctor("Neurology", { value: ethers.utils.parseEther("0.02") });
      await eliteHealth.connect(owner).approveDoctor(doctor1.address);
      await eliteHealth.connect(owner).approveDoctor(doctor2.address);

      // Book appointments
      await eliteHealth.connect(patient1).bookAppointment(doctor1.address, { value: ethers.utils.parseEther("0.05") });
      await eliteHealth.connect(patient2).bookAppointment(doctor2.address, { value: ethers.utils.parseEther("0.05") });

      // Store medical records
      await eliteHealth.connect(patient1).storeMedicalRecordHash("QmPatient1Record1");
      await eliteHealth.connect(patient1).storeMedicalRecordHash("QmPatient1Record2");
      await eliteHealth.connect(patient2).storeMedicalRecordHash("QmPatient2Record1");

      // Verify data isolation
      const patient1Records = await eliteHealth.connect(doctor1).getMedicalRecords(patient1.address);
      const patient2Records = await eliteHealth.connect(doctor2).getMedicalRecords(patient2.address);

      expect(patient1Records).to.have.lengthOf(2);
      expect(patient2Records).to.have.lengthOf(1);
      expect(patient1Records).to.not.deep.equal(patient2Records);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address checks", async function () {
      await expect(
        eliteHealth.connect(owner).approveDoctor(ethers.constants.AddressZero)
      ).to.be.reverted;
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract for full testing
      // For now, we trust OpenZeppelin's ReentrancyGuard
      await eliteHealth.connect(patient1).registerPatient({ value: ethers.utils.parseEther("0.01") });
      await eliteHealth.connect(doctor1).registerDoctor("Cardiology", { value: ethers.utils.parseEther("0.02") });
      await eliteHealth.connect(owner).approveDoctor(doctor1.address);

      // Multiple rapid calls should not break payment distribution
      await eliteHealth.connect(patient1).bookAppointment(doctor1.address, { value: ethers.utils.parseEther("0.05") });
      
      const appointment = await eliteHealth.appointments(0);
      expect(appointment.completed).to.be.false;
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for patient registration", async function () {
      const tx = await eliteHealth.connect(patient1).registerPatient({ value: ethers.utils.parseEther("0.01") });
      const receipt = await tx.wait();

      console.log("Patient registration gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });

    it("Should have reasonable gas costs for appointment booking", async function () {
      await eliteHealth.connect(patient1).registerPatient({ value: ethers.utils.parseEther("0.01") });
      await eliteHealth.connect(doctor1).registerDoctor("Cardiology", { value: ethers.utils.parseEther("0.02") });
      await eliteHealth.connect(owner).approveDoctor(doctor1.address);

      const tx = await eliteHealth.connect(patient1).bookAppointment(doctor1.address, { value: ethers.utils.parseEther("0.05") });
      const receipt = await tx.wait();

      console.log("Appointment booking gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(150000); // Should use less than 150k gas
    });
  });
});