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
    testType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    results: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    },
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'lab_results',
    timestamps: true
  });

  return LabResult;
};

export default LabResult;
