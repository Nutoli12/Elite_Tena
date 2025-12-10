import { DataTypes } from 'sequelize';

const Prescription = (sequelize) => {
  const PrescriptionModel = sequelize.define('Prescription', {
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
    medicationName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dosage: {
      type: DataTypes.STRING,  // "500mg", "10ml", etc.
      allowNull: false
    },
    frequency: {
      type: DataTypes.STRING,  // "Once daily", "Every 6 hours", etc.
      allowNull: false
    },
    duration: {
      type: DataTypes.STRING,  // "7 days", "Until finished", etc.
      allowNull: false
    },
    instructions: {
      type: DataTypes.TEXT,  // "Take with food", "Avoid alcohol", etc.
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,  // Number of pills, bottles, etc.
      allowNull: false
    },
    refills: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isFilled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    pharmacyNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Pharmacy workflow fields
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      comment: 'active, dispensed, expired, cancelled'
    },
    dispensedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Pharmacist wallet address'
    },
    dispensedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dispensedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dispensingNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    batchNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    medicationExpiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // IPFS integration
    ipfsHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IPFS hash for prescription data'
    },
    // Blockchain integration fields
    blockchainTxHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain transaction hash'
    },
    blockchainPrescriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain-generated prescription ID'
    },
    blockNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Block number where transaction was mined'
    },
    gasUsed: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Gas used for blockchain transaction'
    },
    onBlockchain: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this prescription is stored on blockchain'
    }
  }, {
    tableName: 'prescriptions',
    timestamps: true
  });

  PrescriptionModel.associate = function(models) {
    PrescriptionModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patient'
    });
    PrescriptionModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctor'
    });
  };

  return PrescriptionModel;
};

export default Prescription;
