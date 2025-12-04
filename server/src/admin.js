import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSSequelize from '@adminjs/sequelize';
import session from 'express-session';
import db from './models/index.js';

const { 
  User, Patient, Doctor, Pharmacist, LabTechnician,
  Appointment, MedicalRecord, Prescription, LabResult,
  Consent, Payment, Session: SessionModel, FileMetadata
} = db;

// Register the Sequelize adapter
AdminJS.registerAdapter(AdminJSSequelize);

// Enhanced AdminJS configuration with ALL models
const admin = new AdminJS({
  databases: [db.sequelize],
  resources: [
    // ========== USER MANAGEMENT ==========
    {
      resource: User,
      options: {
        navigation: {
          name: '👥 User Management',
          icon: 'User',
        },
        listProperties: ['walletAddress', 'email', 'role', 'isActive', 'createdAt'],
        showProperties: ['walletAddress', 'email', 'role', 'isActive', 'profileData', 'createdAt', 'updatedAt'],
        editProperties: ['email', 'role', 'isActive', 'profileData'],
        filterProperties: ['email', 'role', 'isActive', 'walletAddress'],
        actions: {
          list: { isAccessible: true },
          show: { isAccessible: true },
          edit: { isAccessible: true },
          delete: { isAccessible: true },
          new: { isAccessible: false }, // Use custom admin panel for registration
        },
      }
    },
    {
      resource: SessionModel,
      options: {
        navigation: {
          name: '👥 User Management',
          icon: 'Clock',
        },
        listProperties: ['id', 'walletAddress', 'role', 'expiresAt', 'createdAt'],
        showProperties: ['id', 'walletAddress', 'role', 'expiresAt', 'createdAt', 'updatedAt'],
        filterProperties: ['walletAddress', 'role'],
        actions: {
          new: { isAccessible: false },
          edit: { isAccessible: false },
        },
      }
    },

    // ========== HEALTHCARE ACTORS ==========
    {
      resource: Patient,
      options: {
        navigation: {
          name: '🏥 Healthcare Actors',
          icon: 'Heart',
        },
        listProperties: ['walletAddress', 'createdAt'],
        showProperties: ['walletAddress', 'createdAt', 'updatedAt'],
      }
    },
    {
      resource: Doctor,
      options: {
        navigation: {
          name: '🏥 Healthcare Actors',
          icon: 'Stethoscope',
        },
        listProperties: ['walletAddress', 'specialization', 'licenseNumber', 'createdAt'],
        showProperties: ['walletAddress', 'specialization', 'licenseNumber', 'createdAt', 'updatedAt'],
        editProperties: ['specialization', 'licenseNumber'],
      }
    },
    {
      resource: LabTechnician,
      options: {
        navigation: {
          name: '🏥 Healthcare Actors',
          icon: 'FlaskConical',
        },
        listProperties: ['walletAddress', 'createdAt'],
        showProperties: ['walletAddress', 'createdAt', 'updatedAt'],
      }
    },
    {
      resource: Pharmacist,
      options: {
        navigation: {
          name: '🏥 Healthcare Actors',
          icon: 'Pill',
        },
        listProperties: ['walletAddress', 'licenseNumber', 'createdAt'],
        showProperties: ['walletAddress', 'licenseNumber', 'createdAt', 'updatedAt'],
        editProperties: ['licenseNumber'],
      }
    },

    // ========== MEDICAL DATA ==========
    {
      resource: MedicalRecord,
      options: {
        navigation: {
          name: '📋 Medical Data',
          icon: 'FileText',
        },
        listProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'recordType', 'createdAt'],
        showProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'recordType', 'diagnosis', 'treatment', 'notes', 'ipfsHash', 'createdAt'],
        editProperties: ['diagnosis', 'treatment', 'notes'],
        filterProperties: ['patientWalletAddress', 'doctorWalletAddress', 'recordType'],
      }
    },
    {
      resource: Prescription,
      options: {
        navigation: {
          name: '📋 Medical Data',
          icon: 'Pill',
        },
        listProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'medication', 'status', 'createdAt'],
        showProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'medication', 'dosage', 'frequency', 'duration', 'status', 'notes', 'createdAt'],
        editProperties: ['status', 'notes'],
        filterProperties: ['patientWalletAddress', 'doctorWalletAddress', 'status'],
      }
    },
    {
      resource: LabResult,
      options: {
        navigation: {
          name: '📋 Medical Data',
          icon: 'FlaskConical',
        },
        listProperties: ['id', 'patientWalletAddress', 'testType', 'status', 'createdAt'],
        showProperties: ['id', 'patientWalletAddress', 'testType', 'result', 'status', 'notes', 'ipfsHash', 'createdAt'],
        editProperties: ['result', 'status', 'notes'],
        filterProperties: ['patientWalletAddress', 'testType', 'status'],
      }
    },
    {
      resource: Consent,
      options: {
        navigation: {
          name: '📋 Medical Data',
          icon: 'Shield',
        },
        listProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'consentType', 'status', 'createdAt'],
        showProperties: ['id', 'patientWalletAddress', 'doctorWalletAddress', 'consentType', 'status', 'expiresAt', 'createdAt'],
        editProperties: ['status', 'expiresAt'],
        filterProperties: ['patientWalletAddress', 'doctorWalletAddress', 'status'],
      }
    },

    // ========== APPOINTMENTS & PAYMENTS ==========
    {
      resource: Appointment,
      options: {
        navigation: {
          name: '📅 Operations',
          icon: 'Calendar',
        },
        listProperties: ['id', 'patientWallet', 'doctorWallet', 'appointmentDate', 'status', 'createdAt'],
        showProperties: ['id', 'patientWallet', 'doctorWallet', 'appointmentDate', 'status', 'reason', 'notes', 'createdAt'],
        editProperties: ['status', 'notes', 'appointmentDate'],
        filterProperties: ['status', 'patientWallet', 'doctorWallet'],
      }
    },
    {
      resource: Payment,
      options: {
        navigation: {
          name: '📅 Operations',
          icon: 'DollarSign',
        },
        listProperties: ['id', 'patientWallet', 'amount', 'status', 'createdAt'],
        showProperties: ['id', 'patientWallet', 'amount', 'currency', 'status', 'paymentMethod', 'transactionId', 'createdAt'],
        editProperties: ['status'],
        filterProperties: ['patientWallet', 'status', 'paymentMethod'],
        actions: {
          new: { isAccessible: false },
          delete: { isAccessible: false },
        },
      }
    },

    // ========== FILE STORAGE ==========
    {
      resource: FileMetadata,
      options: {
        navigation: {
          name: '💾 File Storage',
          icon: 'Database',
        },
        listProperties: ['id', 'walletAddress', 'originalFilename', 'fileType', 'fileSize', 'createdAt'],
        showProperties: ['id', 'cid', 'walletAddress', 'originalFilename', 'fileType', 'fileSize', 'ipfsUrl', 'createdAt'],
        filterProperties: ['walletAddress', 'fileType'],
        actions: {
          new: { isAccessible: false },
          edit: { isAccessible: false },
        },
      }
    }
  ],
  rootPath: '/admin',
  branding: {
    companyName: '🏥 Elite Tena Healthcare Admin',
    logo: false,
    softwareBrothers: false,
    withMadeWithLove: false,
    theme: {
      colors: {
        primary100: '#0ea5e9',
        primary80: '#38bdf8',
        primary60: '#7dd3fc',
        primary40: '#bae6fd',
        primary20: '#e0f2fe',
        accent: '#6366f1',
        love: '#ef4444',
        error: '#dc2626',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6',
        grey100: '#1f2937',
        grey80: '#374151',
        grey60: '#6b7280',
        grey40: '#9ca3af',
        grey20: '#e5e7eb',
        filterBg: '#f9fafb',
        hoverBg: '#f3f4f6',
        bg: '#ffffff',
        inputBorder: '#d1d5db',
        separator: '#e5e7eb',
        highlight: '#fef3c7',
        selected: '#dbeafe',
        white: '#ffffff',
      },
      font: 'Inter, system-ui, -apple-system, sans-serif',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }
  },
  locale: {
    language: 'en',
    translations: {
      en: {
        messages: {
          loginWelcome: 'Welcome to Elite Tena Healthcare Admin Panel',
        },
        labels: {
          loginWelcome: 'Elite Tena Admin',
        },
      },
    },
  },
});

