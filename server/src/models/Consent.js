import { DataTypes } from 'sequelize';

const Consent = (sequelize) => {
  const ConsentModel = sequelize.define('Consent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'walletAddress'
      }
    },
    doctorWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    // Consent Status State Machine
    status: {
      type: DataTypes.ENUM(
        'requested',        // Doctor requested access
        'pending',          // Waiting patient approval
        'active',           // Access granted
        'limited',          // Restricted access
        'emergency',        // Emergency override
        'expired',          // Time limit reached
        'auto_revoked',     // System auto-revoked
        'patient_revoked',  // Patient manually revoked
        'doctor_revoked',   // Doctor ended access
        'admin_revoked'     // Admin revoked
      ),
      defaultValue: 'requested',
      allowNull: false
    },
    // Access Level Hierarchy
    accessLevel: {
      type: DataTypes.ENUM('NONE', 'EMERGENCY', 'LIMITED', 'STANDARD', 'PERMANENT'),
      defaultValue: 'STANDARD',
      allowNull: false
    },
    // Consent Types (can have multiple)
    consentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    // Granular Permissions
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        viewMedicalHistory: false,
        viewLabResults: false,
        viewPrescriptions: false,
        addConsultationNotes: false,
        orderTests: false,
        writePrescriptions: false,
        shareWithColleagues: false,
        exportRecords: false,
        deleteRecords: false
      },
      allowNull: false
    },
    // Purpose and Justification
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    requestReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Time Management
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Duration Settings
    durationType: {
      type: DataTypes.ENUM('appointment_only', 'hours', 'days', 'weeks', 'months', 'permanent'),
      defaultValue: 'hours',
      allowNull: false
    },
    durationValue: {
      type: DataTypes.INTEGER,
      defaultValue: 24,
      allowNull: false
    },
    // Revocation Details
    revocationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    revokedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Blockchain Integration
    blockchainTxHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    revocationTxHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Audit Trail
    accessCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    recordsViewed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    actionsPerformed: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    // Emergency Override
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    emergencyJustification: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Auto-grant Settings
    isAutoGranted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    autoGrantReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Additional Notes
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patientNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'consents',
    timestamps: true
  });

  // Instance Methods
  ConsentModel.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  };

  ConsentModel.prototype.isCurrentlyActive = function() {
    return this.status === 'active' && !this.isExpired();
  };

  ConsentModel.prototype.canAccess = function(action) {
    if (!this.isCurrentlyActive()) return false;
    return this.permissions[action] === true;
  };

  ConsentModel.prototype.recordAccess = async function() {
    this.accessCount += 1;
    this.lastAccessedAt = new Date();
    await this.save();
  };

  ConsentModel.prototype.recordAction = async function(action, details) {
    const actions = this.actionsPerformed || [];
    actions.push({
      action,
      details,
      timestamp: new Date()
    });
    this.actionsPerformed = actions;
    await this.save();
  };

  ConsentModel.prototype.grant = async function(grantedBy) {
    this.status = 'active';
    this.grantedAt = new Date();
    
    // Calculate expiration based on duration
    if (this.durationType !== 'permanent') {
      const now = new Date();
      switch (this.durationType) {
        case 'hours':
          this.expiresAt = new Date(now.getTime() + this.durationValue * 60 * 60 * 1000);
          break;
        case 'days':
          this.expiresAt = new Date(now.getTime() + this.durationValue * 24 * 60 * 60 * 1000);
          break;
        case 'weeks':
          this.expiresAt = new Date(now.getTime() + this.durationValue * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'months':
          this.expiresAt = new Date(now.setMonth(now.getMonth() + this.durationValue));
          break;
      }
    }
    
    await this.save();
  };

  ConsentModel.prototype.revoke = async function(reason, revokedBy) {
    this.status = revokedBy.includes('patient') ? 'patient_revoked' : 
                  revokedBy.includes('doctor') ? 'doctor_revoked' : 
                  revokedBy.includes('admin') ? 'admin_revoked' : 'auto_revoked';
    this.revokedAt = new Date();
    this.revocationReason = reason;
    this.revokedBy = revokedBy;
    await this.save();
  };

  // Class Methods
  ConsentModel.checkAndExpireConsents = async function() {
    const expiredConsents = await this.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });

    for (const consent of expiredConsents) {
      consent.status = 'expired';
      await consent.save();
    }

    return expiredConsents.length;
  };

  ConsentModel.associate = function(models) {
    ConsentModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      as: 'patient'
    });
    ConsentModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      as: 'doctor'
    });
    ConsentModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });
  };

  return ConsentModel;
};

export default Consent;