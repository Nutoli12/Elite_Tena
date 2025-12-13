const fs = require('fs');
const path = require('path');

/**
 * Implement Complete Payment Flow
 * This script creates the missing components for the payment system
 */

console.log('💰 Implementing Complete Payment Flow...');

// 1. Create Fee Calculation Service
function createFeeCalculationService() {
  console.log('\n📊 Creating Fee Calculation Service...');
  
  const feeServiceCode = `import db from '../models/index.js';
const { Doctor, DoctorPaymentSettings, Appointment } = db;

/**
 * 💰 FEE CALCULATION SERVICE
 * Determines appointment fees based on multiple factors
 */
class FeeCalculationService {
  
  /**
   * Calculate appointment fee
   */
  async calculateAppointmentFee(appointmentData, doctorWallet) {
    try {
      console.log('💰 Calculating fee for:', appointmentData.serviceType, 'with doctor:', doctorWallet);
      
      // Get doctor and payment settings
      const doctor = await Doctor.findOne({
        where: { walletAddress: doctorWallet },
        include: [{
          model: DoctorPaymentSettings,
          as: 'paymentSettings'
        }]
      });
      
      if (!doctor) {
        throw new Error('Doctor not found');
      }
      
      // Base fee from doctor settings
      let baseFee = this.getBaseFee(appointmentData.serviceType, doctor.paymentSettings);
      
      // Apply multipliers
      baseFee = this.applySpecialtyMultiplier(baseFee, doctor.specialization);
      baseFee = this.applyUrgencyMultiplier(baseFee, appointmentData.priority);
      baseFee = this.applyTimeMultiplier(baseFee, appointmentData.appointmentDate);
      baseFee = this.applyDurationMultiplier(baseFee, appointmentData.duration);
      
      const finalFee = Math.round(baseFee * 100) / 100; // Round to 2 decimal places
      
      console.log('✅ Calculated fee:', finalFee, 'ETB');
      
      return {
        success: true,
        fee: finalFee,
        breakdown: {
          baseFee: this.getBaseFee(appointmentData.serviceType, doctor.paymentSettings),
          specialtyMultiplier: this.getSpecialtyMultiplier(doctor.specialization),
          urgencyMultiplier: this.getUrgencyMultiplier(appointmentData.priority),
          timeMultiplier: this.getTimeMultiplier(appointmentData.appointmentDate),
          durationMultiplier: this.getDurationMultiplier(appointmentData.duration)
        },
        requiresPayment: finalFee > 0,
        requiresApproval: finalFee > 0 || appointmentData.serviceType !== 'inPerson'
      };
    } catch (error) {
      console.error('❌ Fee calculation error:', error);
      return {
        success: false,
        error: error.message,
        fee: 0,
        requiresPayment: false,
        requiresApproval: false
      };
    }
  }
  
  /**
   * Get base fee from doctor settings
   */
  getBaseFee(serviceType, paymentSettings) {
    if (!paymentSettings) {
      return this.getDefaultFee(serviceType);
    }
    
    switch (serviceType) {
      case 'videoCall':
        return parseFloat(paymentSettings.videoCallFee) || this.getDefaultFee('videoCall');
      case 'chat':
        return parseFloat(paymentSettings.chatFee) || this.getDefaultFee('chat');
      case 'inPerson':
      default:
        return 0; // In-person consultations are usually free
    }
  }
  
  /**
   * Default fees if doctor hasn't set custom fees
   */
  getDefaultFee(serviceType) {
    const defaultFees = {
      inPerson: 0,
      videoCall: 100,
      chat: 50
    };
    return defaultFees[serviceType] || 0;
  }
  
  /**
   * Apply specialty-based multiplier
   */
  applySpecialtyMultiplier(baseFee, specialty) {
    const multiplier = this.getSpecialtyMultiplier(specialty);
    return baseFee * multiplier;
  }
  
  getSpecialtyMultiplier(specialty) {
    const specialtyMultipliers = {
      'General Practice': 1.0,
      'Internal Medicine': 1.2,
      'Pediatrics': 1.1,
      'Cardiology': 1.5,
      'Neurology': 2.0,
      'Orthopedics': 1.4,
      'Dermatology': 1.3,
      'Psychiatry': 1.6,
      'Surgery': 2.5,
      'Emergency Medicine': 1.8
    };
    return specialtyMultipliers[specialty] || 1.0;
  }
  
  /**
   * Apply urgency-based multiplier
   */
  applyUrgencyMultiplier(baseFee, priority) {
    const multiplier = this.getUrgencyMultiplier(priority);
    return baseFee * multiplier;
  }
  
  getUrgencyMultiplier(priority) {
    const urgencyMultipliers = {
      'routine': 1.0,
      'urgent': 1.25,
      'emergency': 1.5
    };
    return urgencyMultipliers[priority] || 1.0;
  }
  
  /**
   * Apply time-based multiplier (after hours, weekends)
   */
  applyTimeMultiplier(baseFee, appointmentDate) {
    const multiplier = this.getTimeMultiplier(appointmentDate);
    return baseFee * multiplier;
  }
  
  getTimeMultiplier(appointmentDate) {
    const date = new Date(appointmentDate);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Weekend multiplier
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 1.3; // 30% extra for weekends
    }
    
    // After hours multiplier (before 8 AM or after 6 PM)
    if (hour < 8 || hour >= 18) {
      return 1.25; // 25% extra for after hours
    }
    
    return 1.0; // Normal hours
  }
  
  /**
   * Apply duration-based multiplier
   */
  applyDurationMultiplier(baseFee, duration) {
    const multiplier = this.getDurationMultiplier(duration);
    return baseFee * multiplier;
  }
  
  getDurationMultiplier(duration) {
    const standardDuration = 30; // 30 minutes standard
    
    if (duration <= standardDuration) {
      return 1.0;
    }
    
    // Extra fee for extended consultations
    const extraMinutes = duration - standardDuration;
    const extraBlocks = Math.ceil(extraMinutes / 15); // 15-minute blocks
    const extraFeePerBlock = 0.2; // 20% extra per 15-minute block
    
    return 1.0 + (extraBlocks * extraFeePerBlock);
  }
  
  /**
   * Get fee breakdown for display
   */
  async getFeeBreakdown(appointmentData, doctorWallet) {
    const calculation = await this.calculateAppointmentFee(appointmentData, doctorWallet);
    
    if (!calculation.success) {
      return calculation;
    }
    
    const breakdown = calculation.breakdown;
    
    return {
      success: true,
      totalFee: calculation.fee,
      breakdown: [
        {
          item: 'Base Fee',
          amount: breakdown.baseFee,
          description: \`\${appointmentData.serviceType} consultation\`
        },
        {
          item: 'Specialty Adjustment',
          multiplier: breakdown.specialtyMultiplier,
          description: 'Based on doctor specialization'
        },
        {
          item: 'Urgency Adjustment',
          multiplier: breakdown.urgencyMultiplier,
          description: 'Based on appointment priority'
        },
        {
          item: 'Time Adjustment',
          multiplier: breakdown.timeMultiplier,
          description: 'Based on appointment time'
        },
        {
          item: 'Duration Adjustment',
          multiplier: breakdown.durationMultiplier,
          description: 'Based on consultation length'
        }
      ].filter(item => item.multiplier !== 1.0 || item.amount > 0)
    };
  }
}

export default new FeeCalculationService();`;

  const serviceDir = path.join(__dirname, 'server', 'src', 'services');
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(serviceDir, 'feeCalculationService.js'), feeServiceCode);
  console.log('✅ Created fee calculation service');
}

