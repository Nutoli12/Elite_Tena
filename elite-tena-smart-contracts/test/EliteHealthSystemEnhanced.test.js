const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EliteHealthSystemEnhanced", function () {
  let contract;
  let owner, patient, doctor, pharmacist, labTech, addr1;

  beforeEach(async function () {
    [owner, patient, doctor, pharmacist, labTech, addr1] = await ethers.getSigners();
    
    const EliteHealthSystemEnhanced = await ethers.getContractFactory("EliteHealthSystemEnhanced");
    contract = await EliteHealthSystemEnhanced.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should have correct initial fees", async function () {
      expect(await contract.patientFee()).to.equal(ethers.parseEther("0.01"));
      expect(await contract.doctorFee()).to.equal(ethers.parseEther("0.02"));
      expect(await contract.pharmacistFee()).to.equal(ethers.parseEther("0.015"));
      expect(await contract.labTechnicianFee()).to.equal(ethers.parseEther("0.015"));
      expect(await contract.appointmentFee()).to.equal(ethers.parseEther("0.05"));
    });
  });

  describe("User Registration", function () {
    it("Should register a patient with correct fee", async function () {
      await expect(
        contract.connect(patient).registerPatient("ipfs://patient-profile", {
          value: ethers.parseEther("0.01")
        })
      ).to.emit(contract, "UserRegistered");

      const user = await contract.getUserInfo(patient.address);
      expect(user.isRegistered).to.be.true;
      expect(user.role).to.equal(1); // Patient role
      expect(user.isApproved).to.be.true;
    });

    it("Should register a doctor", async function () {
      await contract.connect(doctor).registerDoctor("ipfs://doctor-profile", {
        value: ethers.parseEther("0.02")
      });

      const user = await contract.getUserInfo(doctor.address);
      expect(user.isRegistered).to.be.true;
      expect(user.role).to.equal(2); // Doctor role
      expect(user.isApproved).to.be.false; // Requires approval
    });

    it("Should register a pharmacist", async function () {
      await contract.connect(pharmacist).registerPharmacist("ipfs://pharmacist-profile", {
        value: ethers.parseEther("0.015")
      });

      const user = await contract.getUserInfo(pharmacist.address);
      expect(user.isRegistered).to.be.true;
      expect(user.role).to.equal(3); // Pharmacist role
    });

    it("Should register a lab technician", async function () {
      await contract.connect(labTech).registerLabTechnician("ipfs://labtech-profile", {
        value: ethers.parseEther("0.015")
      });

      const user = await contract.getUserInfo(labTech.address);
      expect(user.isRegistered).to.be.true;
      expect(user.role).to.equal(4); // LabTech role
    });

    it("Should reject registration with insufficient fee", async function () {
      await expect(
        contract.connect(patient).registerPatient("ipfs://profile", {
          value: ethers.parseEther("0.005")
        })
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should reject duplicate registration", async function () {
      await contract.connect(patient).registerPatient("ipfs://profile", {
        value: ethers.parseEther("0.01")
      });

      await expect(
        contract.connect(patient).registerPatient("ipfs://profile2", {
          value: ethers.parseEther("0.01")
        })
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("Provider Approval", function () {
    beforeEach(async function () {
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
    });

    it("Should allow owner to approve doctor", async function () {
      await expect(contract.approveProvider(doctor.address))
        .to.emit(contract, "ProviderApproved");

      const user = await contract.getUserInfo(doctor.address);
      expect(user.isApproved).to.be.true;
    });

    it("Should reject non-owner approval", async function () {
      await expect(
        contract.connect(addr1).approveProvider(doctor.address)
      ).to.be.reverted;
    });
  });

  describe("Consent Management", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
      await contract.approveProvider(doctor.address);
    });

    it("Should grant consent with expiry", async function () {
      await expect(
        contract.connect(patient).grantConsent(doctor.address, 0, 24) // MedicalRecords, 24 hours
      ).to.emit(contract, "ConsentGranted");

      const hasConsent = await contract.checkConsent(patient.address, doctor.address, 0);
      expect(hasConsent).to.be.true;
    });

    it("Should grant permanent consent", async function () {
      await contract.connect(patient).grantConsent(doctor.address, 0, 0); // No expiry

      const hasConsent = await contract.checkConsent(patient.address, doctor.address, 0);
      expect(hasConsent).to.be.true;
    });

    it("Should revoke consent", async function () {
      await contract.connect(patient).grantConsent(doctor.address, 0, 24);
      
      await expect(
        contract.connect(patient).revokeConsent(doctor.address, 0)
      ).to.emit(contract, "ConsentRevoked");

      const hasConsent = await contract.checkConsent(patient.address, doctor.address, 0);
      expect(hasConsent).to.be.false;
    });

    it("Should reject consent to unapproved provider", async function () {
      const [, , , , , unapprovedDoctor] = await ethers.getSigners();
      await contract.connect(unapprovedDoctor).registerDoctor("ipfs://doc", {
        value: ethers.parseEther("0.02")
      });

      await expect(
        contract.connect(patient).grantConsent(unapprovedDoctor.address, 0, 24)
      ).to.be.revertedWith("Provider not approved");
    });
  });

  describe("Medical Records", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
      await contract.approveProvider(doctor.address);
      await contract.connect(patient).grantConsent(doctor.address, 0, 24);
    });

    it("Should store medical record with consent", async function () {
      await expect(
        contract.connect(doctor).storeMedicalRecord(patient.address, "ipfs://record1")
      ).to.emit(contract, "MedicalRecordStored");

      const records = await contract.getMedicalRecords(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0]).to.equal("ipfs://record1");
    });

    it("Should reject storing record without consent", async function () {
      const [, , , , , , unauthorizedDoctor] = await ethers.getSigners();
      await contract.connect(unauthorizedDoctor).registerDoctor("ipfs://doc", {
        value: ethers.parseEther("0.02")
      });
      await contract.approveProvider(unauthorizedDoctor.address);

      await expect(
        contract.connect(unauthorizedDoctor).storeMedicalRecord(patient.address, "ipfs://record")
      ).to.be.revertedWith("No consent");
    });
  });

  describe("Prescription Workflow", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
      await contract.connect(pharmacist).registerPharmacist("ipfs://pharmacist", {
        value: ethers.parseEther("0.015")
      });
      await contract.approveProvider(doctor.address);
      await contract.approveProvider(pharmacist.address);
      await contract.connect(patient).grantConsent(doctor.address, 1, 24); // Prescriptions
    });

    it("Should issue prescription", async function () {
      await expect(
        contract.connect(doctor).issuePrescription(patient.address, "ipfs://prescription1")
      ).to.emit(contract, "PrescriptionIssued");

      const prescription = await contract.getPrescription(1);
      expect(prescription.patient).to.equal(patient.address);
      expect(prescription.doctor).to.equal(doctor.address);
      expect(prescription.isFilled).to.be.false;
    });

    it("Should fill prescription", async function () {
      await contract.connect(doctor).issuePrescription(patient.address, "ipfs://prescription1");

      await expect(
        contract.connect(pharmacist).fillPrescription(1)
      ).to.emit(contract, "PrescriptionFilled");

      const prescription = await contract.getPrescription(1);
      expect(prescription.isFilled).to.be.true;
    });

    it("Should reject filling non-existent prescription", async function () {
      await expect(
        contract.connect(pharmacist).fillPrescription(999)
      ).to.be.revertedWith("Prescription does not exist");
    });
  });

  describe("Lab Result Workflow", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
      await contract.connect(labTech).registerLabTechnician("ipfs://labtech", {
        value: ethers.parseEther("0.015")
      });
      await contract.approveProvider(doctor.address);
      await contract.approveProvider(labTech.address);
      await contract.connect(patient).grantConsent(labTech.address, 2, 24); // LabResults
      await contract.connect(patient).grantConsent(doctor.address, 2, 24);
    });

    it("Should submit lab result", async function () {
      await expect(
        contract.connect(labTech).submitLabResult(patient.address, "ipfs://labresult1")
      ).to.emit(contract, "LabResultSubmitted");

      const result = await contract.getLabResult(1);
      expect(result.patient).to.equal(patient.address);
      expect(result.isApproved).to.be.false;
    });

    it("Should approve lab result", async function () {
      await contract.connect(labTech).submitLabResult(patient.address, "ipfs://labresult1");

      await expect(
        contract.connect(doctor).approveLabResult(1)
      ).to.emit(contract, "LabResultApproved");

      const result = await contract.getLabResult(1);
      expect(result.isApproved).to.be.true;
      expect(result.approvingDoctor).to.equal(doctor.address);
    });
  });

  describe("Appointment Booking", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });
      await contract.connect(doctor).registerDoctor("ipfs://doctor", {
        value: ethers.parseEther("0.02")
      });
      await contract.approveProvider(doctor.address);
    });

    it("Should book appointment with payment distribution", async function () {
      const doctorBalanceBefore = await ethers.provider.getBalance(doctor.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await expect(
        contract.connect(patient).bookAppointment(doctor.address, {
          value: ethers.parseEther("0.05")
        })
      ).to.emit(contract, "AppointmentBooked");

      const doctorBalanceAfter = await ethers.provider.getBalance(doctor.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Doctor should receive 90%
      expect(doctorBalanceAfter - doctorBalanceBefore).to.equal(ethers.parseEther("0.045"));
      // Owner should receive 10%
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ethers.parseEther("0.005"));
    });

    it("Should reject appointment with unapproved doctor", async function () {
      const [, , , , , , unapprovedDoctor] = await ethers.getSigners();
      await contract.connect(unapprovedDoctor).registerDoctor("ipfs://doc", {
        value: ethers.parseEther("0.02")
      });

      await expect(
        contract.connect(patient).bookAppointment(unapprovedDoctor.address, {
          value: ethers.parseEther("0.05")
        })
      ).to.be.revertedWith("Doctor not approved");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update fees", async function () {
      await contract.updateFees(
        ethers.parseEther("0.02"),
        ethers.parseEther("0.03"),
        ethers.parseEther("0.025"),
        ethers.parseEther("0.025"),
        ethers.parseEther("0.1")
      );

      expect(await contract.patientFee()).to.equal(ethers.parseEther("0.02"));
      expect(await contract.doctorFee()).to.equal(ethers.parseEther("0.03"));
    });

    it("Should reject non-owner fee update", async function () {
      await expect(
        contract.connect(addr1).updateFees(
          ethers.parseEther("0.02"),
          ethers.parseEther("0.03"),
          ethers.parseEther("0.025"),
          ethers.parseEther("0.025"),
          ethers.parseEther("0.1")
        )
      ).to.be.reverted;
    });
  });

  describe("Withdraw", function () {
    it("Should allow owner to withdraw", async function () {
      // Add some balance to contract
      await contract.connect(patient).registerPatient("ipfs://patient", {
        value: ethers.parseEther("0.01")
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(await contract.getAddress());

      await contract.withdraw();

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });
});
