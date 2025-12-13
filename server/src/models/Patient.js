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
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Patient gender (Male, Female)'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Patient phone number (Ethiopian format: +2519XXXXXXXX)'
    },
    bloodType: DataTypes.STRING,
    emergencyContact: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Emergency contact information'
    },
    location: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Patient location data (region, city)'
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        language: 'English',
        emailNotifications: true,
        smsNotifications: true
      },
      comment: 'Patient preferences (language, notifications)'
    },
    registrationDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'registration_date',
      comment: 'When the patient registered'
    },
    registrationMethod: {
      type: DataTypes.STRING,
      defaultValue: 'email',
      field: 'registration_method',
      comment: 'How the patient registered (email, wallet)'
    },
    medicalHistory: DataTypes.TEXT,
    allergies: DataTypes.ARRAY(DataTypes.STRING),
    currentMedications: DataTypes.ARRAY(DataTypes.STRING),
    insuranceInfo: DataTypes.JSONB
  }, {
    tableName: 'patients'
  });

  Patient.associate = function(models) {
    Patient.belongsTo(models.User, {
      foreignKey: 'walletAddress',
      as: 'user'
    });
  };

  return Patient;
};
