import { DataTypes } from 'sequelize';

/**
 * Sample Collection Model
 * Records details of sample collection for lab worksheets
 */
export default function(sequelize, DataTypes) {
  const SampleCollection = sequelize.define('SampleCollection', {
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
    sampleType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of sample (blood, urine, tissue, etc.)'
    },
    collectionMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Method used for collection'
    },
    sampleVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Volume of sample collected (mL)'
    },
    containerType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Type of container used'
    },
    storageLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Storage location/refrigerator'
    },
    collectedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Person who collected the sample'
    },
    collectionDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date and time of collection'
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Sample barcode for tracking'
    },
    specialHandling: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Special handling instructions'
    },
    sampleCondition: {
      type: DataTypes.ENUM('good', 'hemolyzed', 'clotted', 'insufficient', 'contaminated'),
      defaultValue: 'good',
      comment: 'Condition of the sample'
    },
    temperatureAtCollection: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Temperature at time of collection (°C)'
    },
    collectionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional collection notes'
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
    tableName: 'sample_collections',
    timestamps: true,
    indexes: [
      {
        fields: ['worksheetId']
      },
      {
        fields: ['sampleType']
      },
      {
        fields: ['collectionDateTime']
      },
      {
        fields: ['barcode'],
        unique: true,
        where: {
          barcode: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ]
  });

  // Instance methods
  SampleCollection.prototype.updateCondition = function(condition, notes) {
    return this.update({
      sampleCondition: condition,
      collectionNotes: notes ? `${this.collectionNotes || ''}\n${notes}` : this.collectionNotes
    });
  };

  // Static methods
  SampleCollection.getSamplesByWorksheet = async function(worksheetId) {
    return this.findAll({
      where: { worksheetId },
      order: [['collectionDateTime', 'ASC']]
    });
  };

  SampleCollection.getSamplesByCondition = async function(condition) {
    return this.findAll({
      where: { sampleCondition: condition },
      include: [
        {
          association: 'worksheet',
          include: ['labOrder']
        }
      ],
      order: [['collectionDateTime', 'DESC']]
    });
  };

  return SampleCollection;
}