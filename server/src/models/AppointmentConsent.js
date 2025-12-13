import { DataTypes } from 'sequelize';

const AppointmentConsent = (sequelize) => {
  const AppointmentConsentModel = sequelize.define('AppointmentConsent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'appointment_id',
      unique: true, // One consent per appointment
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    consentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'consent_id',
      references: {
        model: 'consents',
        key: 'id'
      }
    },
    patientWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'patient_wallet_address',
      references: {
        model: 'patients',
        key: 'walletAddress'
      }
    },
    doctorWalletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'doctor_wallet_address',
      references: {
        model: 'doctors',
        key: 'walletAddress'
      }
    },
    status: {
      type: DataTypes.ENUM('requested', 'granted', 'denied', 'expired', 'revoked'),
      defaultValue: 'requested',
      allowNull: false
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        allow_consultation: true,
        allow_medical_history_view: true,
        allow_prescription_write: false,
        allow_lab_test_order: false,
        allow_diagnosis_recording: true,
        valid_for_hours: 24,
        purpose: "Consultation for this appointment"
      },
      allowNull: false
    },
    purpose: {
      type: DataTypes.TEXT,
      defaultValue: 'Consultation consent for appointment',
      allowNull: false
    },
    consultationType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'consultation_type'
    },
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      field: 'requested_at'
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'granted_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at'
    }
  }, {
    tableName: 'appointment_consents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance Methods
  AppointmentConsentModel.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  };

  AppointmentConsentModel.prototype.isActive = function() {
    return this.status === 'granted' && !this.isExpired();
  };

  AppointmentConsentModel.prototype.canPerformAction = function(action) {
    if (!this.isActive()) return false;
    return this.permissions[action] === true;
  };

  AppointmentConsentModel.prototype.grant = async function(customPermissions = null) {
    const now = new Date();
    
    // Update permissions if custom ones provided
    if (customPermissions) {
      this.permissions = { ...this.permissions, ...customPermissions };
    }
    
    // Calculate expiration (default 24 hours)
    const validHours = this.permissions.valid_for_hours || 24;
    const expiresAt = new Date(now.getTime() + validHours * 60 * 60 * 1000);
    
    this.status = 'granted';
    this.grantedAt = now;
    this.expiresAt = expiresAt;
    
    await this.save();
    return this;
  };

  AppointmentConsentModel.prototype.deny = async function(reason = null) {
    this.status = 'denied';
    if (reason) {
      this.permissions = { ...this.permissions, denial_reason: reason };
    }
    await this.save();
    return this;
  };

  AppointmentConsentModel.prototype.revoke = async function(reason = null) {
    this.status = 'revoked';
    this.revokedAt = new Date();
    if (reason) {
      this.permissions = { ...this.permissions, revocation_reason: reason };
    }
    await this.save();
    return this;
  };

  // Class Methods
  AppointmentConsentModel.findByAppointment = async function(appointmentId) {
    return await this.findOne({
      where: { appointmentId },
      include: [
        { model: sequelize.models.Appointment, as: 'appointment' },
        { model: sequelize.models.Consent, as: 'generalConsent', required: false }
      ]
    });
  };

  AppointmentConsentModel.checkConsent = async function(appointmentId, action = null) {
    const consent = await this.findByAppointment(appointmentId);
    
    if (!consent) {
      return { hasConsent: false, reason: 'No consent request found' };
    }
    
    if (!consent.isActive()) {
      return { 
        hasConsent: false, 
        reason: consent.status === 'denied' ? 'Consent denied' :
                consent.status === 'revoked' ? 'Consent revoked' :
                consent.isExpired() ? 'Consent expired' : 'Consent not granted',
        status: consent.status
      };
    }
    
    if (action && !consent.canPerformAction(action)) {
      return { 
        hasConsent: false, 
        reason: `Permission '${action}' not granted`,
        permissions: consent.permissions
      };
    }
    
    return { 
      hasConsent: true, 
      consent,
      permissions: consent.permissions,
      expiresAt: consent.expiresAt
    };
  };

  AppointmentConsentModel.autoExpireConsents = async function() {
    const expiredConsents = await this.findAll({
      where: {
        status: 'granted',
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

  // Associations
  AppointmentConsentModel.associate = function(models) {
    AppointmentConsentModel.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId',
      as: 'appointment'
    });
    
    AppointmentConsentModel.belongsTo(models.Consent, {
      foreignKey: 'consentId',
      as: 'generalConsent'
    });
    
    AppointmentConsentModel.belongsTo(models.Patient, {
      foreignKey: 'patientWalletAddress',
      targetKey: 'walletAddress',
      as: 'patient'
    });
    
    AppointmentConsentModel.belongsTo(models.Doctor, {
      foreignKey: 'doctorWalletAddress',
      targetKey: 'walletAddress',
      as: 'doctor'
    });
  };

  return AppointmentConsentModel;
};

export default AppointmentConsent;