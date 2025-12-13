export default (sequelize, DataTypes) => {
  const Doctor = sequelize.define('Doctor', {
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
      comment: 'Doctor display name'
    },
    specialty: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Medical specialty (alias for specialization)'
    },
    specialization: DataTypes.STRING,
    licenseNumber: DataTypes.STRING,
    hospital: DataTypes.STRING,
    yearsOfExperience: DataTypes.INTEGER,
    
    // 🆕 PHASE 2: Enhanced fields for doctor selection
    department: {
      type: DataTypes.STRING,
      defaultValue: 'General Practice',
      comment: 'Medical department: Cardiology, Dermatology, Pediatrics, etc.'
    },
    availableServices: {
      type: DataTypes.JSON,
      defaultValue: {
        inPerson: { available: true, fee: 0 },
        videoCall: { available: false, fee: 0 },
        chat: { available: false, fee: 0 }
      },
      comment: 'Available consultation types and fees'
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Is doctor currently available for appointments'
    },
    isAcceptingPatients: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Is doctor accepting new patients'
    },
    consultationFee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Default consultation fee in Birr'
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Average rating from patient reviews'
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total number of reviews'
    },
    bio: {
      type: DataTypes.TEXT,
      comment: 'Doctor biography and qualifications'
    },
    education: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Educational background and certifications'
    },
    languages: {
      type: DataTypes.JSON,
      defaultValue: ['English', 'Amharic'],
      comment: 'Languages spoken by doctor'
    }
  }, {
    tableName: 'doctors'
  });

  Doctor.associate = function(models) {
    Doctor.belongsTo(models.User, {
      foreignKey: 'walletAddress',
      as: 'user'
    });
  };

  return Doctor;
};
