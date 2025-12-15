import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class Message extends Model {
        static associate(models) {
            Message.belongsTo(models.User, { as: 'sender', foreignKey: 'senderWallet' });
            Message.belongsTo(models.User, { as: 'receiver', foreignKey: 'receiverWallet' });
            Message.belongsTo(models.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
        }
    }

    Message.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        senderWallet: {
            type: DataTypes.STRING,
            allowNull: false
        },
        receiverWallet: {
            type: DataTypes.STRING,
            allowNull: false
        },
        appointmentId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('text', 'image', 'file', 'video', 'audio', 'system'),
            defaultValue: 'text'
        },
        read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'read_at' // Map to snake_case column
        },
        fileUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'file_url', // Map to snake_case column
            comment: 'URL for file attachments (IPFS or server)'
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'file_name', // Map to snake_case column
            comment: 'Original filename for attachments'
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'file_size', // Map to snake_case column
            comment: 'File size in bytes'
        },
        fileMimeType: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'file_mime_type', // Map to snake_case column
            comment: 'MIME type of the file'
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Additional metadata (reply-to, reactions, etc.)'
        }
    }, {
        sequelize,
        modelName: 'Message',
        tableName: 'messages',
        underscored: false, // Database uses camelCase columns
        indexes: [
            {
                fields: ['appointmentId']
            },
            {
                fields: ['senderWallet', 'receiverWallet']
            }
        ]
    });

    return Message;
};
