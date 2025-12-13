import { DataTypes } from 'sequelize';

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
      unique: true
    },
    
    // Telebirr settings
    telebirrEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    telebirrNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telebirrName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // CBE Birr settings
    cbeBirrEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    cbeBirrAccount: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cbeBirrName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cbeBirrBank: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cbeBirrBranch: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Bank transfer settings
    bankTransferEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankAccountName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankBranch: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Cash settings
    cashEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Service fees
    videoCallFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 50.00
    },
    chatFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 30.00
    },
    
    // Payment instructions
    defaultPaymentInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Auto-approval settings
    autoApproveVideoCall: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autoApproveChat: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'doctor_payment_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['doctorWalletAddress']
      }
    ]
  });

  DoctorPaymentSettingsModel.associate = function (models) {
    DoctorPaymentSettingsModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
  };

  return DoctorPaymentSettingsModel;
};

export default DoctorPaymentSettings;
