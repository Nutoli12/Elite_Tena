export default (sequelize, DataTypes) => {
  const Pharmacist = sequelize.define('Pharmacist', {
    walletAddress: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      set(value) {
        // Always store wallet addresses in lowercase
        this.setDataValue('walletAddress', value ? value.toLowerCase() : value);
      }
    },
    pharmacyName: DataTypes.STRING,
    licenseNumber: DataTypes.STRING,
    phone: DataTypes.STRING,
    address: DataTypes.TEXT
  }, {
    tableName: 'pharmacists'
  });

  return Pharmacist;
};
