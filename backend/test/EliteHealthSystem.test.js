const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EliteHealthSystem", function () {
  let eliteHealth;
  let owner;
  let patient;
  let doctor;
  let unauthorized;

  // Test constants
  const PATIENT_FEE = ethers.utils.parseEther("0.01");
  const DOCTOR_FEE = ethers.utils.parseEther("0.02");
  const APPOINTMENT_FEE = ethers.utils.parseEther("0.05");

  beforeEach(async function () {
    // Get signers
    [owner, patient, doctor, unauthorized] = await ethers.getSigners();
    
    // Deploy contract
    const EliteHealthSystem = await ethers.getContractFactory("EliteHealthSystem");
    eliteHealth = await EliteHealthSystem.deploy();
    await eliteHealth.deployed();
  });

  describe("Contract Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await eliteHealth.owner()).to.equal(owner.address);
    });

    it("Should set deployer as admin", async function () {
      const user = await eliteHealth.users(owner.address);
      expect(user.registered).to.be.true;
      expect(user.role).to.equal(2); // 2 = Admin in enum
    });

    it("Should set correct initial fees", async function () {
      expect(await eliteHealth.patientFee()).to.equal(PATIENT_FEE);
      expect(await eliteHealth.doctorFee()).to.equal(DOCTOR_FEE);
      expect(await eliteHealth.appointmentFee()).to.equal(APPOINTMENT_FEE);
    });
  });

  describe("Patient Registration", function () {
    it("Should register patient with correct fee", async function () {
      await expect(
        eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE })
      )
        .to.emit(eliteHealth, "PatientRegistered")
        .withArgs(patient.address, anyValue);

      const user = await eliteHealth.users(patient.address);
      expect(user.registered).to.be.true;
      expect(user.role).to.equal(0); // 0 = Patient in enum
      expect(user.id).to.match(/^PT/); // Should start with PT
    });

    it("Should fail with insufficient payment", async function () {
      await expect(
        eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE.sub(ethers.utils.parseEther("0.001")) })
      ).to.be.revertedWith("InsufficientPayment");
    });

    it("Should fail if already registered", async function () {
      await eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE });
      
      await expect(
        eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE })
      ).to.be.revertedWith("AlreadyRegistered");
    });
  });

  describe("Doctor Registration", function () {
    it("Should register doctor with correct fee", async function () {
      await expect(
        eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE })
      )
        .to.emit(eliteHealth, "DoctorRegistered")
        .withArgs(doctor.address, "Cardiology");

      const user = await eliteHealth.users(doctor.address);
      expect(user.registered).to.be.true;
      expect(user.role).to.equal(1); // 1 = Doctor in enum
      expect(user.specialization).to.equal("Cardiology");
    });

    it("Should not be approved initially", async function () {
      await eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE });
      
      expect(await eliteHealth.approvedDoctors(doctor.address)).to.be.false;
    });
  });

  describe("Doctor Approval", function () {
    beforeEach(async function () {
      await eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE });
    });

    it("Should allow admin to approve doctor", async function () {
      await expect(
        eliteHealth.connect(owner).approveDoctor(doctor.address)
      )
        .to.emit(eliteHealth, "DoctorApproved")
        .withArgs(doctor.address);

      expect(await eliteHealth.approvedDoctors(doctor.address)).to.be.true;
    });

    it("Should fail if non-admin tries to approve", async function () {
      await expect(
        eliteHealth.connect(unauthorized).approveDoctor(doctor.address)
      ).to.be.revertedWith("NotAdmin");
    });

    it("Should fail if approving non-doctor", async function () {
      await expect(
        eliteHealth.connect(owner).approveDoctor(patient.address)
      ).to.be.revertedWith("NotDoctor");
    });
  });

  describe("Appointment Booking", function () {
    beforeEach(async function () {
      // Setup: register patient and approved doctor
      await eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE });
      await eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE });
      await eliteHealth.connect(owner).approveDoctor(doctor.address);
    });

    it("Should book appointment with correct payment distribution", async function () {
      const initialDoctorBalance = await ethers.provider.getBalance(doctor.address);
      const initialAdminBalance = await ethers.provider.getBalance(owner.address);

      const tx = await eliteHealth.connect(patient).bookAppointment(doctor.address, { value: APPOINTMENT_FEE });
      const receipt = await tx.wait();

      // Check gas costs for accurate balance calculations
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalDoctorBalance = await ethers.provider.getBalance(doctor.address);
      const finalAdminBalance = await ethers.provider.getBalance(owner.address);

      // Doctor should receive 90% of appointment fee
      const expectedDoctorShare = APPOINTMENT_FEE.mul(90).div(100);
      expect(finalDoctorBalance.sub(initialDoctorBalance)).to.equal(expectedDoctorShare);

      // Admin should receive 10% of appointment fee
      const expectedAdminShare = APPOINTMENT_FEE.mul(10).div(100);
      expect(finalAdminBalance.sub(initialAdminBalance)).to.equal(expectedAdminShare);

      // Check appointment was created
      const appointment = await eliteHealth.appointments(0);
      expect(appointment.patient).to.equal(patient.address);
      expect(appointment.doctor).to.equal(doctor.address);
      expect(appointment.completed).to.be.false;
    });

    it("Should fail if doctor not approved", async function () {
      // Register another doctor but don't approve
      const anotherDoctor = await ethers.getSigner(4);
      await eliteHealth.connect(anotherDoctor).registerDoctor("Neurology", { value: DOCTOR_FEE });

      await expect(
        eliteHealth.connect(patient).bookAppointment(anotherDoctor.address, { value: APPOINTMENT_FEE })
      ).to.be.revertedWith("DoctorNotApproved");
    });

    it("Should fail with wrong payment amount", async function () {
      await expect(
        eliteHealth.connect(patient).bookAppointment(doctor.address, { value: APPOINTMENT_FEE.sub(ethers.utils.parseEther("0.001")) })
      ).to.be.revertedWith("InsufficientPayment");
    });

    it("Should fail if caller is not patient", async function () {
      await expect(
        eliteHealth.connect(unauthorized).bookAppointment(doctor.address, { value: APPOINTMENT_FEE })
      ).to.be.revertedWith("NotPatient");
    });
  });

  describe("Medical Records", function () {
    const testCID = "QmTestMedicalRecordCID123";

    beforeEach(async function () {
      await eliteHealth.connect(patient).registerPatient({ value: PATIENT_FEE });
    });

    it("Should allow patient to store medical record", async function () {
      await expect(
        eliteHealth.connect(patient).storeMedicalRecordHash(testCID)
      )
        .to.emit(eliteHealth, "MedicalRecordStored")
        .withArgs(patient.address, testCID);

      const records = await eliteHealth.getMedicalRecords(patient.address);
      expect(records).to.include(testCID);
    });

    it("Should allow approved doctor to view patient records", async function () {
      // Setup doctor
      await eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE });
      await eliteHealth.connect(owner).approveDoctor(doctor.address);

      // Patient stores record
      await eliteHealth.connect(patient).storeMedicalRecordHash(testCID);

      // Doctor should be able to view
      const records = await eliteHealth.connect(doctor).getMedicalRecords(patient.address);
      expect(records).to.include(testCID);
    });

    it("Should prevent unauthorized access to medical records", async function () {
      await eliteHealth.connect(patient).storeMedicalRecordHash(testCID);

      // Unauthorized user should not be able to view
      await expect(
        eliteHealth.connect(unauthorized).getMedicalRecords(patient.address)
      ).to.be.revertedWith("Not authorized to access these records");
    });

    it("Should prevent unapproved doctor from viewing records", async function () {
      // Register doctor but don't approve
      await eliteHealth.connect(doctor).registerDoctor("Cardiology", { value: DOCTOR_FEE });

      await eliteHealth.connect(patient).storeMedicalRecordHash(testCID);

      await expect(
        eliteHealth.connect(doctor).getMedicalRecords(patient.address)
      ).to.be.revertedWith("Not authorized to access these records");
    });
  });

  describe("Fee Management", function () {
    it("Should allow admin to update fees", async function () {
      const newPatientFee = ethers.utils.parseEther("0.02");
      const newDoctorFee = ethers.utils.parseEther("0.03");
      const newAppointmentFee = ethers.utils.parseEther("0.06");

      await expect(
        eliteHealth.connect(owner).updateFees(newPatientFee, newDoctorFee, newAppointmentFee)
      )
        .to.emit(eliteHealth, "FeesUpdated")
        .withArgs(newPatientFee, newDoctorFee, newAppointmentFee);

      expect(await eliteHealth.patientFee()).to.equal(newPatientFee);
      expect(await eliteHealth.doctorFee()).to.equal(newDoctorFee);
      expect(await eliteHealth.appointmentFee()).to.equal(newAppointmentFee);
    });

    it("Should prevent non-admin from updating fees", async function () {
      const newPatientFee = ethers.utils.parseEther("0.02");

      await expect(
        eliteHealth.connect(unauthorized).updateFees(newPatientFee, newPatientFee, newPatientFee)
      ).to.be.revertedWith("NotAdmin");
    });
  });

  describe("System Statistics", function () {
    it("Should return correct system stats", async function () {
      const [totalUsers, totalPatients, totalDoctors, totalAppointments, contractBalance] = 
        await eliteHealth.getSystemStats();

      // After deployment: 1 admin user
      expect(totalUsers).to.equal(1);
      expect(contractBalance).to.equal(0);
    });
  });
});

// Helper function for event matching
function anyValue() {
  return true;
}