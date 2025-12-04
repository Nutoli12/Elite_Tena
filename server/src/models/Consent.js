import { DataTypes } from 'sequelize';

const Consent = (sequelize) => {
  const ConsentModel = sequelize.define('Consent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'walletAddress'
      }
    },
    doctorWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    consentType: {
      type: DataTypes.ENUM('medical_records', 'treatment', 'research', 'billing', 'emergency'),
      allowNull: false
    },
    scope: {
      type: DataTypes.JSONB,  // What data/actions are consented to
      allowNull: false
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    blockchainTxHash: {
      type: DataTypes.STRING,  // Transaction hash when recorded on-chain
      allowNull: true
    },
    revocationTxHash: {
      type: DataTypes.STRING,  // Transaction hash when revoked
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'consents',
    timestamps: true
  });

  ConsentModel.associate = function(models) {
    ConsentModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patient'
    });
    ConsentModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctor'
    });
  };

  return ConsentModel;
};

export default Consent;