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
