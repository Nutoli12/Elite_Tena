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
import PrescriptionAccessGrant from './PrescriptionAccessGrant.js';
import TimeSlot from './TimeSlot.js';
import DoctorAvailabilityTemplate from './DoctorAvailabilityTemplate.js';
import PatientQueue from './PatientQueue.js';
import QueueEntry from './QueueEntry.js';
import ConsultationSession from './ConsultationSession.js';
import AppointmentConsent from './AppointmentConsent.js';
import EnhancedAppointment from './EnhancedAppointment.js';
import DoctorServicePricing from './DoctorServicePricing.js';
// Premium Consultation System
import PremiumConsultation from './PremiumConsultation.js';
import ConsultationMessage from './ConsultationMessage.js';
import VideoCallSession from './VideoCallSession.js';
import ConsultationAvailability from './ConsultationAvailability.js';
// Lab Workflow System
import LabOrder from './LabOrder.js';
import LabTestCatalog from './LabTestCatalog.js';
import LabAccessLog from './LabAccessLog.js';
// Lab Worksheet System
import LabWorksheet from './LabWorksheet.js';
import SampleCollection from './SampleCollection.js';
import ProcessingRecord from './ProcessingRecord.js';

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
  VideoCall: VideoCall(sequelize, Sequelize.DataTypes),
  PrescriptionAccessGrant: PrescriptionAccessGrant(sequelize, Sequelize.DataTypes),
  TimeSlot: TimeSlot(sequelize, Sequelize.DataTypes),
  DoctorAvailabilityTemplate: DoctorAvailabilityTemplate(sequelize, Sequelize.DataTypes),
  PatientQueue: PatientQueue(sequelize, Sequelize.DataTypes),
  QueueEntry: QueueEntry(sequelize, Sequelize.DataTypes),
  ConsultationSession: ConsultationSession(sequelize, Sequelize.DataTypes),
  AppointmentConsent: AppointmentConsent(sequelize, Sequelize.DataTypes),
  EnhancedAppointment: EnhancedAppointment(sequelize, Sequelize.DataTypes),
  DoctorServicePricing: DoctorServicePricing(sequelize, Sequelize.DataTypes),
  // Premium Consultation System
  PremiumConsultation: PremiumConsultation(sequelize, Sequelize.DataTypes),
  ConsultationMessage: ConsultationMessage(sequelize, Sequelize.DataTypes),
  VideoCallSession: VideoCallSession(sequelize, Sequelize.DataTypes),
  ConsultationAvailability: ConsultationAvailability(sequelize, Sequelize.DataTypes),
  // Lab Workflow System
  LabWorkflowOrder: LabOrder(sequelize, Sequelize.DataTypes),
  LabWorkflowResult: LabResult(sequelize, Sequelize.DataTypes),
  LabWorkflowTestCatalog: LabTestCatalog(sequelize, Sequelize.DataTypes),
  LabWorkflowAccessLog: LabAccessLog(sequelize, Sequelize.DataTypes),
  // Lab Worksheet System
  LabWorksheet: LabWorksheet(sequelize, Sequelize.DataTypes),
  SampleCollection: SampleCollection(sequelize, Sequelize.DataTypes),
  ProcessingRecord: ProcessingRecord(sequelize, Sequelize.DataTypes)
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
      foreignKey: 'senderWallet',
      sourceKey: 'walletAddress',
      as: 'sentMessages',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Message.belongsTo(db.User, {
      foreignKey: 'senderWallet',
      targetKey: 'walletAddress',
      as: 'sender'
    });

    db.User.hasMany(db.Message, {
      foreignKey: 'receiverWallet',
      sourceKey: 'walletAddress',
      as: 'receivedMessages',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.Message.belongsTo(db.User, {
      foreignKey: 'receiverWallet',
      targetKey: 'walletAddress',
      as: 'receiver'
    });

    // 📹 NEW: VideoCall associations (FIXED column names)
    db.User.hasMany(db.VideoCall, {
      foreignKey: 'initiatorWallet',
      sourceKey: 'walletAddress',
      as: 'initiatedCalls',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.VideoCall.belongsTo(db.User, {
      foreignKey: 'initiatorWallet',
      targetKey: 'walletAddress',
      as: 'initiator'
    });

    db.User.hasMany(db.VideoCall, {
      foreignKey: 'receiverWallet',
      sourceKey: 'walletAddress',
      as: 'receivedCalls',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.VideoCall.belongsTo(db.User, {
      foreignKey: 'receiverWallet',
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

    // 🕐 NEW: TimeSlot associations
    db.Doctor.hasMany(db.TimeSlot, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'timeSlots',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.TimeSlot.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    db.Appointment.hasMany(db.TimeSlot, {
      foreignKey: 'appointmentId',
      as: 'timeSlots',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.TimeSlot.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    // 📅 NEW: DoctorAvailabilityTemplate associations
    db.Doctor.hasMany(db.DoctorAvailabilityTemplate, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'availabilityTemplates',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.DoctorAvailabilityTemplate.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    db.DoctorAvailabilityTemplate.hasMany(db.TimeSlot, {
      foreignKey: 'availabilityTemplateId',
      as: 'generatedSlots',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.TimeSlot.belongsTo(db.DoctorAvailabilityTemplate, {
      foreignKey: 'availabilityTemplateId',
      as: 'availabilityTemplate'
    });

    // 🏥 NEW: PatientQueue associations
    db.Doctor.hasMany(db.PatientQueue, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'patientQueues',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.PatientQueue.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    db.PatientQueue.hasMany(db.QueueEntry, {
      foreignKey: 'queueId',
      as: 'entries',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.QueueEntry.belongsTo(db.PatientQueue, {
      foreignKey: 'queueId',
      as: 'queue'
    });

    db.Appointment.hasOne(db.QueueEntry, {
      foreignKey: 'appointmentId',
      as: 'queueEntry',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.QueueEntry.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    // 🔐 NEW: AppointmentConsent associations
    db.Appointment.hasOne(db.AppointmentConsent, {
      foreignKey: 'appointmentId',
      as: 'appointmentConsent',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.AppointmentConsent.belongsTo(db.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });

    db.Consent.hasMany(db.AppointmentConsent, {
      foreignKey: 'consentId',
      as: 'appointmentConsents',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.AppointmentConsent.belongsTo(db.Consent, {
      foreignKey: 'consentId',
      as: 'generalConsent'
    });

    db.Patient.hasMany(db.AppointmentConsent, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'appointmentConsents',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.AppointmentConsent.belongsTo(db.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    db.Doctor.hasMany(db.AppointmentConsent, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'appointmentConsents',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.AppointmentConsent.belongsTo(db.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // 💬🎥 NEW: Premium Consultation associations
    db.User.hasMany(db.PremiumConsultation, {
      foreignKey: 'patientWallet',
      sourceKey: 'walletAddress',
      as: 'patientConsultations',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.PremiumConsultation.belongsTo(db.User, {
      foreignKey: 'patientWallet',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    db.User.hasMany(db.PremiumConsultation, {
      foreignKey: 'doctorWallet',
      sourceKey: 'walletAddress',
      as: 'doctorConsultations',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.PremiumConsultation.belongsTo(db.User, {
      foreignKey: 'doctorWallet',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    db.PremiumConsultation.hasMany(db.ConsultationMessage, {
      foreignKey: 'consultationId',
      as: 'messages',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.ConsultationMessage.belongsTo(db.PremiumConsultation, {
      foreignKey: 'consultationId',
      as: 'consultation'
    });

    // ConsultationMessage -> User (sender)
    db.ConsultationMessage.belongsTo(db.User, {
      foreignKey: 'senderWallet',
      targetKey: 'walletAddress',
      as: 'sender'
    });

    db.PremiumConsultation.hasMany(db.VideoCallSession, {
      foreignKey: 'consultationId',
      as: 'videoSessions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.VideoCallSession.belongsTo(db.PremiumConsultation, {
      foreignKey: 'consultationId',
      as: 'consultation'
    });

    db.User.hasMany(db.ConsultationAvailability, {
      foreignKey: 'doctorWallet',
      sourceKey: 'walletAddress',
      as: 'consultationAvailability',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.ConsultationAvailability.belongsTo(db.User, {
      foreignKey: 'doctorWallet',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // 🧪 LAB WORKFLOW ASSOCIATIONS

    // User -> Lab Orders (Patient & Doctor)
    db.User.hasMany(db.LabWorkflowOrder, {
      foreignKey: 'patientWalletAddress',
      sourceKey: 'walletAddress',
      as: 'patientLabWorkflowOrders',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowOrder.belongsTo(db.User, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });

    db.User.hasMany(db.LabWorkflowOrder, {
      foreignKey: 'doctorWalletAddress',
      sourceKey: 'walletAddress',
      as: 'doctorLabWorkflowOrders',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowOrder.belongsTo(db.User, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });

    // Lab Order -> Lab Results (One-to-Many)
    db.LabWorkflowOrder.hasMany(db.LabWorkflowResult, {
      foreignKey: 'labOrderId',
      as: 'labResults',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowResult.belongsTo(db.LabWorkflowOrder, {
      foreignKey: 'labOrderId',
      as: 'labOrder'
    });

    // User -> Lab Results (Technician)
    db.User.hasMany(db.LabWorkflowResult, {
      foreignKey: 'technicianWalletAddress',
      sourceKey: 'walletAddress',
      as: 'technicianLabWorkflowResults',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowResult.belongsTo(db.User, {
      foreignKey: 'technicianWalletAddress',
      targetKey: 'walletAddress',
      as: 'technician'
    });

    // Lab Result -> Medical Record Links (Many-to-Many through junction)
    db.LabWorkflowResult.belongsToMany(db.MedicalRecord, {
      through: 'medical_record_lab_workflow_links',
      foreignKey: 'lab_result_id',
      otherKey: 'medical_record_id',
      as: 'linkedMedicalRecords'
    });
    db.MedicalRecord.belongsToMany(db.LabWorkflowResult, {
      through: 'medical_record_lab_workflow_links',
      foreignKey: 'medical_record_id',
      otherKey: 'lab_result_id',
      as: 'linkedLabWorkflowResults'
    });

    // User -> Lab Access Logs (Audit Trail)
    db.User.hasMany(db.LabWorkflowAccessLog, {
      foreignKey: 'userWalletAddress',
      sourceKey: 'walletAddress',
      as: 'labWorkflowAccessLogs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowAccessLog.belongsTo(db.User, {
      foreignKey: 'userWalletAddress',
      targetKey: 'walletAddress',
      as: 'user'
    });

    // Lab Result -> Access Logs
    db.LabWorkflowResult.hasMany(db.LabWorkflowAccessLog, {
      foreignKey: 'labResultId',
      as: 'accessLogs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowAccessLog.belongsTo(db.LabWorkflowResult, {
      foreignKey: 'labResultId',
      as: 'labResult'
    });

    // Lab Order -> Access Logs
    db.LabWorkflowOrder.hasMany(db.LabWorkflowAccessLog, {
      foreignKey: 'labOrderId',
      as: 'accessLogs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorkflowAccessLog.belongsTo(db.LabWorkflowOrder, {
      foreignKey: 'labOrderId',
      as: 'labOrder'
    });

    // 🧪 LAB WORKSHEET SYSTEM ASSOCIATIONS

    // Lab Order -> Lab Worksheets (One-to-Many)
    db.LabWorkflowOrder.hasMany(db.LabWorksheet, {
      foreignKey: 'labOrderId',
      as: 'worksheets',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.LabWorksheet.belongsTo(db.LabWorkflowOrder, {
      foreignKey: 'labOrderId',
      as: 'labOrder'
    });

    // User -> Lab Worksheets (Technician)
    db.User.hasMany(db.LabWorksheet, {
      foreignKey: 'technicianId',
      sourceKey: 'walletAddress',
      as: 'assignedWorksheets',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.LabWorksheet.belongsTo(db.User, {
      foreignKey: 'technicianId',
      targetKey: 'walletAddress',
      as: 'technician'
    });

    // Lab Worksheet -> Sample Collections (One-to-Many)
    db.LabWorksheet.hasMany(db.SampleCollection, {
      foreignKey: 'worksheetId',
      as: 'sampleCollections',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.SampleCollection.belongsTo(db.LabWorksheet, {
      foreignKey: 'worksheetId',
      as: 'worksheet'
    });

    // Lab Worksheet -> Processing Records (One-to-Many)
    db.LabWorksheet.hasMany(db.ProcessingRecord, {
      foreignKey: 'worksheetId',
      as: 'processingRecords',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    db.ProcessingRecord.belongsTo(db.LabWorksheet, {
      foreignKey: 'worksheetId',
      as: 'worksheet'
    });

    // User -> Processing Records (Operator)
    db.User.hasMany(db.ProcessingRecord, {
      foreignKey: 'operatorId',
      sourceKey: 'walletAddress',
      as: 'operatedProcessing',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    db.ProcessingRecord.belongsTo(db.User, {
      foreignKey: 'operatorId',
      targetKey: 'walletAddress',
      as: 'operator'
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
