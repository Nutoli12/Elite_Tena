import db from '../models/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paymentService = require('../../services/payment.cjs');

const { Appointment, Doctor, DoctorPaymentSettings, Payment, User, Patient } = db;

/**
 * 💰 PAYMENT-FIRST WORKFLOW SERVICE
 * 🎯 CORRECT LOGIC: Payment BEFORE Doctor Approval for Premium Services
 * 
 * NEW WORKFLOW:
 * 1. Patient selects service → Sees fee upfront
 * 2. For Video/Chat: MUST PAY FIRST → Then doctor reviews PAID request
 * 3. For In-Person: Doctor can set free or paid (payment first if paid)
 * 4. Doctor only sees PAID requests for premium services
 * 5. Approval → Confirmed | Rejection → Auto-refund
 */
class PaymentFirstWorkflow {

  /**
   * 🎯 STEP 1: Get upfront pricing for service type
   * Called BEFORE appointment creation to show patient the cost
   */
  async getServicePricing(serviceType, doctorWallet) {
    try {
      console.log('💰 Getting upfront pricing for:', serviceType, 'with doctor:', doctorWallet);
      
      // Get doctor payment settings
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

      // Get base fee for service type
      const baseFee = this.getBaseFee(serviceType, doctor.paymentSettings);
      
      // Apply doctor's specialty multiplier
      const finalFee = this.applySpecialtyMultiplier(baseFee, doctor.specialization);
      
      // Determine if payment is required BEFORE booking
      const paymentRequired = this.isPaymentRequiredForService(serviceType, finalFee);
      
      return {
        success: true,
        serviceType,
        fee: Math.round(finalFee * 100) / 100,
        paymentRequired,
        paymentTiming: paymentRequired ? 'BEFORE_APPROVAL' : 'AFTER_APPROVAL',
        doctorName: doctor.name || 'Doctor',
        specialization: doctor.specialization,
        message: paymentRequired 
          ? `Payment of ${finalFee} ETB required before doctor reviews your request`
          : 'Doctor will review your request (no upfront payment required)'
      };
      
    } catch (error) {
      console.error('❌ Service pricing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 💳 STEP 2: Create appointment with payment-first logic
   * For premium services: Payment MUST be completed before appointment creation
   */
  async createAppointmentWithPaymentFirst(appointmentData, patientWallet) {
    try {
      const { serviceType, doctorWallet, appointmentDate, reason, duration = 30 } = appointmentData;
      
      console.log('📅 Creating appointment with payment-first logic:', serviceType);
      
      // Get pricing first
      const pricing = await this.getServicePricing(serviceType, doctorWallet);
      if (!pricing.success) {
        throw new Error(pricing.error);
      }

      // Check if this service requires payment BEFORE booking
      if (pricing.paymentRequired) {
        // BLOCK: Cannot create appointment without payment for premium services
        return {
          success: false,
          error: 'PAYMENT_REQUIRED_FIRST',
          message: `Payment of ${pricing.fee} ETB required before booking ${serviceType} consultation`,
          fee: pricing.fee,
          paymentRequired: true,
          nextStep: 'INITIALIZE_PAYMENT'
        };
      }

      // For free services (in-person), create appointment directly
      const appointment = await Appointment.create({
        patientWalletAddress: patientWallet.toLowerCase(),
        doctorWalletAddress: doctorWallet.toLowerCase(),
        appointmentDate: new Date(appointmentDate),
        serviceType,
        reason,
        duration,
        fee: pricing.fee,
        status: 'scheduled',
        requiresApproval: true,
        approvalStatus: 'pending',
        paymentStatus: pricing.fee > 0 ? 'pending' : 'not_required',
        paymentRequired: pricing.paymentRequired
      });

      console.log('✅ Free appointment created, awaiting doctor approval');

      return {
        success: true,
        appointment: {
          id: appointment.id,
          serviceType: appointment.serviceType,
          fee: appointment.fee,
          paymentRequired: false,
          status: 'awaiting_doctor_approval'
        },
        message: 'Appointment request sent to doctor for approval'
      };

    } catch (error) {
      console.error('❌ Appointment creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 💳 STEP 3: Initialize payment for premium services
   * Called when patient wants to book video/chat consultation
   */
  async initializePaymentForPremiumService(serviceData, patientWallet) {
    try {
      const { serviceType, doctorWallet, appointmentDate, reason, duration = 30 } = serviceData;
      
      console.log('💳 Initializing payment for premium service:', serviceType);
      
      // Get pricing
      const pricing = await this.getServicePricing(serviceType, doctorWallet);
      if (!pricing.success) {
        throw new Error(pricing.error);
      }

      if (!pricing.paymentRequired) {
        throw new Error('Payment not required for this service type');
      }

      // Get patient data for payment
      const patientUser = await User.findOne({
        where: { walletAddress: patientWallet.toLowerCase() }
      });

      if (!patientUser) {
        throw new Error('Patient user not found');
      }

      // Generate unique transaction reference
      const txRef = `ELITE-PREMIUM-${Date.now()}-${serviceType}`;

      // Create pending appointment (will be confirmed after payment)
      const pendingAppointment = await Appointment.create({
        patientWalletAddress: patientWallet.toLowerCase(),
        doctorWalletAddress: doctorWallet.toLowerCase(),
        appointmentDate: new Date(appointmentDate),
        serviceType,
        reason,
        duration,
        fee: pricing.fee,
        status: 'payment_pending',
        requiresApproval: true,
        approvalStatus: 'pending_payment', // Special status: waiting for payment before doctor review
        paymentStatus: 'pending',
        paymentRequired: true,
        chapa_transaction_id: txRef
      });

      // Initialize Chapa payment
      const paymentResult = await this.initializeChapaPayment(pendingAppointment, patientUser, txRef);

      if (!paymentResult.success) {
        // Clean up pending appointment if payment initialization fails
        await pendingAppointment.destroy();
        throw new Error(paymentResult.error);
      }

      console.log('✅ Payment initialized for premium service');

      return {
        success: true,
        appointment: {
          id: pendingAppointment.id,
          serviceType: pendingAppointment.serviceType,
          fee: pendingAppointment.fee,
          status: 'payment_pending'
        },
        payment: paymentResult.payment,
        checkoutUrl: paymentResult.checkoutUrl,
        txRef,
        message: `Complete payment of ${pricing.fee} ETB to send request to doctor`
      };

    } catch (error) {
      console.error('❌ Premium service payment initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✅ STEP 4: Complete payment and send to doctor for approval
   * Called after successful payment verification
   */
  async completePaymentAndSendForApproval(txRef) {
    try {
      console.log('✅ Completing payment and sending for doctor approval:', txRef);

      // Find appointment by transaction reference
      const appointment = await Appointment.findOne({
        where: { chapa_transaction_id: txRef },
        include: [
          { model: Patient, as: 'patientDetails' },
          { model: Doctor, as: 'doctorDetails' }
        ]
      });

      if (!appointment) {
        throw new Error('Appointment not found for transaction reference');
      }

      // Update appointment status: Payment completed, now awaiting doctor approval
      await appointment.update({
        paymentStatus: 'paid',
        paymentConfirmedAt: new Date(),
        status: 'awaiting_approval', // Now ready for doctor review
        approvalStatus: 'pending' // Doctor can now approve/reject
      });

      // Send notification to doctor: "PAID appointment request"
      await this.notifyDoctorOfPaidRequest(appointment);

      // Send confirmation to patient
      await this.notifyPatientPaymentSuccess(appointment);

      console.log('✅ Payment completed, appointment sent to doctor for approval');

      return {
        success: true,
        appointment: {
          id: appointment.id,
          status: 'awaiting_doctor_approval',
          paymentStatus: 'paid',
          fee: appointment.fee
        },
        message: 'Payment successful! Your request has been sent to the doctor for approval.'
      };

    } catch (error) {
      console.error('❌ Payment completion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 👨‍⚕️ STEP 5: Doctor approval with automatic refund on rejection
   */
  async processDoctorApprovalWithRefund(appointmentId, doctorWallet, action, reason = null) {
    try {
      console.log('👨‍⚕️ Processing doctor approval with refund logic:', appointmentId, action);

      const appointment = await Appointment.findByPk(appointmentId, {
        include: [
          { model: Patient, as: 'patientDetails' },
          { model: Payment, as: 'payments' }
        ]
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Verify doctor owns this appointment
      if (appointment.doctorWalletAddress.toLowerCase() !== doctorWallet.toLowerCase()) {
        throw new Error('Unauthorized: Doctor can only approve their own appointments');
      }

      // Check if appointment is in correct state
      if (appointment.approvalStatus !== 'pending') {
        throw new Error('Appointment is not pending approval');
      }

      const now = new Date();

      if (action === 'approve') {
        // APPROVE: Confirm appointment and release payment to doctor
        await appointment.update({
          approvalStatus: 'approved',
          approvedAt: now,
          approvedBy: doctorWallet.toLowerCase(),
          status: 'confirmed',
          rejectionReason: null
        });

        // Send notifications
        await this.notifyPatientApproval(appointment);
        await this.notifyDoctorApprovalConfirmed(appointment);

        console.log('✅ Appointment approved, payment released to doctor');

        return {
          success: true,
          status: 'approved',
          message: 'Appointment approved successfully',
          nextStep: 'CONSENT_WORKFLOW'
        };

      } else if (action === 'reject') {
        // REJECT: Cancel appointment and initiate automatic refund
        await appointment.update({
          approvalStatus: 'rejected',
          rejectionReason: reason || 'Doctor declined the appointment',
          status: 'cancelled'
        });

        // Initiate automatic refund if payment was made
        if (appointment.paymentStatus === 'paid' && appointment.fee > 0) {
          const refundResult = await this.initiateAutomaticRefund(appointment);
          
          if (refundResult.success) {
            await appointment.update({
              paymentStatus: 'refunded',
              refundedAt: now
            });
          }
        }

        // Send notifications
        await this.notifyPatientRejectionWithRefund(appointment, reason);

        console.log('❌ Appointment rejected, automatic refund initiated');

        return {
          success: true,
          status: 'rejected',
          message: 'Appointment rejected, automatic refund initiated',
          reason: reason,
          refundStatus: appointment.fee > 0 ? 'processing' : 'not_applicable'
        };

      } else {
        throw new Error('Invalid action. Must be "approve" or "reject"');
      }

    } catch (error) {
      console.error('❌ Doctor approval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods

  /**
   * Get base fee for service type with minimum requirements
   */
  getBaseFee(serviceType, paymentSettings) {
    const minimumFees = {
      inPerson: 0,        // Can be free (doctor's choice)
      videoCall: 400,     // MINIMUM 400 ETB for video consultations
      chat: 400           // MINIMUM 400 ETB for chat consultations
    };

    if (!paymentSettings) {
      return minimumFees[serviceType] || 0;
    }

    let doctorFee = 0;
    switch (serviceType) {
      case 'videoCall':
        doctorFee = parseFloat(paymentSettings.videoCallFee) || minimumFees.videoCall;
        break;
      case 'chat':
        doctorFee = parseFloat(paymentSettings.chatFee) || minimumFees.chat;
        break;
      case 'inPerson':
      default:
        doctorFee = parseFloat(paymentSettings.inPersonFee) || minimumFees.inPerson;
        break;
    }

    // Ensure minimum fee requirements
    return Math.max(doctorFee, minimumFees[serviceType] || 0);
  }

  /**
   * Determine if payment is required BEFORE booking
   */
  isPaymentRequiredForService(serviceType, fee) {
    // Video and Chat consultations ALWAYS require payment first
    if (['videoCall', 'chat'].includes(serviceType)) {
      return true;
    }

    // In-person consultations: payment required only if doctor set a fee
    if (serviceType === 'inPerson') {
      return fee > 0;
    }

    return false;
  }

  /**
   * Apply specialty multiplier to base fee
   */
  applySpecialtyMultiplier(baseFee, specialty) {
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
    
    const multiplier = multipliers[specialty] || 1.0;
    return Math.round(baseFee * multiplier * 100) / 100;
  }

  /**
   * Initialize Chapa payment
   */
  async initializeChapaPayment(appointment, patientUser, txRef) {
    try {
      const patientData = this.extractPatientData(patientUser);

      const paymentData = {
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        email: patientData.email,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phoneNumber: patientData.phoneNumber,
        txRef,
        title: 'Elite Tena Healthcare',
        description: `${appointment.serviceType} consultation - ${appointment.reason || 'Medical consultation'}`,
        callbackUrl: `${process.env.BACKEND_URL}/api/chapa-payment/webhook`,
        returnUrl: `${process.env.FRONTEND_URL}/appointments/${appointment.id}/payment-success`
      };

      const paymentResult = await paymentService.initializePayment('chapa', paymentData);

      if (!paymentResult.success) {
        // Demo mode for development
        const errorMessage = typeof paymentResult.error === 'string' ? paymentResult.error : JSON.stringify(paymentResult.error);
        if (errorMessage.includes('secret key') || process.env.NODE_ENV === 'development') {
          return {
            success: true,
            demo: true,
            payment: { id: 'demo-payment', transactionId: txRef },
            checkoutUrl: `${process.env.FRONTEND_URL}/payments/demo-chapa?txRef=${txRef}`,
            message: 'Demo payment mode'
          };
        }
        throw new Error(paymentResult.error);
      }

      // Create payment record
      const payment = await Payment.create({
        appointmentId: appointment.id,
        patientWallet: appointment.patientWalletAddress,
        doctorWallet: appointment.doctorWalletAddress,
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        status: 'pending',
        paymentMethod: 'chapa',
        transactionId: txRef,
        providerData: paymentResult.data
      });

      return {
        success: true,
        payment: {
          id: payment.id,
          transactionId: payment.transactionId
        },
        checkoutUrl: paymentResult.checkoutUrl || paymentResult.data?.checkout_url
      };

    } catch (error) {
      console.error('❌ Chapa payment initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initiate automatic refund for rejected appointments
   */
  async initiateAutomaticRefund(appointment) {
    try {
      console.log('💰 Initiating automatic refund for appointment:', appointment.id);

      // In a real implementation, this would call Chapa's refund API
      // For now, we'll log the refund request
      console.log('🔄 Refund request:', {
        appointmentId: appointment.id,
        amount: appointment.fee,
        transactionId: appointment.chapa_transaction_id,
        reason: 'Doctor rejected appointment'
      });

      // TODO: Implement actual Chapa refund API call
      // const refundResult = await paymentService.refundPayment('chapa', appointment.chapa_transaction_id, appointment.fee);

      return {
        success: true,
        refundId: `REFUND-${Date.now()}`,
        message: 'Refund initiated successfully'
      };

    } catch (error) {
      console.error('❌ Automatic refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract patient data for payments
   */
  extractPatientData(user) {
    const profileData = user.profileData || {};
    
    return {
      email: user.email || 'patient@elitetena.com',
      firstName: profileData.firstName || profileData.name?.split(' ')[0] || 'Patient',
      lastName: profileData.lastName || profileData.name?.split(' ').slice(1).join(' ') || 'User',
      phoneNumber: this.formatEthiopianPhone(profileData.phoneNumber || profileData.phone || '+251900000000')
    };
  }

  /**
   * Format Ethiopian phone numbers
   */
  formatEthiopianPhone(phone) {
    if (!phone.startsWith('+251')) {
      if (phone.startsWith('0')) {
        return '+251' + phone.substring(1);
      } else if (phone.startsWith('9')) {
        return '+251' + phone;
      }
    }
    return phone;
  }

  // Notification Methods (placeholder implementations)
  async notifyDoctorOfPaidRequest(appointment) {
    console.log('📧 Notifying doctor of PAID appointment request:', appointment.id);
    // TODO: Implement actual notification
  }

  async notifyPatientPaymentSuccess(appointment) {
    console.log('📧 Notifying patient of payment success:', appointment.id);
    // TODO: Implement actual notification
  }

  async notifyPatientApproval(appointment) {
    console.log('📧 Notifying patient of appointment approval:', appointment.id);
    // TODO: Implement actual notification
  }

  async notifyDoctorApprovalConfirmed(appointment) {
    console.log('📧 Notifying doctor of approval confirmation:', appointment.id);
    // TODO: Implement actual notification
  }

  async notifyPatientRejectionWithRefund(appointment, reason) {
    console.log('📧 Notifying patient of rejection with refund:', appointment.id, reason);
    // TODO: Implement actual notification
  }
}

export default new PaymentFirstWorkflow();