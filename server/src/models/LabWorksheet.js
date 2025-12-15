import { DataTypes } from 'sequelize';

/**
 * Lab Worksheet Model
 * Represents a lab worksheet for sample processing workflow
 */
export default function(sequelize, DataTypes) {
  const LabWorksheet = sequelize.define('LabWorksheet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    accessionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique sample identifier (LAB-YYYYMMDD-XXXX format)'
    },
    labOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lab_orders',
        key: 'id'
      },
      comment: 'Reference to the lab order'
    },
    technicianId: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Wallet address of assigned technician'
    },
    sampleCollectionStatus: {
      type: DataTypes.ENUM('pending', 'collected', 'rejected', 'insufficient'),
      defaultValue: 'pending',
      comment: 'Status of sample collection'
    },
    processingStatus: {
      type: DataTypes.ENUM('queued', 'in_progress', 'completed', 'failed', 'on_hold'),
      defaultValue: 'queued',
      comment: 'Status of sample processing'
    },
    sampleCollectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when sample was collected'
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when processing started'
    },
    processingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when processing completed'
    },
    instrumentUsed: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Instrument used for analysis'
    },
    chainOfCustody: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Chain of custody log entries'
    },
    qualityControlChecks: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Quality control check results'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes and observations'
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
    tableName: 'lab_worksheets',
    timestamps: true,
    indexes: [
      {
        fields: ['accessionNumber'],
        unique: true
      },
      {
        fields: ['labOrderId']
      },
      {
        fields: ['technicianId']
      },
      {
        fields: ['sampleCollectionStatus']
      },
      {
        fields: ['processingStatus']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Instance methods
  LabWorksheet.prototype.addChainOfCustodyEntry = function(entry) {
    const custody = this.chainOfCustody || [];
    custody.push({
      timestamp: new Date(),
      ...entry
    });
    return this.update({ chainOfCustody: custody });
  };

  LabWorksheet.prototype.updateQualityControl = function(checks) {
    const qc = this.qualityControlChecks || {};
    return this.update({ 
      qualityControlChecks: { ...qc, ...checks }
    });
  };

  // Static methods
  LabWorksheet.generateAccessionNumber = function() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `LAB-${dateStr}-${randomNum}`;
  };

  LabWorksheet.getWorksheetsByTechnician = async function(technicianId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    const where = { technicianId };
    if (status) where.processingStatus = status;

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'labOrder',
          include: ['patient', 'doctor']
        }
      ]
    });
  };

  return LabWorksheet;
}