// Authentication configuration
const authenticate = async (email, password) => {
  const ADMIN_EMAIL = process.env.ADMINJS_EMAIL || 'admin@elitetena.com';
  const ADMIN_PASSWORD = process.env.ADMINJS_PASSWORD || 'admin123';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return { 
      email: ADMIN_EMAIL, 
      role: 'admin',
      title: 'System Administrator'
    };
  }
  return null;
};

// Build authenticated router
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate,
    cookieName: 'adminjs',
    cookiePassword: process.env.ADMINJS_COOKIE_SECRET || 'elite-tena-admin-secret-key-change-in-production',
  },
  null,
  {
    secret: process.env.SESSION_SECRET || 'elite-tena-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }
);

console.log('✅ AdminJS configured at /admin');
console.log('📊 Resources configured:');
console.log('   👥 User Management: User, Session');
console.log('   🏥 Healthcare Actors: Patient, Doctor, Lab Technician, Pharmacist');
console.log('   📋 Medical Data: Medical Records, Prescriptions, Lab Results, Consents');
console.log('   📅 Operations: Appointments, Payments');
console.log('   💾 File Storage: File Metadata');
console.log('📧 AdminJS Email:', process.env.ADMINJS_EMAIL || 'admin@elitetena.com');
console.log('🔑 AdminJS Password:', process.env.ADMINJS_PASSWORD || 'admin123');

export { admin, adminRouter };
