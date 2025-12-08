export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    walletAddress: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      set(value) {
        // Always store wallet addresses in lowercase
        this.setDataValue('walletAddress', value ? value.toLowerCase() : value);
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'patient'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    profileData: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'users'
  });

  return User;
};
