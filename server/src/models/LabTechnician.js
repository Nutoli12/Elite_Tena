import { DataTypes } from 'sequelize';

const LabTechnician = (sequelize) => {
  const LabTechnician = sequelize.define('LabTechnician', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'walletAddress'
      }
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    specialization: {
      type: DataTypes.STRING
    },
    department: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'lab_technicians',
    timestamps: true
  });

  return LabTechnician;
};

export default LabTechnician;
