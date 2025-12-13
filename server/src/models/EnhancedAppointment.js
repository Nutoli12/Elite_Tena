import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const EnhancedAppointment = sequelize.define('EnhancedAppointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Basic Info
  patientWallet: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'patient_wallet'
  },
  doctorWallet: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'doctor_wallet'
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'patient_id'
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'doctor_id'
  },
  
  // Appointment Details
  appointmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'appointment_date'
  },
  serviceType: {
    type: DataTypes.ENUM('in_person', 'video_call', 'chat'),
    allowNull: false,
    field: 'service_type'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Pricing & Payment
  expectedFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'expected_fee'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'paid_amount'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    field: 'payment_reference'
  },
  
  // Approval Logic
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'auto_approved', 'manually_approved', 'rejected'),
    defaultValue: 'pending',
    field: 'approval_status'
  },
  approvalType: {
    type: DataTypes.ENUM('auto', 'manual'),
    defaultValue: 'manual',
    field: 'approval_type'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    field: 'approved_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason'
  },
  
  // Refund Policy
  refundEligible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'refund_eligible'
  },
  refundStatus: {
    type: DataTypes.ENUM('none', 'pending', 'processed', 'failed'),
    defaultValue: 'none',
    field: 'refund_status'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'refund_amount'
  },
  refundProcessedAt: {
    type: DataTypes.DATE,
    field: 'refund_processed_at'
  },
  
  // Status Tracking
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled'
  }
}, {
  tableName: 'enhanced_appointments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Instance methods
EnhancedAppointment.prototype.isExactPayment = function() {
  return parseFloat(this.paidAmount) === parseFloat(this.expectedFee);
};

EnhancedAppointment.prototype.getPaymentDifference = function() {
  return parseFloat(this.paidAmount) - parseFloat(this.expectedFee);
};

EnhancedAppointment.prototype.isAutoApprovalEligible = function() {
  return this.isExactPayment() && this.paymentStatus === 'paid';
};

EnhancedAppointment.prototype.isRefundEligible = function() {
  return this.refundEligible && 
         this.approvalStatus === 'rejected' && 
         this.paymentStatus === 'paid' &&
         this.refundStatus === 'none';
};

EnhancedAppointment.prototype.canBeApproved = function() {
  return this.approvalStatus === 'pending' && this.paymentStatus === 'paid';
};

EnhancedAppointment.prototype.approve = async function(approvedBy = null, isAuto = false) {
  this.approvalStatus = isAuto ? 'auto_approved' : 'manually_approved';
  this.approvalType = isAuto ? 'auto' : 'manual';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.status = 'confirmed';
  
  // Auto-approved appointments are not refund eligible
  if (isAuto) {
    this.refundEligible = false;
  }
  
  return await this.save();
};

EnhancedAppointment.prototype.reject = async function(reason, rejectedBy = null) {
  this.approvalStatus = 'rejected';
  this.rejectionReason = reason;
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  this.status = 'cancelled';
  
  return await this.save();
};

EnhancedAppointment.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  return {
    id: values.id,
    patientWallet: values.patientWallet,
    doctorWallet: values.doctorWallet,
    patientId: values.patientId,
    doctorId: values.doctorId,
    
    appointment: {
      date: values.appointmentDate,
      serviceType: values.serviceType,
      duration: values.duration,
      reason: values.reason,
      status: values.status
    },
    
    payment: {
      expectedFee: parseFloat(values.expectedFee),
      paidAmount: parseFloat(values.paidAmount),
      paymentStatus: values.paymentStatus,
      paymentReference: values.paymentReference,
      isExactPayment: this.isExactPayment(),
      paymentDifference: this.getPaymentDifference()
    },
    
    approval: {
      status: values.approvalStatus,
      type: values.approvalType,
      approvedBy: values.approvedBy,
      approvedAt: values.approvedAt,
      rejectionReason: values.rejectionReason,
      canBeApproved: this.canBeApproved(),
      isAutoApprovalEligible: this.isAutoApprovalEligible()
    },
    
    refund: {
      eligible: values.refundEligible,
      status: values.refundStatus,
      amount: parseFloat(values.refundAmount),
      processedAt: values.refundProcessedAt,
      isRefundEligible: this.isRefundEligible()
    },
    
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

  return EnhancedAppointment;
}