// 2. Create Payment Flow Controller
function createPaymentFlowController() {
  console.log('\n🔄 Creating Payment Flow Controller...');
  
  const controllerCode = `import db from '../models/index.js';
import feeCalculationService from '../services/feeCalculationService.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paymentService = require('../../services/payment.cjs');

const { Appointment, Doctor, DoctorPaymentSettings, Payment } = db;

/**
 * 🔄 PAYMENT FLOW CONTROLLER
 * Handles the complete payment workflow
 */

/**
 * Step 1: Calculate and display fee for appointment
 */
export const calculateAppointmentFee = async (req, res) => {
  try {
    const { doctorWallet, serviceType, appointmentDate, duration, priority } = req.body;
    
    console.log('💰 Calculating fee for appointment request');
    
    const appointmentData = {
      serviceType: serviceType || 'inPerson',
      appointmentDate: appointmentDate || new Date(),
      duration: duration || 30,
      priority: priority || 'routine'
    };
    
    const feeCalculation = await feeCalculationService.calculateAppointmentFee(
      appointmentData, 
      doctorWallet
    );
    
    if (!feeCalculation.success) {
      return res.status(400).json({
        success: false,
        error: feeCalculation.error
      });
    }
    
    // Get doctor payment methods
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWallet },
      include: [{
        model: DoctorPaymentSettings,
        as: 'paymentSettings'
      }]
    });
    
    const paymentMethods = [];
    
    if (feeCalculation.fee > 0) {
      // System payment methods (Chapa)
      paymentMethods.push({
        id: 'chapa',
        name: 'Chapa Payment',
        description: 'Pay with cards, mobile money, or bank transfer',
        type: 'system',
        enabled: !!process.env.CHAPA_SECRET_KEY
      });
      
      // Doctor's peer-to-peer methods
      if (doctor?.paymentSettings) {
        const settings = doctor.paymentSettings;
        
        if (settings.telebirrEnabled) {
          paymentMethods.push({
            id: 'telebirr_p2p',
            name: 'Telebirr (Dir