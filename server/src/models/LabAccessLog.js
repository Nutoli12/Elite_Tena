import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const LabAccessLog = sequelize.define('LabAccessLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    labResultId: {
      type: DataTypes.INTEGER,
      field: 'lab_result_id'
    },
    labOrderId: {
      type: DataTypes.INTEGER,
      field: 'lab_order_id'
    },
    userWalletAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'user_wallet_address'
    },
    userRole: {
      type: DataTypes.STRING(50),
      field: 'user_role'
    },
    
    // Access Details
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    resourceType: {
      type: DataTypes.STRING(30),
      field: 'resource_type'
    },
    accessedData: {
      type: DataTypes.JSONB,
      field: 'accessed_data',
      defaultValue: {}
    },
    
    // Request Details
    ipAddress: {
      type: DataTypes.INET,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    sessionId: {
      type: DataTypes.STRING(255),
      field: 'session_id'
    },
    
    // Metadata
    accessedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'accessed_at'
    }
  }, {
    tableName: 'lab_workflow_access_logs',
    timestamps: false, // We use accessedAt instead

  });

  // Instance methods
  LabAccessLog.prototype.toJSON = function() {
    const values = { ...this.get() };
    
    // Add computed fields
    values.actionDisplay = this.getActionDisplay();
    values.timeAgo = this.getTimeAgo();
    
    return values;
  };

  LabAccessLog.prototype.getActionDisplay = function() {
    const actionMap = {
      'view': 'Viewed',
      'download': 'Downloaded',
      'print': 'Printed',
      'share': 'Shared',
      'edit': 'Edited',
      'delete': 'Deleted',
      'create': 'Created',
      'upload': 'Uploaded',
      'verify': 'Verified',
      'reject': 'Rejected'
    };
    
    return actionMap[this.action] || this.action;
  };

  LabAccessLog.prototype.getTimeAgo = function() {
    const now = new Date();
    const accessed = new Date(this.accessedAt);
    const diffMs = now - accessed;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return accessed.toLocaleDateString();
  };

  // Class methods
  LabAccessLog.logAccess = async function(params) {
    const {
      labResultId,
      labOrderId,
      userWalletAddress,
      userRole,
      action,
      resourceType,
      accessedData = {},
      req
    } = params;

    try {
      return await this.create({
        labResultId,
        labOrderId,
        userWalletAddress,
        userRole,
        action,
        resourceType,
        accessedData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent'),
        sessionId: req?.sessionID
      });
    } catch (error) {
      console.error('Error logging lab access:', error);
      // Don't throw - logging should not break the main flow
      return null;
    }
  };

  LabAccessLog.getAccessHistory = async function(options = {}) {
    const {
      labResultId,
      labOrderId,
      userWalletAddress,
      action,
      startDate,
      endDate,
      limit = 100
    } = options;

    const where = {};
    
    if (labResultId) where.labResultId = labResultId;
    if (labOrderId) where.labOrderId = labOrderId;
    if (userWalletAddress) where.userWalletAddress = userWalletAddress;
    if (action) where.action = action;
    
    if (startDate || endDate) {
      where.accessedAt = {};
      if (startDate) where.accessedAt[sequelize.Sequelize.Op.gte] = startDate;
      if (endDate) where.accessedAt[sequelize.Sequelize.Op.lte] = endDate;
    }

    return await this.findAll({
      where,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['walletAddress', 'name', 'role']
        }
      ],
      order: [['accessed_at', 'DESC']],
      limit
    });
  };

  LabAccessLog.getAccessSummary = async function(options = {}) {
    const {
      labResultId,
      labOrderId,
      userWalletAddress,
      startDate,
      endDate
    } = options;

    const where = {};
    
    if (labResultId) where.labResultId = labResultId;
    if (labOrderId) where.labOrderId = labOrderId;
    if (userWalletAddress) where.userWalletAddress = userWalletAddress;
    
    if (startDate || endDate) {
      where.accessedAt = {};
      if (startDate) where.accessedAt[sequelize.Sequelize.Op.gte] = startDate;
      if (endDate) where.accessedAt[sequelize.Sequelize.Op.lte] = endDate;
    }

    const [totalAccess, actionSummary, userSummary] = await Promise.all([
      // Total access count
      this.count({ where }),
      
      // Access by action
      this.findAll({
        where,
        attributes: [
          'action',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['action'],
        raw: true
      }),
      
      // Access by user
      this.findAll({
        where,
        attributes: [
          'user_wallet_address',
          'user_role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['user_wallet_address', 'user_role'],
        raw: true
      })
    ]);

    return {
      totalAccess,
      actionSummary: actionSummary.reduce((acc, item) => {
        acc[item.action] = parseInt(item.count);
        return acc;
      }, {}),
      userSummary: userSummary.map(item => ({
        userWalletAddress: item.user_wallet_address,
        userRole: item.user_role,
        accessCount: parseInt(item.count)
      }))
    };
  };

  LabAccessLog.getRecentActivity = async function(limit = 50) {
    return await this.findAll({
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['walletAddress', 'name', 'role']
        },
        {
          model: sequelize.models.LabWorkflowResult,
          as: 'labResult',
          attributes: ['id'],
          required: false
        },
        {
          model: sequelize.models.LabWorkflowOrder,
          as: 'labOrder',
          attributes: ['id', 'orderNumber'],
          required: false
        }
      ],
      order: [['accessed_at', 'DESC']],
      limit
    });
  };

  return LabAccessLog;
}