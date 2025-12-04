// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EliteHealthSystemEnhanced
 * @dev Enhanced healthcare management system with comprehensive features
 */
contract EliteHealthSystemEnhanced is Ownable, ReentrancyGuard {
    
    // User roles
    enum UserRole { None, Patient, Doctor, Pharmacist, LabTechnician }
    
    // Consent types
    enum ConsentType { MedicalRecords, Prescriptions, LabResults, Appointments, All }
    
    // User structure
    struct User {
        address walletAddress;
        UserRole role;
        bool isRegistered;
        bool isApproved; // For providers (doctors, pharmacists, lab techs)
        string profileData; // IPFS hash or encrypted data
        uint256 registrationDate;
    }
    
    // Consent structure
    struct Consent {
        address patient;
        address provider;
        ConsentType consentType;
        bool isActive;
        uint256 grantedAt;
        uint256 expiresAt; // 0 means no expiry
    }
    
    // Prescription structure
    struct Prescription {
        uint256 id;
        address patient;
        address doctor;
        string ipfsHash;
        bool isFilled;
        uint256 issuedAt;
    }
    
    // Lab Result structure
    struct LabResult {
        uint256 id;
        address patient;
        address labTechnician;
        address approvingDoctor;
        string ipfsHash;
        bool isApproved;
        uint256 submittedAt;
    }
    
    // Registration fees
    uint256 public patientFee = 0.01 ether;
    uint256 public doctorFee = 0.02 ether;
    uint256 public pharmacistFee = 0.015 ether;
    uint256 public labTechnicianFee = 0.015 ether;
    uint256 public appointmentFee = 0.05 ether;
    
    // Mappings
    mapping(address => User) public users;
    mapping(address => mapping(address => mapping(ConsentType => Consent))) public consents;
    mapping(uint256 => Prescription) public prescriptions;
    mapping(uint256 => LabResult) public labResults;
    mapping(address => string[]) public medicalRecords; // patient => IPFS hashes
    
    // Counters
    uint256 public prescriptionCounter;
    uint256 public labResultCounter;
    
    // Events
    event UserRegistered(address indexed user, UserRole role);
    event ProviderApproved(address indexed provider, UserRole role);
    event ConsentGranted(address indexed patient, address indexed provider, ConsentType consentType, uint256 expiresAt);
    event ConsentRevoked(address indexed patient, address indexed provider, ConsentType consentType);
    event PrescriptionIssued(uint256 indexed prescriptionId, address indexed patient, address indexed doctor);
    event PrescriptionFilled(uint256 indexed prescriptionId, address indexed pharmacist);
    event LabResultSubmitted(uint256 indexed resultId, address indexed patient, address indexed labTech);
    event LabResultApproved(uint256 indexed resultId, address indexed doctor);
    event MedicalRecordStored(address indexed patient, address indexed doctor, string ipfsHash);
    event AppointmentBooked(address indexed patient, address indexed doctor, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }
    
    modifier onlyRole(UserRole _role) {
        require(users[msg.sender].role == _role, "Unauthorized role");
        _;
    }
    
    modifier onlyApprovedProvider() {
        require(users[msg.sender].isApproved, "Provider not approved");
        _;
    }
    
    // Registration functions
    function registerPatient(string memory _profileData) external payable {
        require(msg.value >= patientFee, "Insufficient registration fee");
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            role: UserRole.Patient,
            isRegistered: true,
            isApproved: true, // Patients are auto-approved
            profileData: _profileData,
            registrationDate: block.timestamp
        });
        
        emit UserRegistered(msg.sender, UserRole.Patient);
    }
    
    function registerDoctor(string memory _profileData) external payable {
        require(msg.value >= doctorFee, "Insufficient registration fee");
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            role: UserRole.Doctor,
            isRegistered: true,
            isApproved: false, // Requires admin approval
            profileData: _profileData,
            registrationDate: block.timestamp
        });
        
        emit UserRegistered(msg.sender, UserRole.Doctor);
    }
    
    function registerPharmacist(string memory _profileData) external payable {
        require(msg.value >= pharmacistFee, "Insufficient registration fee");
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            role: UserRole.Pharmacist,
            isRegistered: true,
            isApproved: false,
            profileData: _profileData,
            registrationDate: block.timestamp
        });
        
        emit UserRegistered(msg.sender, UserRole.Pharmacist);
    }
    
    function registerLabTechnician(string memory _profileData) external payable {
        require(msg.value >= labTechnicianFee, "Insufficient registration fee");
        require(!users[msg.sender].isRegistered, "Already registered");
        
        users[msg.sender] = User({
            walletAddress: msg.sender,
            role: UserRole.LabTechnician,
            isRegistered: true,
            isApproved: false,
            profileData: _profileData,
            registrationDate: block.timestamp
        });
        
        emit UserRegistered(msg.sender, UserRole.LabTechnician);
    }
    
    // Admin functions
    function approveProvider(address _provider) external onlyOwner {
        require(users[_provider].isRegistered, "User not registered");
        require(users[_provider].role != UserRole.Patient, "Cannot approve patients");
        
        users[_provider].isApproved = true;
        emit ProviderApproved(_provider, users[_provider].role);
    }
    
    // Consent management
    function grantConsent(
        address _provider,
        ConsentType _consentType,
        uint256 _durationHours
    ) external onlyRegistered onlyRole(UserRole.Patient) {
        require(users[_provider].isRegistered, "Provider not registered");
        require(users[_provider].isApproved, "Provider not approved");
        
        uint256 expiresAt = _durationHours > 0 ? block.timestamp + (_durationHours * 1 hours) : 0;
        
        consents[msg.sender][_provider][_consentType] = Consent({
            patient: msg.sender,
            provider: _provider,
            consentType: _consentType,
            isActive: true,
            grantedAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        emit ConsentGranted(msg.sender, _provider, _consentType, expiresAt);
    }
    
    function revokeConsent(address _provider, ConsentType _consentType) external onlyRegistered {
        consents[msg.sender][_provider][_consentType].isActive = false;
        emit ConsentRevoked(msg.sender, _provider, _consentType);
    }
    
    function checkConsent(
        address _patient,
        address _provider,
        ConsentType _consentType
    ) public view returns (bool) {
        Consent memory consent = consents[_patient][_provider][_consentType];
        
        if (!consent.isActive) return false;
        if (consent.expiresAt > 0 && block.timestamp > consent.expiresAt) return false;
        
        return true;
    }
    
    // Medical records
    function storeMedicalRecord(
        address _patient,
        string memory _ipfsHash
    ) external onlyRegistered onlyRole(UserRole.Doctor) onlyApprovedProvider {
        require(checkConsent(_patient, msg.sender, ConsentType.MedicalRecords) || 
                checkConsent(_patient, msg.sender, ConsentType.All), "No consent");
        
        medicalRecords[_patient].push(_ipfsHash);
        emit MedicalRecordStored(_patient, msg.sender, _ipfsHash);
    }
    
    // Prescription workflow
    function issuePrescription(
        address _patient,
        string memory _ipfsHash
    ) external onlyRegistered onlyRole(UserRole.Doctor) onlyApprovedProvider returns (uint256) {
        require(checkConsent(_patient, msg.sender, ConsentType.Prescriptions) || 
                checkConsent(_patient, msg.sender, ConsentType.All), "No consent");
        
        prescriptionCounter++;
        prescriptions[prescriptionCounter] = Prescription({
            id: prescriptionCounter,
            patient: _patient,
            doctor: msg.sender,
            ipfsHash: _ipfsHash,
            isFilled: false,
            issuedAt: block.timestamp
        });
        
        emit PrescriptionIssued(prescriptionCounter, _patient, msg.sender);
        return prescriptionCounter;
    }
    
    function fillPrescription(uint256 _prescriptionId) external onlyRegistered onlyRole(UserRole.Pharmacist) onlyApprovedProvider {
        Prescription storage prescription = prescriptions[_prescriptionId];
        require(prescription.id > 0, "Prescription does not exist");
        require(!prescription.isFilled, "Already filled");
        
        prescription.isFilled = true;
        emit PrescriptionFilled(_prescriptionId, msg.sender);
    }
    
    // Lab result workflow
    function submitLabResult(
        address _patient,
        string memory _ipfsHash
    ) external onlyRegistered onlyRole(UserRole.LabTechnician) onlyApprovedProvider returns (uint256) {
        require(checkConsent(_patient, msg.sender, ConsentType.LabResults) || 
                checkConsent(_patient, msg.sender, ConsentType.All), "No consent");
        
        labResultCounter++;
        labResults[labResultCounter] = LabResult({
            id: labResultCounter,
            patient: _patient,
            labTechnician: msg.sender,
            approvingDoctor: address(0),
            ipfsHash: _ipfsHash,
            isApproved: false,
            submittedAt: block.timestamp
        });
        
        emit LabResultSubmitted(labResultCounter, _patient, msg.sender);
        return labResultCounter;
    }
    
    function approveLabResult(uint256 _resultId) external onlyRegistered onlyRole(UserRole.Doctor) onlyApprovedProvider {
        LabResult storage result = labResults[_resultId];
        require(result.id > 0, "Lab result does not exist");
        require(!result.isApproved, "Already approved");
        require(checkConsent(result.patient, msg.sender, ConsentType.LabResults) || 
                checkConsent(result.patient, msg.sender, ConsentType.All), "No consent");
        
        result.isApproved = true;
        result.approvingDoctor = msg.sender;
        emit LabResultApproved(_resultId, msg.sender);
    }
    
    // Appointment booking
    function bookAppointment(address _doctor) external payable onlyRegistered onlyRole(UserRole.Patient) nonReentrant {
        require(msg.value >= appointmentFee, "Insufficient appointment fee");
        require(users[_doctor].role == UserRole.Doctor, "Not a doctor");
        require(users[_doctor].isApproved, "Doctor not approved");
        
        // 90% to doctor, 10% to platform
        uint256 doctorShare = (msg.value * 90) / 100;
        uint256 platformShare = msg.value - doctorShare;
        
        payable(_doctor).transfer(doctorShare);
        payable(owner()).transfer(platformShare);
        
        emit AppointmentBooked(msg.sender, _doctor, msg.value);
    }
    
    // Fee management
    function updateFees(
        uint256 _patientFee,
        uint256 _doctorFee,
        uint256 _pharmacistFee,
        uint256 _labTechnicianFee,
        uint256 _appointmentFee
    ) external onlyOwner {
        patientFee = _patientFee;
        doctorFee = _doctorFee;
        pharmacistFee = _pharmacistFee;
        labTechnicianFee = _labTechnicianFee;
        appointmentFee = _appointmentFee;
    }
    
    // View functions
    function getUserInfo(address _user) external view returns (User memory) {
        return users[_user];
    }
    
    function getMedicalRecords(address _patient) external view returns (string[] memory) {
        return medicalRecords[_patient];
    }
    
    function getPrescription(uint256 _prescriptionId) external view returns (Prescription memory) {
        return prescriptions[_prescriptionId];
    }
    
    function getLabResult(uint256 _resultId) external view returns (LabResult memory) {
        return labResults[_resultId];
    }
    
    // Withdraw function
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
