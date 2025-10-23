// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EliteHealthSystem is Ownable, ReentrancyGuard {
    enum Role { None, Patient, Doctor, Admin }
    
    struct User {
        bool registered;
        Role role;
        string id;
        string specialization;
        uint256 registrationDate;
    }
    
    struct Appointment {
        address patient;
        address doctor;
        uint256 date;
        uint256 fee;
        bool completed;
    }
    
    uint256 public patientFee = 0.01 ether;
    uint256 public doctorFee = 0.02 ether;
    uint256 public appointmentFee = 0.05 ether;
    
    mapping(address => User) public users;
    mapping(address => bool) public approvedDoctors;
    mapping(address => string[]) public patientRecords;
    mapping(uint256 => Appointment) public appointments;
    
    uint256 private appointmentCounter;
    uint256 private userCounter;
    
    event PatientRegistered(address indexed patient, string patientId);
    event DoctorRegistered(address indexed doctor, string specialization);
    event DoctorApproved(address indexed doctor);
    event AppointmentBooked(uint256 indexed appointmentId, address patient, address doctor);
    event MedicalRecordStored(address indexed patient, string cid);
    
    error AlreadyRegistered();
    error InsufficientPayment(uint256 required, uint256 sent);
    error NotAdmin();
    error DoctorNotApproved();
    error NotDoctor();
    error NotPatient();
    
    modifier onlyAdmin() {
        if (users[msg.sender].role != Role.Admin) revert NotAdmin();
        _;
    }
    
    modifier onlyDoctor() {
        if (users[msg.sender].role != Role.Doctor || !approvedDoctors[msg.sender]) 
            revert NotDoctor();
        _;
    }
    
    modifier onlyPatient() {
        if (users[msg.sender].role != Role.Patient) revert NotPatient();
        _;
    }
    
    constructor() {
        users[msg.sender] = User({
            registered: true,
            role: Role.Admin,
            id: "ADMIN001",
            specialization: "",
            registrationDate: block.timestamp
        });
        userCounter++;
    }
    
    function registerPatient() external payable nonReentrant {
        if (users[msg.sender].registered) revert AlreadyRegistered();
        if (msg.value != patientFee) revert InsufficientPayment(patientFee, msg.value);
        
        string memory patientId = string(abi.encodePacked("PT", uint2str(userCounter + 1000)));
        
        users[msg.sender] = User({
            registered: true,
            role: Role.Patient,
            id: patientId,
            specialization: "",
            registrationDate: block.timestamp
        });
        
        userCounter++;
        emit PatientRegistered(msg.sender, patientId);
    }
    
    function registerDoctor(string calldata _specialization) external payable nonReentrant {
        if (users[msg.sender].registered) revert AlreadyRegistered();
        if (msg.value != doctorFee) revert InsufficientPayment(doctorFee, msg.value);
        
        users[msg.sender] = User({
            registered: true,
            role: Role.Doctor,
            id: "",
            specialization: _specialization,
            registrationDate: block.timestamp
        });
        
        userCounter++;
        emit DoctorRegistered(msg.sender, _specialization);
    }
    
    function approveDoctor(address _doctor) external onlyAdmin {
        if (users[_doctor].role != Role.Doctor) revert NotDoctor();
        approvedDoctors[_doctor] = true;
        emit DoctorApproved(_doctor);
    }
    
    function bookAppointment(address _doctor) external payable onlyPatient nonReentrant returns (uint256) {
        if (!approvedDoctors[_doctor]) revert DoctorNotApproved();
        if (msg.value != appointmentFee) revert InsufficientPayment(appointmentFee, msg.value);
        
        uint256 appointmentId = appointmentCounter++;
        
        appointments[appointmentId] = Appointment({
            patient: msg.sender,
            doctor: _doctor,
            date: block.timestamp,
            fee: appointmentFee,
            completed: false
        });
        
        distributePayment(_doctor, appointmentFee);
        
        emit AppointmentBooked(appointmentId, msg.sender, _doctor);
        return appointmentId;
    }
    
    function storeMedicalRecordHash(string calldata _cid) external onlyPatient {
        patientRecords[msg.sender].push(_cid);
        emit MedicalRecordStored(msg.sender, _cid);
    }
    
    function getMedicalRecords(address _patient) external view returns (string[] memory) {
        require(
            msg.sender == _patient || 
            (users[msg.sender].role == Role.Doctor && approvedDoctors[msg.sender]),
            "Not authorized"
        );
        return patientRecords[_patient];
    }
    
    function distributePayment(address _doctor, uint256 _amount) private {
        uint256 doctorShare = (_amount * 90) / 100;
        uint256 adminShare = _amount - doctorShare;
        
        (bool successDoctor, ) = _doctor.call{value: doctorShare}("");
        (bool successAdmin, ) = owner().call{value: adminShare}("");
        
        require(successDoctor && successAdmin, "Payment failed");
    }
    
    function uint2str(uint256 _i) private pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}