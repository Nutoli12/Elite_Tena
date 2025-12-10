import { DataTypes } from 'sequelize';

const PrescriptionAccessGrant = (sequelize) => {
  const PrescriptionAccessGrantModel = sequelize.define('PrescriptionAccessGrant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Core References
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'prescription_id',
      references: {
        model: 'prescriptions',
        key: 'id'
      }
    },
    patientWalletAddress: {
      type: DataTypes.STRING(42),
      allowNull: false,
      field: 'patient_wallet_address'
    },
    pharmacistWalletAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      field: 'pharmacist_wallet_address'
    },
    pharmacyName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'pharmacy_name'
    },
    
    // Access Control
    accessMethod: {
      type: DataTypes.ENUM('quick_approve', 'manual_grant', 'qr_code', 'emergency'),
      allowNull: false,
      field: 'access_method'
    },
    status: {
      type: DataTypes.ENUM('active', 'used', 'expired', 'revoked'),
      defaultValue: 'active',
      allowNull: false
    },
    
    // Timing
    grantedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'granted_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at'
    },
    
    // QR Code Specific
    qrCodeToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'qr_code_token'
    },
    qrCodeValidityHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'qr_code_validity_hours'
    },
    qrCodeGeneratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'qr_code_generated_at'
    },
    qrCodeScannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'qr_code_scanned_at'
    },
    qrCodeRegenerationCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'qr_code_regeneration_count'
    },
    
    // Emergency Override
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_emergency'
    },
    emergencyReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'emergency_reason'
    },
    emergencyConfirmedByPatient: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'emergency_confirmed_by_patient'
    },
    emergencyConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'emergency_confirmed_at'
    },
    
    // Audit
    patientNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'patient_note'
    },
    pharmacistNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pharmacist_note'
    }
  }, {
    tableName: 'prescription_access_grants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  PrescriptionAccessGrantModel.associate = function (models) {
    PrescriptionAccessGrantModel.belongsTo(models.Prescription, {
      foreignKey: 'prescriptionId',
      as: 'prescription'
    });
    
    PrescriptionAccessGrantModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });
    
    PrescriptionAccessGrantModel.belongsTo(models.Pharmacist, {
      foreignKey: 'pharmacistWalletAddress',
      targetKey: 'walletAddress',
      as: 'pharmacist'
    });
  };

  return PrescriptionAccessGrantModel;
};

export default PrescriptionAccessGrant;
