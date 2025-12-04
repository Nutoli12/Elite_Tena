import { DataTypes } from 'sequelize';

const Session = (sequelize) => {
  const SessionModel = sequelize.define('Session', {
    sid: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    expires: {
      type: DataTypes.DATE
    },
    data: {
      type: DataTypes.TEXT
    },
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'sessions',
    timestamps: true
  });

  return SessionModel;
};

export default Session;
