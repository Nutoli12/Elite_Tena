import db from '../models/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paymentService = require('../../services/payment.cjs');

const { Appointment, Doctor, DoctorPaymentSettings, Payment, User, Patient } = db;

/**
 * 💰 APPOINTMENT PAYMENT FLOW SERVICE
 * Handles Phase 2: Approval & Payment workflow
 */
class AppointmentPaymentFlow {

  /**
   * 📋 STEP 1: Calculate appointment fee and determine payment requirements
   */
  async calculateAppointmentFee(appointmentData, doctorWallet) {
    try {
      console.log('💰 Calculating fee for:', appointmentData.serviceType, 'with doctor:', doctorWallet);
      
      // Get doctor and payment settings
      const doctor = await Doctor.findOne({
        where: { walletAddress: doctorWallet.toLowerCase() },
        include: [{
          model: DoctorPaymentSettings,
          as: 'paymentSettings',
          required: false
        }]
      });
      
      if (!doctor) {
        throw new Error('Doctor not found');
      }
      
      // Calculate base fee
      let baseFee = this.getBaseFee(appointmentData.serviceType, doctor.paymentSettings);
      
      // Apply multipliers
      baseFee = this.applySpecialtyMultiplier(baseFee, doctor.specialization);
      baseFee = this.applyUrgencyMultiplier(baseFee, appointmentData.priority);
      baseFee = this.applyTimeMultiplier(baseFee, appointmentData.appointmentDate);
      baseFee = this.applyDurationMultiplier(baseFee, appointmentData.duration);
      
      const finalFee = Math.round(baseFee * 100) / 100;
      
      // Determine requirements - ALL APPOINTMENTS NOW REQUIRE APPROVAL
      const requiresPayment = finalFee > 0;
      const requiresApproval = true; // ALL appointments require doctor approval
      
      console.log('✅ Fee calculated:', {
        fee: finalFee,
        requiresPayment,
        requiresApproval,
        serviceType: appointmentData.serviceType
      });
      
      return {
        success: true,
        fee: finalFee,
        requiresPayment,
        requiresApproval,
        breakdown: {
          baseFee: this.getBaseFee(appointmentData.serviceType, doctor.paymentSettings),
          specialtyMultiplier: this.getSpecialtyMultiplier(doctor.specialization),
          urgencyMultiplier: this.getUrgencyMultiplier(appointmentData.priority),
          timeMultiplier: this.getTimeMultiplier(appointmentData.appointmentDate),
          durationMultiplier: this.getDurationMultiplier(appointmentData.duration)
        }
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
   * 👨‍⚕️ STEP 2: Doctor approval workflow
   */
  async processAppointmentApproval(appointmentId, doctorWallet, action, reason = null) {
    try {
      console.log('👨‍⚕️ Processing appointment approval:', appointmentId, action);
      
      const appointment = await Appointment.findByPk(appointmentId);
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      // Verify doctor owns this appointment
      if (appointment.doctorWalletAddress.toLowerCase() !== doctorWallet.toLowerCase()) {
        throw new Error('Unauthorized: Doctor can only approve their own appointments');
      }
      
      // Check if appointment requires approval
      if (!appointment.requiresApproval) {
        throw new Error('This appointment does not require approval');
      }
      
      const now = new Date();
      
      if (action === 'approve') {
        await appointment.update({
          approvalStatus: 'approved',
          approvedAt: now,
          approvedBy: doctorWallet.toLowerCase(),
          rejectionReason: null
        });
        
        console.log('✅ Appointment approved by doctor');
        
        // Send notification to patient
        await this.sendNotificationToPatient(appointment, 'appointment_approved', {
          title: 'Appointment Approved',
          message: `Your appointment has been approved. ${appointment.fee > 0 ? 'Please proceed with payment.' : 'No payment required.'}`,
          requiresPayment: appointment.fee > 0
        });
        
        return {
          success: true,
          status: 'approved',
          message: 'Appointment approved successfully',
          nextStep: appointment.fee > 0 ? 'payment_required' : 'appointment_confirmed'
        };
        
      } else if (action === 'reject') {
        await appointment.update({
          approvalStatus: 'rejected',
          rejectionReason: reason || 'Doctor declined the appointment',
          status: 'cancelled'
        });
        
        console.log('❌ Appointment rejected by doctor');
        
        // Send notification to patient
        await this.sendNotificationToPatient(appointment, 'appointment_rejected', {
          title: 'Appointment Declined',
          message: `Your appointment has been declined. Reason: ${reason || 'Not specified'}`,
          rejectionReason: reason
        });
        
        return {
          success: true,
          status: 'rejected',
          message: 'Appointment rejected',
          reason: reason
        };
      } else {
        throw new Error('Invalid action. Must be "approve" or "reject"');
      }
      
    } catch (error) {
      console.error('❌ Appointment approval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 💳 STEP 3: Initialize payment for approved appointment
   */
  async initializeAppointmentPayment(appointmentId, patientWallet, paymentMethod = 'chapa') {
    try {
      console.log('💳 Initializing payment for appointment:', appointmentId);
      
      const appointment = await Appointment.findByPk(appointmentId, {
        include: [
          {
            model: Patient,
            as: 'patientDetails',
            required: false
          },
          {
            model: Doctor,
            as: 'doctorDetails',
            required: false
          }
        ]
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      // Verify patient owns this appointment
      if (appointment.patientWalletAddress.toLowerCase() !== patientWallet.toLowerCase()) {
        throw new Error('Unauthorized: Patient can only pay for their own appointments');
      }
      
      // PAYMENT-FIRST FLOW: Allow payment for pending appointments
      // Skip approval check for payment-first workflow
      console.log('💳 Payment-first flow: Allowing payment for appointment status:', appointment.status);
      
      // Check if payment is required
      if (appointment.fee <= 0) {
        throw new Error('No payment required for this appointment');
      }
      
      // Check if already paid
      if (appointment.paymentStatus === 'paid') {
        throw new Error('Appointment already paid');
      }
      
      // Get patient and doctor user data
      const patientUser = await User.findOne({
        where: { walletAddress: patientWallet.toLowerCase() }
      });
      
      const doctorUser = await User.findOne({
        where: { walletAddress: appointment.doctorWalletAddress }
      });
      
      if (!patientUser) {
        throw new Error('Patient user not found');
      }
      
      // Extract patient information
      const patientData = this.extractUserData(patientUser);
      
      // Generate unique transaction reference
      const txRef = `ELITE-${Date.now()}-${appointmentId}`;
      
      // Prepare payment data
      const paymentData = {
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        email: patientData.email,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phoneNumber: patientData.phoneNumber,
        txRef,
        title: 'Elite Tena',
        description: `Healthcare consultation payment - ${appointment.reason || 'Medical consultation'}`,
        callbackUrl: `${process.env.BACKEND_URL}/api/payments/callback`,
        returnUrl: `${process.env.FRONTEND_URL}/appointments/${appointmentId}/payment-success`
      };
      
      // Initialize payment with selected provider
      const paymentResult = await paymentService.initializePayment(paymentMethod, paymentData);
      
      if (!paymentResult.success) {
        // For demo purposes, create a mock payment if Chapa is not configured
        const errorMessage = typeof paymentResult.error === 'string' ? paymentResult.error : JSON.stringify(paymentResult.error);
        if (paymentMethod === 'chapa' && errorMessage.includes('secret key')) {
          console.log('🔧 Creating demo payment (Chapa not configured)');
          
          const payment = await Payment.create({
            appointmentId: appointmentId,
            patientWallet: patientWallet.toLowerCase(),
            doctorWallet: appointment.doctorWalletAddress,
            amount: parseFloat(appointment.fee),
            currency: 'ETB',
            status: 'pending',
            paymentMethod: paymentMethod,
            transactionId: txRef,
            providerData: { demo: true, message: 'Demo payment - Chapa not configured' }
          });
          
          await appointment.update({ paymentStatus: 'pending' });
          
          return {
            success: true,
            demo: true,
            payment: {
              id: payment.id,
              appointmentId: payment.appointmentId,
              amount: payment.amount,
              status: payment.status,
              transactionId: payment.transactionId
            },
            checkoutUrl: `${process.env.FRONTEND_URL}/payments/demo?txRef=${txRef}`,
            txRef,
            message: 'Demo payment initialized (Chapa not configured)'
          };
        }
        
        throw new Error(`Payment initialization failed: ${paymentResult.error}`);
      }
      
      // Create payment record
      const payment = await Payment.create({
        appointmentId: appointmentId,
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet: appointment.doctorWalletAddress,
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        status: 'pending',
        paymentMethod: paymentMethod,
        transactionId: txRef,
        providerData: paymentResult.data,
        customerEmail: patientData.email,
        customerPhone: patientData.phoneNumber
      });
      
      // Update appointment payment status
      await appointment.update({ paymentStatus: 'pending' });
      
      console.log('✅ Payment initialized successfully');
      
      return {
        success: true,
        payment: {
          id: payment.id,
          appointmentId: payment.appointmentId,
          amount: payment.amount,
          status: payment.status,
          transactionId: payment.transactionId
        },
        checkoutUrl: paymentResult.checkoutUrl || paymentResult.data?.checkout_url,
        txRef,
        provider: paymentMethod
      };
      
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✅ STEP 4: Verify and complete payment
   */
  async verifyAppointmentPayment(txRef, provider = 'chapa') {
    try {
      console.log('✅ Verifying payment:', txRef);
      
      // Find payment record
      const payment = await Payment.findOne({
        where: { transactionId: txRef },
        include: [{
          model: Appointment,
          as: 'appointment'
        }]
      });
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // If already verified, return current status
      if (payment.status === 'completed') {
        return {
          success: true,
          status: 'completed',
          payment: payment,
          message: 'Payment already verified'
        };
      }
      
      // Handle demo payments
      if (payment.providerData && payment.providerData.demo) {
        console.log('🔧 Demo payment verification');
        
        const createdTime = new Date(payment.createdAt).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - createdTime;
        
        if (timeDiff > 5000) { // 5 seconds for demo
          await payment.update({
            status: 'completed',
            providerTransactionId: txRef,
            verifiedAt: new Date()
          });
          
          // Update appointment status
          if (payment.appointment) {
            await payment.appointment.update({
              paymentStatus: 'paid',
              status: 'scheduled' // Ready for consultation
            });
          }
          
          return {
            success: true,
            status: 'completed',
            payment: payment,
            demo: true,
            message: 'Demo payment completed'
          };
        } else {
          return {
            success: true,
            status: 'pending',
            payment: payment,
            demo: true,
            message: 'Demo payment still processing'
          };
        }
      }
      
      // Verify with payment provider
      const verificationResult = await paymentService.verifyPayment(provider, txRef);
      
      if (!verificationResult.success) {
        await payment.update({
          status: 'failed',
          failureReason: verificationResult.error,
          verifiedAt: new Date()
        });
        
        throw new Error(`Payment verification failed: ${verificationResult.error}`);
      }
      
      // Determine payment status
      let paymentStatus = 'failed';
      let providerTransactionId = null;
      
      if (provider === 'chapa') {
        paymentStatus = verificationResult.status === 'success' ? 'completed' : 'failed';
        providerTransactionId = verificationResult.data?.tx_ref || verificationResult.data?.reference;
      } else if (provider === 'telebirr') {
        paymentStatus = verificationResult.status === 'TRADE_SUCCESS' ? 'completed' : 'failed';
        providerTransactionId = verificationResult.data?.outTradeNo;
      }
      
      // Update payment record
      await payment.update({
        status: paymentStatus,
        providerTransactionId,
        providerData: verificationResult.data,
        verifiedAt: new Date(),
        failureReason: paymentStatus === 'failed' ? 'Payment not successful' : null
      });
      
      // Update appointment if payment successful
      if (paymentStatus === 'completed' && payment.appointment) {
        await payment.appointment.update({
          paymentStatus: 'paid',
          status: 'scheduled' // Ready for consultation
        });
        
        // Send confirmation to both patient and doctor
        await this.sendNotificationToPatient(payment.appointment, 'payment_completed', {
          title: 'Payment Successful',
          message: 'Your payment has been processed. Appointment confirmed.',
          amount: payment.amount
        });
        
        await this.sendNotificationToDoctor(payment.appointment, 'payment_received', {
          title: 'Payment Received',
          message: `Payment of ${payment.amount} ETB received for appointment`,
          amount: payment.amount
        });
      }
      
      console.log('✅ Payment verification completed:', paymentStatus);
      
      return {
        success: true,
        status: paymentStatus,
        payment: payment,
        providerData: verificationResult.data
      };
      
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📊 Get appointment payment status and next steps
   */
  async getAppointmentPaymentStatus(appointmentId) {
    try {
      const appointment = await Appointment.findByPk(appointmentId, {
        include: [{
          model: Payment,
          as: 'payments',
          order: [['createdAt', 'DESC']],
          limit: 1
        }]
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      const latestPayment = appointment.payments && appointment.payments[0];
      
      // Determine current phase and next steps
      let currentPhase = 'scheduled';
      let nextSteps = [];
      let canProceed = false;
      
      // ALL APPOINTMENTS NOW REQUIRE APPROVAL
      if (appointment.approvalStatus === 'pending') {
        currentPhase = 'awaiting_approval';
        nextSteps.push('Doctor needs to approve the appointment');
      } else if (appointment.approvalStatus === 'rejected') {
        currentPhase = 'rejected';
        nextSteps.push('Appointment was declined by doctor');
      } else if (appointment.approvalStatus === 'approved') {
        if (appointment.fee > 0) {
          if (appointment.paymentStatus === 'pending') {
            currentPhase = 'awaiting_payment';
            nextSteps.push('Payment required to confirm appointment');
          } else if (appointment.paymentStatus === 'paid') {
            currentPhase = 'confirmed';
            nextSteps.push('Appointment confirmed - ready for consultation');
            canProceed = true;
          }
        } else {
          currentPhase = 'confirmed';
          nextSteps.push('Appointment confirmed - no payment required');
          canProceed = true;
        }
      }
      
      return {
        success: true,
        appointmentId,
        currentPhase,
        nextSteps,
        canProceed,
        details: {
          requiresApproval: appointment.requiresApproval,
          approvalStatus: appointment.approvalStatus,
          fee: appointment.fee,
          paymentStatus: appointment.paymentStatus,
          latestPayment: latestPayment ? {
            id: latestPayment.id,
            amount: latestPayment.amount,
            status: latestPayment.status,
            transactionId: latestPayment.transactionId,
            createdAt: latestPayment.createdAt
          } : null
        }
      };
      
    } catch (error) {
      console.error('❌ Get payment status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for fee calculation
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
        return parseFloat(paymentSettings.inPersonFee) || 0;
    }
  }
  
  getDefaultFee(serviceType) {
    const defaultFees = {
      inPerson: 0,      // Usually free
      videoCall: 100,   // 100 ETB
      chat: 50          // 50 ETB
    };
    return defaultFees[serviceType] || 0;
  }
  
  applySpecialtyMultiplier(baseFee, specialty) {
    return baseFee * this.getSpecialtyMultiplier(specialty);
  }
  
  getSpecialtyMultiplier(specialty) {
    const multipliers = {
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
    return multipliers[specialty] || 1.0;
  }
  
  applyUrgencyMultiplier(baseFee, priority) {
    return baseFee * this.getUrgencyMultiplier(priority);
  }
  
  getUrgencyMultiplier(priority) {
    const multipliers = {
      'routine': 1.0,
      'urgent': 1.25,
      'emergency': 1.5
    };
    return multipliers[priority] || 1.0;
  }
  
  applyTimeMultiplier(baseFee, appointmentDate) {
    return baseFee * this.getTimeMultiplier(appointmentDate);
  }
  
  getTimeMultiplier(appointmentDate) {
    const date = new Date(appointmentDate);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Weekend multiplier
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 1.3;
    }
    
    // After hours multiplier
    if (hour < 8 || hour >= 18) {
      return 1.25;
    }
    
    return 1.0;
  }
  
  applyDurationMultiplier(baseFee, duration) {
    return baseFee * this.getDurationMultiplier(duration);
  }
  
  getDurationMultiplier(duration) {
    const standardDuration = 30;
    
    if (duration <= standardDuration) {
      return 1.0;
    }
    
    const extraMinutes = duration - standardDuration;
    const extraBlocks = Math.ceil(extraMinutes / 15);
    const extraFeePerBlock = 0.2;
    
    return 1.0 + (extraBlocks * extraFeePerBlock);
  }

  // Helper methods for user data extraction
  extractUserData(user) {
    const profileData = user.profileData || {};
    
    return {
      email: user.email,
      firstName: profileData.firstName || profileData.name?.split(' ')[0] || 'Patient',
      lastName: profileData.lastName || profileData.name?.split(' ').slice(1).join(' ') || '',
      phoneNumber: profileData.phoneNumber || profileData.phone || '+251900000000'
    };
  }

  // Helper methods for notifications
  async sendNotificationToPatient(appointment, type, data) {
    try {
      const { sendNotification } = await import('./socketService.js');
      await sendNotification(appointment.patientWalletAddress, type, {
        ...data,
        appointmentId: appointment.id,
        priority: 'high'
      });
    } catch (error) {
      console.error('⚠️ Failed to send patient notification:', error.message);
    }
  }

  async sendNotificationToDoctor(appointment, type, data) {
    try {
      const { sendNotification } = await import('./socketService.js');
      await sendNotification(appointment.doctorWalletAddress, type, {
        ...data,
        appointmentId: appointment.id,
        priority: 'medium'
      });
    } catch (error) {
      console.error('⚠️ Failed to send doctor notification:', error.message);
    }
  }
}

export default new AppointmentPaymentFlow();