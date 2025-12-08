import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database configuration
const configPath = join(__dirname, '../../config/config.json');
const configData = await readFile(configPath, 'utf8');
const dbConfig = JSON.parse(configData);

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Initialize Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Import model functions - ALL USING DEFAULT IMPORTS
import User from './User.js';
import Session from './Session.js';
import FileMetadata from './FileMetadata.js';
import Appointment from './Appointment.js';
import Payment from './Payment.js';
import Patient from './Patient.js';
import Doctor from './Doctor.js';
import MedicalRecord from './MedicalRecord.js';
import Prescription from './Prescription.js';
import LabResult from './LabResult.js';
import Consent from './Consent.js';
import LabTechnician from './LabTechnician.js';
import Pharmacist from './Pharmacist.js';
import FollowUp from './FollowUp.js';
import Notification from './Notification.js';
import DoctorPaymentSettings from './DoctorPaymentSettings.js';
import Message from './Message.js';
import VideoCall from './VideoCall.js';

// Initialize models with sequelize instance
const db = {
  sequelize,
  Sequelize,
  User: User(sequelize, Sequelize.DataTypes),
  Session: Session(sequelize, Sequelize.DataTypes),
  FileMetadata: FileMetadata(sequelize, Sequelize.DataTypes),
  Appointment: Appointment(sequelize, Sequelize.DataTypes),
  Payment: Payment(sequelize, Sequelize.DataTypes),
  Patient: Patient(sequelize, Sequelize.DataTypes),
  Doctor: Doctor(sequelize, Sequelize.DataTypes),
  MedicalRecord: MedicalRecord(sequelize, Sequelize.DataTypes),
  Prescription: Prescription(sequelize, Sequelize.DataTypes),
  LabResult: LabResult(sequelize, Sequelize.DataTypes),
  Consent: Consent(sequelize, Sequelize.DataTypes),
  LabTechnician: LabTechnician(sequelize, Sequelize.DataTypes),
  Pharmacist: Pharmacist(sequelize, Sequelize.DataTypes),
  FollowUp: FollowUp(sequelize, Sequelize.DataTypes),
  Notification: Notification(sequelize, Sequelize.DataTypes),
  DoctorPaymentSettings: DoctorPaymentSettings(sequelize, Sequelize.DataTypes),
  Message: Message(sequelize, Sequelize.DataTypes),
  VideoCall: VideoCall(sequelize, Sequelize.DataTypes)
};

// ... REST OF YOUR ASSOCIATIONS CODE REMAINS EXACTLY THE SAME ...

/**
 * Initialize all database model associations
 */
