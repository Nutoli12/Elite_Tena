import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const LabOrder = sequelize.define('LabWorkflowOrder', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'order_number'
    },
    patientWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'patient_wallet_address'
    },
    doctorWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'doctor_wallet_address'
    },
    
    // Order Details
    testCodes: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'test_codes',
      defaultValue: []
    },
    priority: {
      type: DataTypes.ENUM('routine', 'urgent', 'stat'),
      defaultValue: 'routine'
    },
    sampleType: {
      type: DataTypes.STRING(50),
      field: 'sample_type'
    },
    collectionDate: {
      type: DataTypes.DATE,
      field: 'collection_date'
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      field: 'special_instructions'
    },
    
    // Status Tracking
    status: {
      type: DataTypes.ENUM('pending', 'collected', 'processing', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    statusChangedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'status_changed_at'
    },
    statusChangedBy: {
      type: DataTypes.STRING(255),
      field: 'status_changed_by'
    },
    
    // Consent & Approval
    consentStatus: {
      type: DataTypes.ENUM('pending', 'granted', 'denied'),
      defaultValue: 'pending',
      field: 'consent_status'
    },
    consentGrantedAt: {
      type: DataTypes.DATE,
      field: 'consent_granted_at'
    },
    
    // Blockchain Integration
    blockchainTxHash: {
      type: DataTypes.STRING(255),
      field: 'blockchain_tx_hash'
    },
    ipfsOrderHash: {
      type: DataTypes.STRING(255),
      field: 'ipfs_order_hash'
    }
  }, {
    tableName: 'lab_workflow_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    hooks: {
      beforeCreate: async (labOrder, options) => {
        // Generate unique order number
        if (!labOrder.orderNumber) {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          // Find the next sequence number for today
          const todayPrefix = `LAB-${year}${month}${day}`;
          
          try {
            const existingOrders = await LabOrder.count({
              where: {
                orderNumber: {
                  [sequelize.Sequelize.Op.like]: `${todayPrefix}%`
                }
              }
            });
            
            const sequenceNumber = String(existingOrders + 1).padStart(3, '0');
            labOrder.orderNumber = `${todayPrefix}-${sequenceNumber}`;
          } catch (error) {
            // Fallback to timestamp-based number
            const timestamp = Date.now().toString().slice(-6);
            labOrder.orderNumber = `LAB-${year}${month}${day}-${timestamp}`;
          }
        }
      },
      beforeUpdate: (labOrder) => {
        if (labOrder.changed('status')) {
          labOrder.statusChangedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  LabOrder.prototype.toJSON = function() {
    const values = { ...this.get() };
    
    // Add computed fields
    values.isUrgent = this.priority === 'urgent' || this.priority === 'stat';
    values.isCompleted = this.status === 'completed';
    values.canBeProcessed = this.status === 'collected' && this.consentStatus === 'granted';
    
    return values;
  };

  // Class methods
  LabOrder.getOrdersByStatus = async function(status, options = {}) {
    return await this.findAll({
      where: { status },
      include: [
        {
          model: sequelize.models.User,
          as: 'patient',
          attributes: ['walletAddress', 'name', 'email']
        },
        {
          model: sequelize.models.User,
          as: 'doctor',
          attributes: ['walletAddress', 'name', 'email']
        }
      ],
      order: [
        ['priority', 'DESC'], // stat > urgent > routine
        ['created_at', 'ASC']
      ],
      ...options
    });
  };

  LabOrder.getOrdersByDoctor = async function(doctorWalletAddress, options = {}) {
    return await this.findAll({
      where: { doctorWalletAddress },
      include: [
        {
          model: sequelize.models.User,
          as: 'patient',
          attributes: ['walletAddress', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  LabOrder.getOrdersByPatient = async function(patientWalletAddress, options = {}) {
    return await this.findAll({
      where: { patientWalletAddress },
      include: [
        {
          model: sequelize.models.User,
          as: 'doctor',
          attributes: ['walletAddress', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  return LabOrder;
}