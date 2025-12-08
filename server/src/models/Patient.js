export default (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    walletAddress: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      set(value) {
        // Always store wallet addresses in lowercase
        this.setDataValue('walletAddress', value ? value.toLowerCase() : value);
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Patient display name'
    },
    dateOfBirth: DataTypes.DATE,
    bloodType: DataTypes.STRING,
    emergencyContact: DataTypes.JSONB,
    medicalHistory: DataTypes.TEXT,
    allergies: DataTypes.ARRAY(DataTypes.STRING),
    currentMedications: DataTypes.ARRAY(DataTypes.STRING),
    insuranceInfo: DataTypes.JSONB
  }, {
    tableName: 'patients'
  });

  return Patient;
};
