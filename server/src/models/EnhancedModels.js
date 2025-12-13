// Enhanced Two-Tier Pricing System Models
// Exports all models for the enhanced pricing system

const EnhancedDoctorServiceFees = require('./EnhancedDoctorServiceFees');
const EnhancedPaymentTransaction = require('./EnhancedPaymentTransaction');
const PricingAuditLog = require('./PricingAuditLog');
const MarketRateAnalytics = require('./MarketRateAnalytics');
const DoctorWalletConfig = require('./DoctorWalletConfig');

// Define associations between models
const defineAssociations = () => {
  // EnhancedDoctorServiceFees associations
  EnhancedDoctorServiceFees.belongsTo(require('./User'), {
    foreignKey: 'doctor_id',
    as: 'Doctor'
  });

  // EnhancedPaymentTransaction associations
  EnhancedPaymentTransaction.belongsTo(require('./User'), {
    foreignKey: 'patient_id',
    as: 'Patient'
  });
  
  EnhancedPaymentTransaction.belongsTo(require('./User'), {
    foreignKey: 'doctor_id',
    as: 'Doctor'
  });

  EnhancedPaymentTransaction.belongsTo(require('./Appointment'), {
    foreignKey: 'appointment_id',
    as: 'Appointment'
  });

  // PricingAuditLog associations
  PricingAuditLog.belongsTo(require('./User'), {
    foreignKey: 'doctor_id',
    as: 'Doctor'
  });

  PricingAuditLog.belongsTo(require('./User'), {
    foreignKey: 'changed_by',
    as: 'ChangedBy'
  });

  // DoctorWalletConfig associations
  DoctorWalletConfig.belongsTo(require('./User'), {
    foreignKey: 'doctor_id',
    as: 'Doctor'
  });

  // Reverse associations
  require('./User').hasMany(EnhancedDoctorServiceFees, {
    foreignKey: 'doctor_id',
    as: 'ServiceFees'
  });

  require('./User').hasMany(EnhancedPaymentTransaction, {
    foreignKey: 'doctor_id',
    as: 'DoctorTransactions'
  });

  require('./User').hasMany(EnhancedPaymentTransaction, {
    foreignKey: 'patient_id',
    as: 'PatientTransactions'
  });

  require('./User').hasOne(DoctorWalletConfig, {
    foreignKey: 'doctor_id',
    as: 'WalletConfig'
  });

  require('./Appointment').hasMany(EnhancedPaymentTransaction, {
    foreignKey: 'appointment_id',
    as: 'PaymentTransactions'
  });
};

// Initialize all models and associations
const initializeEnhancedModels = async () => {
  try {
    // Define associations
    defineAssociations();

    // Sync models (create tables if they don't exist)
    // Note: In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      await EnhancedDoctorServiceFees.sync({ alter: false });
      await EnhancedPaymentTransaction.sync({ alter: false });
      await PricingAuditLog.sync({ alter: false });
      await MarketRateAnalytics.sync({ alter: false });
      await DoctorWalletConfig.sync({ alter: false });
    }

    console.log('Enhanced pricing models initialized successfully');
  } catch (error) {
    console.error('Error initializing enhanced models:', error);
    throw error;
  }
};

module.exports = {
  EnhancedDoctorServiceFees,
  EnhancedPaymentTransaction,
  PricingAuditLog,
  MarketRateAnalytics,
  DoctorWalletConfig,
  defineAssociations,
  initializeEnhancedModels
};