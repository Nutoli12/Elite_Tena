import { DataTypes } from 'sequelize';

/**
 * Processing Record Model
 * Records details of sample processing and analysis
 */
export default function(sequelize, DataTypes) {
  const ProcessingRecord = sequelize.define('ProcessingRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    worksheetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab_worksheets',
        key: 'id'
      },
      comment: 'Reference to the lab worksheet'
    },
    instrumentId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Instrument used for processing'
    },
    operatorId: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Wallet address of operator'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Processing start time'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Processing end time'
    },
    processingMethod: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Method used for processing'
    },
    instrumentSettings: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Instrument settings and parameters'
    },
    environmentalConditions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Environmental conditions during processing'
    },
    qualityControlResults: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Quality control check results'
    },
    calibrationData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Instrument calibration data'
    },
    processingStatus: {
      type: DataTypes.ENUM('started', 'in_progress', 'completed', 'failed', 'aborted'),
      defaultValue: 'started',
      comment: 'Current processing status'
    },
    errorLog: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error messages and troubleshooting log'
    },
    processingNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional processing notes'
    },
    rawDataPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to raw data files'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'processing_records',
    timestamps: true,
    indexes: [
      {
        fields: ['worksheetId']
      },
      {
        fields: ['instrumentId']
      },
      {
        fields: ['operatorId']
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['processingStatus']
      }
    ]
  });

  // Instance methods
  ProcessingRecord.prototype.completeProcessing = function(endTime, notes) {
    return this.update({
      endTime: endTime || new Date(),
      processingStatus: 'completed',
      processingNotes: notes ? `${this.processingNotes || ''}\n${notes}` : this.processingNotes
    });
  };

  ProcessingRecord.prototype.recordError = function(error, status = 'failed') {
    return this.update({
      processingStatus: status,
      errorLog: `${this.errorLog || ''}\n[${new Date().toISOString()}] ${error}`
    });
  };

  ProcessingRecord.prototype.updateQualityControl = function(qcResults) {
    const currentQC = this.qualityControlResults || {};
    return this.update({
      qualityControlResults: { ...currentQC, ...qcResults }
    });
  };

  // Static methods
  ProcessingRecord.getRecordsByWorksheet = async function(worksheetId) {
    return this.findAll({
      where: { worksheetId },
      order: [['startTime', 'ASC']]
    });
  };

  ProcessingRecord.getRecordsByInstrument = async function(instrumentId, options = {}) {
    const { startDate, endDate, status } = options;
    const where = { instrumentId };
    
    if (status) where.processingStatus = status;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[sequelize.Sequelize.Op.gte] = startDate;
      if (endDate) where.startTime[sequelize.Sequelize.Op.lte] = endDate;
    }

    return this.findAll({
      where,
      include: [
        {
          association: 'worksheet',
          include: ['labOrder']
        }
      ],
      order: [['startTime', 'DESC']]
    });
  };

  ProcessingRecord.getActiveProcessing = async function() {
    return this.findAll({
      where: {
        processingStatus: ['started', 'in_progress']
      },
      include: [
        {
          association: 'worksheet',
          include: ['labOrder']
        }
      ],
      order: [['startTime', 'ASC']]
    });
  };

  return ProcessingRecord;
}