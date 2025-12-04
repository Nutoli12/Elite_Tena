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
    specialization: DataTypes.STRING,
    licenseNumber: DataTypes.STRING,
    hospital: DataTypes.STRING,
    yearsOfExperience: DataTypes.INTEGER
  }, {
    tableName: 'doctors'
  });

  return Doctor;
};
