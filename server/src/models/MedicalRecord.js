import { DataTypes } from 'sequelize';

const MedicalRecord = (sequelize) => {
  const MedicalRecordModel = sequelize.define('MedicalRecord', {
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
    recordType: {
      type: DataTypes.ENUM('consultation', 'lab_result', 'prescription', 'imaging', 'surgery', 'vaccination'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    symptoms: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    ipfsHash: {
      type: DataTypes.STRING,  // Stored on blockchain
      allowNull: true
    },
    fileUrl: {
      type: DataTypes.STRING,  // Encrypted file on IPFS
      allowNull: true
    },
    visitDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'medical_records',
    timestamps: true
  });

  MedicalRecordModel.associate = function(models) {
    MedicalRecordModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patient'
    });
    MedicalRecordModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctor'
    });
  };

  return MedicalRecordModel;
};

export default MedicalRecord;