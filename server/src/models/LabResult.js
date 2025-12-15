import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const LabResult = sequelize.define('LabWorkflowResult', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    labOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'lab_order_id'
    },
    technicianWalletAddress: {
      type: DataTypes.STRING(255),
      field: 'technician_wallet_address'
    },
    
    // PROPER MEDICAL WORKFLOW STATUS
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'validated', 'reviewed', 'released', 'accepted', 'completed', 'correction_requested', 'cancelled'),
      defaultValue: 'draft',
      allowNull: false
    },
    submittedAt: {
      type: DataTypes.DATE,
      field: 'submitted_at'
    },
    releasedAt: {
      type: DataTypes.DATE,
      field: 'released_at'
    },
    releasedBy: {
      type: DataTypes.STRING(255),
      field: 'released_by'
    },
    acceptedAt: {
      type: DataTypes.DATE,
      field: 'accepted_at'
    },
    acceptedBy: {
      type: DataTypes.STRING(255),
      field: 'accepted_by'
    },
    correctionRequestedAt: {
      type: DataTypes.DATE,
      field: 'correction_requested_at'
    },
    correctionRequestedBy: {
      type: DataTypes.STRING(255),
      field: 'correction_requested_by'
    },
    correctionNotes: {
      type: DataTypes.TEXT,
      field: 'correction_notes'
    },

    // Result Data
    resultData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'result_data',
      defaultValue: {}
    },
    interpretation: {
      type: DataTypes.TEXT
    },
    technicianNotes: {
      type: DataTypes.TEXT,
      field: 'technician_notes'
    },
    doctorInterpretation: {
      type: DataTypes.TEXT,
      field: 'doctor_interpretation'
    },
    doctorNotes: {
      type: DataTypes.TEXT,
      field: 'doctor_notes'
    },
    referenceRanges: {
      type: DataTypes.JSONB,
      field: 'reference_ranges',
      defaultValue: {}
    },
    
    // Quality Control Checks
    qualityChecks: {
      type: DataTypes.JSONB,
      field: 'quality_checks',
      defaultValue: {}
    },
    
    // Files & Documents
    reportFiles: {
      type: DataTypes.JSONB,
      field: 'report_files',
      defaultValue: []
    },
    rawDataFiles: {
      type: DataTypes.JSONB,
      field: 'raw_data_files',
      defaultValue: []
    },
    
    // Quality Control
    verifiedBy: {
      type: DataTypes.STRING(255),
      field: 'verified_by'
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      field: 'verification_status'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      field: 'verified_at'
    },
    verificationNotes: {
      type: DataTypes.TEXT,
      field: 'verification_notes'
    },
    
    // Critical Values
    hasCriticalValues: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_critical_values'
    },
    criticalValues: {
      type: DataTypes.JSONB,
      field: 'critical_values',
      defaultValue: []
    },
    criticalNotificationSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'critical_notification_sent'
    },
    
    // Blockchain Integration
    ipfsResultHash: {
      type: DataTypes.STRING(255),
      field: 'ipfs_result_hash'
    },
    blockchainTxHash: {
      type: DataTypes.STRING(255),
      field: 'blockchain_tx_hash'
    },
    
    // Metadata
    resultDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'result_date'
    }
  }, {
    tableName: 'lab_workflow_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    hooks: {
      beforeCreate: async (labResult) => {
        // Auto-detect critical values
        await labResult.detectCriticalValues();
      },
      beforeUpdate: async (labResult) => {
        if (labResult.changed('resultData')) {
          await labResult.detectCriticalValues();
        }
        
        if (labResult.changed('verificationStatus') && labResult.verificationStatus === 'verified') {
          labResult.verifiedAt = new Date();
        }
      },
      afterCreate: async (labResult) => {
        // Send critical value notifications
        if (labResult.hasCriticalValues && !labResult.criticalNotificationSent) {
          await labResult.sendCriticalValueNotification();
        }
      }
    }
  });

  // Instance methods
  LabResult.prototype.detectCriticalValues = async function() {
    try {
      // Get the lab order to know which tests were performed
      const labOrder = await this.getLabOrder();
      if (!labOrder) return;

      // Get test catalog entries for critical value ranges
      const testCatalog = await sequelize.models.LabTestCatalog.findAll({
        where: {
          testCode: {
            [sequelize.Sequelize.Op.in]: labOrder.testCodes
          }
        }
      });

      const criticalFindings = [];
      
      // Check each test result against critical values
      for (const test of testCatalog) {
        if (test.criticalValues && this.resultData[test.testCode]) {
          const testResult = this.resultData[test.testCode];
          const criticalRanges = test.criticalValues;
          
          for (const [parameter, value] of Object.entries(testResult)) {
            if (typeof value === 'number' && criticalRanges[parameter]) {
              const critical = criticalRanges[parameter];
              
              if ((critical.critical_low && value < critical.critical_low) ||
                  (critical.critical_high && value > critical.critical_high)) {
                criticalFindings.push({
                  test: test.testCode,
                  parameter,
                  value,
                  criticalRange: critical,
                  severity: value < critical.critical_low ? 'critically_low' : 'critically_high'
                });
              }
            }
          }
        }
      }
      
      this.hasCriticalValues = criticalFindings.length > 0;
      this.criticalValues = criticalFindings;
      
    } catch (error) {
      console.error('Error detecting critical values:', error);
    }
  };

  LabResult.prototype.sendCriticalValueNotification = async function() {
    try {
      if (!this.hasCriticalValues) return;

      // Get lab order details
      const labOrder = await this.getLabOrder({
        include: [
          { model: sequelize.models.User, as: 'patient' },
          { model: sequelize.models.User, as: 'doctor' }
        ]
      });

      if (!labOrder) return;

      // Create critical value notification for doctor
      await sequelize.models.Notification.create({
        userId: labOrder.doctorWalletAddress,
        type: 'critical_lab_values',
        title: '🚨 Critical Lab Values Detected',
        message: `Critical values found in lab results for ${labOrder.patient.name || 'Patient'}. Immediate review required.`,
        data: {
          labOrderId: labOrder.id,
          labResultId: this.id,
          patientName: labOrder.patient.name || 'Unknown Patient',
          criticalValues: this.criticalValues,
          orderNumber: labOrder.orderNumber
        },
        priority: 'high',
        requiresAction: true
      });

      // Mark notification as sent
      this.criticalNotificationSent = true;
      await this.save();

      console.log(`Critical value notification sent for lab result ${this.id}`);
      
    } catch (error) {
      console.error('Error sending critical value notification:', error);
    }
  };

  LabResult.prototype.generateSummary = function() {
    const resultData = this.resultData || {};
    const criticalValues = this.criticalValues || [];
    
    const summary = {
      totalTests: Object.keys(resultData).length,
      normalResults: 0,
      abnormalResults: 0,
      criticalResults: criticalValues.length,
      overallStatus: 'normal'
    };

    // Analyze each test result
    for (const [testCode, results] of Object.entries(resultData)) {
      let testHasAbnormal = false;
      
      if (typeof results === 'object') {
        for (const [parameter, value] of Object.entries(results)) {
          // Check if this parameter has abnormal values
          // This is a simplified check - in reality you'd compare against reference ranges
          if (parameter.includes('status') && value !== 'normal') {
            testHasAbnormal = true;
          }
        }
      }
      
      if (testHasAbnormal) {
        summary.abnormalResults++;
      } else {
        summary.normalResults++;
      }
    }

    // Determine overall status
    if (summary.criticalResults > 0) {
      summary.overallStatus = 'critical';
    } else if (summary.abnormalResults > 0) {
      summary.overallStatus = 'abnormal';
    }

    return summary;
  };

  LabResult.prototype.toJSON = function() {
    const values = { ...this.get() };
    
    // Add computed fields
    values.summary = this.generateSummary();
    values.isVerified = this.verificationStatus === 'verified';
    values.needsReview = this.hasCriticalValues || this.verificationStatus === 'rejected';
    
    return values;
  };

  // Class methods
  LabResult.getResultsByPatient = async function(patientWalletAddress, options = {}) {
    return await this.findAll({
      include: [
        {
          model: sequelize.models.LabWorkflowOrder,
          as: 'labOrder',
          where: { patientWalletAddress },
          include: [
            {
              model: sequelize.models.User,
              as: 'doctor',
              attributes: ['walletAddress', 'name']
            }
          ]
        }
      ],
      order: [['result_date', 'DESC']],
      ...options
    });
  };

  LabResult.getResultsByDoctor = async function(doctorWalletAddress, options = {}) {
    return await this.findAll({
      include: [
        {
          model: sequelize.models.LabWorkflowOrder,
          as: 'labOrder',
          where: { doctorWalletAddress },
          include: [
            {
              model: sequelize.models.User,
              as: 'patient',
              attributes: ['walletAddress', 'name']
            }
          ]
        }
      ],
      order: [['result_date', 'DESC']],
      ...options
    });
  };

  LabResult.getCriticalResults = async function(options = {}) {
    return await this.findAll({
      where: { 
        hasCriticalValues: true,
        criticalNotificationSent: false
      },
      include: [
        {
          model: sequelize.models.LabWorkflowOrder,
          as: 'labOrder',
          include: [
            { model: sequelize.models.User, as: 'patient' },
            { model: sequelize.models.User, as: 'doctor' }
          ]
        }
      ],
      order: [['created_at', 'ASC']],
      ...options
    });
  };

  return LabResult;
}