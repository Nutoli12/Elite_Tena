import { DataTypes } from 'sequelize';

const LabResult = (sequelize) => {
  const LabResult = sequelize.define('LabResult', {
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
      allowNull: true,
      comment: 'Doctor who ordered the test'
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    testName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    results: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Lab workflow fields
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      comment: 'pending, in_progress, completed, cancelled'
    },
    orderedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'routine',
      comment: 'routine, urgent, stat'
    },
    instructions: {
      type: DataTypes.TEXT,
      comment: 'Special instructions (e.g., fasting required)'
    },
    reason: {
      type: DataTypes.TEXT,
      comment: 'Reason for ordering test'
    },
    sampleId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    collectedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    collectedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    normalRange: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true
    },
    interpretation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array of file URLs/IPFS hashes'
    },
    // IPFS integration
    ipfsHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IPFS hash for lab result data'
    },
    // Blockchain integration fields
    blockchainTxHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain transaction hash'
    },
    blockchainLabResultId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain-generated lab result ID'
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
      comment: 'Whether this lab result is stored on blockchain'
    }
  }, {
    tableName: 'lab_results',
    timestamps: true
  });

  LabResult.associate = function(models) {
    LabResult.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patient'
    });
  };

  return LabResult;
};

export default LabResult;
