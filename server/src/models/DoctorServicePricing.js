import { DataTypes } from 'sequelize';

export default function(sequelize) {
  const DoctorServicePricing = sequelize.define('DoctorServicePricing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  doctorWallet: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'doctor_wallet'
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'doctor_id'
  },
  
  // Service Pricing (ETB)
  inPersonFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 400.00,
    field: 'in_person_fee'
  },
  videoCallFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'video_call_fee'
  },
  chatFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'chat_fee'
  },
  
  // Settings
  acceptsInPerson: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'accepts_in_person'
  },
  acceptsVideoCalls: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'accepts_video_calls'
  },
  acceptsChat: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'accepts_chat'
  },
  
  // Auto-approval settings
  autoApproveExactPayments: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'auto_approve_exact_payments'
  }
}, {
  tableName: 'doctor_service_pricing',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Instance methods
DoctorServicePricing.prototype.getFeeForService = function(serviceType) {
  switch (serviceType) {
    case 'in_person':
    case 'inPerson':
    case 'in-person':
      return this.inPersonFee;
    case 'video_call':
    case 'videoCall':
    case 'video-call':
      return this.videoCallFee;
    case 'chat':
      return this.chatFee;
    default:
      return 0;
  }
};

DoctorServicePricing.prototype.acceptsService = function(serviceType) {
  switch (serviceType) {
    case 'in_person':
    case 'inPerson':
    case 'in-person':
      return this.acceptsInPerson;
    case 'video_call':
    case 'videoCall':
    case 'video-call':
      return this.acceptsVideoCalls;
    case 'chat':
      return this.acceptsChat;
    default:
      return false;
  }
};

DoctorServicePricing.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  return {
    id: values.id,
    doctorWallet: values.doctorWallet,
    doctorId: values.doctorId,
    pricing: {
      inPerson: parseFloat(values.inPersonFee),
      videoCall: parseFloat(values.videoCallFee),
      chat: parseFloat(values.chatFee)
    },
    services: {
      inPerson: values.acceptsInPerson,
      videoCall: values.acceptsVideoCalls,
      chat: values.acceptsChat
    },
    settings: {
      autoApproveExactPayments: values.autoApproveExactPayments
    },
    createdAt: values.created_at,
    updatedAt: values.updated_at
  };
};

  return DoctorServicePricing;
}