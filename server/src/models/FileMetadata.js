import { DataTypes } from 'sequelize';

const FileMetadata = (sequelize) => {
  const FileMetadataModel = sequelize.define('FileMetadata', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ipfsHash: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'file_metadata',
    timestamps: true
  });

  return FileMetadataModel;
};

export default FileMetadata;
