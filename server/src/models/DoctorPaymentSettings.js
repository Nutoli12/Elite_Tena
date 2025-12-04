import { DataTypes } from 'sequelize';

/**
 * 💰 DOCTOR PAYMENT SETTINGS MODEL
 * Stores doctor's payment details for peer-to-peer payments
 * System DOES NOT process payments - only stores details for patient reference
 */
const DoctorPaymentSettings = (sequelize) => {
  const DoctorPaymentSettingsModel = sequelize.define('DoctorPaymentSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    doctorWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    
    // Telebirr Payment Details
    telebirrEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether doctor accepts Telebirr'
    },
    telebirrNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Doctor Telebirr phone number'
    },
    telebirrName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Name registered on Telebirr'
    },
    
    // CBE Birr Payment Details
    cbeBirrEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether doctor accepts CBE Birr'
    },
    cbeBirrAccount: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'CBE Birr account number'
    },
    cbeBirrName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Name on CBE account'
    },
    cbeBirrBank: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank name (e.g., Commercial Bank of Ethiopia)'
    },
    cbeBirrBranch: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank branch'
    },
    
    // Bank Transfer Details
    bankTransferEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether doctor accepts bank transfer'
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank name for transfers'
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank account number'
    },
    bankAccountName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Account holder name'
    },
    bankBranch: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Bank branch'
    },
    
    // Cash Payment
    cashEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether doctor accepts cash payment'
    },
    
    // Service Pricing
    videoCallFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Fee for video call consultation (ETB)'
    },
    chatFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Fee for chat consultation (ETB)'
    },
    
    // Default Instructions
    defaultPaymentInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Default instructions sent to patients'
    },
    
    // Auto-approval settings
    autoApproveVideoCall: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Auto-approve video call requests'
    },
    autoApproveChat: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Auto-approve chat requests'
    }
  }, {
    tableName: 'doctor_payment_settings',
    timestamps: true
  });

  DoctorPaymentSettingsModel.associate = function(models) {
    DoctorPaymentSettingsModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctor'
    });
  };

  return DoctorPaymentSettingsModel;
};

export default DoctorPaymentSettings;