const initializeAssociations = () => {
  try {
    console.log('��� Initializing database associations...');

    // User -> Session (One-to-Many)
    db.User.hasMany(db.Session, {
      foreignKey: 'walletAddress',
      sourceKey: 'walletAddress',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Session.belongsTo(db.User, {
      foreignKey: 'walletAddress',
      targetKey: 'walletAddress'
    });

    // User -> FileMetadata (One-to-Many)
    db.User.hasMany(db.FileMetadata, {
      foreignKey: 'walletAddress',
      sourceKey: 'walletAddress',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.FileMetadata.belongsTo(db.User, {
      foreignKey: 'walletAddress',
      targetKey: 'walletAddress'
    });

    // User -> Appointment relationships
    db.User.hasMany(db.Appointment, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'patientAppointments',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Appointment.belongsTo(db.User, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    db.User.hasMany(db.Appointment, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'doctorAppointments',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.Appointment.belongsTo(db.User, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // NEW HEALTHCARE ASSOCIATIONS

    // User -> Patient/Doctor (One-to-One)
    db.User.hasOne(db.Patient, {
      foreignKey: 'walletAddress',
      sourceKey: 'walletAddress',
      as: 'patientProfile',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Patient.belongsTo(db.User, {
      foreignKey: 'walletAddress',
      targetKey: 'walletAddress',
      as: 'user'
    });

    db.User.hasOne(db.Doctor, {
      foreignKey: 'walletAddress',
      sourceKey: 'walletAddress',
      as: 'doctorProfile',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Doctor.belongsTo(db.User, {
      foreignKey: 'walletAddress',
      targetKey: 'walletAddress',
      as: 'user'
    });

    // Patient -> Medical Records (One-to-Many)
    db.Patient.hasMany(db.MedicalRecord, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'medicalRecords',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.MedicalRecord.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    // Doctor -> Medical Records (One-to-Many)
    db.Doctor.hasMany(db.MedicalRecord, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'createdRecords',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.MedicalRecord.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // Patient -> Appointments (One-to-Many)
    db.Patient.hasMany(db.Appointment, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'appointments',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Appointment.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patientDetails'
    });

    // Doctor -> Appointments (One-to-Many)
    db.Doctor.hasMany(db.Appointment, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'appointments',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.Appointment.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctorDetails'
    });

    // Patient -> Prescriptions (One-to-Many)
    db.Patient.hasMany(db.Prescription, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'prescriptions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Prescription.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    // Doctor -> Prescriptions (One-to-Many)
    db.Doctor.hasMany(db.Prescription, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'prescriptions',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.Prescription.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // Patient -> Lab Results (One-to-Many)
    db.Patient.hasMany(db.LabResult, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'labResults',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabResult.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    // Patient -> Consents (One-to-Many)
    db.Patient.hasMany(db.Consent, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'consents',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Consent.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    // Doctor -> Consents (One-to-Many)
    db.Doctor.hasMany(db.Consent, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'consents',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Consent.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // Appointment -> Payment (One-to-Many)
    db.Appointment.hasMany(db.Payment, {
      foreignKey: 'appointmentId',
      as: 'payments',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.Payment.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    // Appointment -> FollowUp (One-to-Many)
    db.Appointment.hasMany(db.FollowUp, {
      foreignKey: 'appointmentId',
      as: 'followUps',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.FollowUp.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    // Appointment -> Consent (One-to-Many)
    db.Appointment.hasMany(db.Consent, {
      foreignKey: 'appointmentId',
      as: 'consents',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.Consent.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    // 🔔 NEW: User -> Notifications (One-to-Many)
    db.User.hasMany(db.Notification, {
      foreignKey: 'userId',
      sourceKey: 'walletAddress',
      as: 'notifications',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Notification.belongsTo(db.User, {
      foreignKey: 'userId',
      targetKey: 'walletAddress',
      as: 'user'
    });

    // 💰 NEW: Doctor -> Payment Settings (One-to-One)
    db.Doctor.hasOne(db.DoctorPaymentSettings, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'paymentSettings',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.DoctorPaymentSettings.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // 💬 NEW: Message associations
    db.User.hasMany(db.Message, {
      foreignKey: 'senderWalletAddress',
      sourceKey: 'walletAddress',
      as: 'sentMessages',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Message.belongsTo(db.User, {
      foreignKey: 'senderWalletAddress',
      targetKey: 'walletAddress',
      as: 'sender'
    });

    db.User.hasMany(db.Message, {
      foreignKey: 'receiverWalletAddress',
      sourceKey: 'walletAddress',
      as: 'receivedMessages',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Message.belongsTo(db.User, {
      foreignKey: 'receiverWalletAddress',
      targetKey: 'walletAddress',
      as: 'receiver'
    });

    // 📹 NEW: VideoCall associations
    db.User.hasMany(db.VideoCall, {
      foreignKey: 'initiatorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'initiatedCalls',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.VideoCall.belongsTo(db.User, {
      foreignKey: 'initiatorWalletAddress',
      targetKey: 'walletAddress',
      as: 'initiator'
    });

    db.User.hasMany(db.VideoCall, {
      foreignKey: 'receiverWalletAddress',
      sourceKey: 'walletAddress',
      as: 'receivedCalls',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.VideoCall.belongsTo(db.User, {
      foreignKey: 'receiverWalletAddress',
      targetKey: 'walletAddress',
      as: 'receiver'
    });

    db.Appointment.hasMany(db.VideoCall, {
      foreignKey: 'appointmentId',
      as: 'videoCalls',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.VideoCall.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    console.log('✅ Database associations initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database associations:', error);
    throw error;
  }
};

// Initialize associations
initializeAssociations();

export default db;
