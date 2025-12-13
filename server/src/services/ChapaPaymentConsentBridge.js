import db from '../models/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paymentService = require('../../services/payment.cjs');

const { Appointment, Doctor, Patient, User, Payment, Consent, Notification } = db;

/**
 * 🔗 CHAPA PAYMENT-CONSENT BRIDGE SERVICE
 * Integrates Chapa payment system with consent workflow
 * 
 * WORKFLOW:
 * 1. Appointment Booking → Doctor Approval
 * 2. Payment Required → Chapa Integration
 * 3. Payment Success → Auto-Consent Request
 * 4. Consent Granted → Consultation Unlocked
 */
class ChapaPaymentConsentBridge {

  /**
   * 💳 Initialize Chapa payment for approved appointment
   * Enhanced with Ethiopian payment specifics
   */
  async initializeChapaPayment(appointmentId, patientWallet, paymentData = {}) {
    try {
      console.log('�  DEBUG: ChapaPaymentConsentBridge.initializeChapaPayment called');
      console.log('💳 Initializing Chapa payment for appointment:', appointmentId);

      const appointment = await Appointment.findByPk(appointmentId, {
        include: [
          { model: Patient, as: 'patientDetails' },
          { model: Doctor, as: 'doctorDetails' }
        ]
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // PAYMENT-FIRST FLOW: Allow payment for pending appointments
      // Skip approval check for payment-first workflow
      console.log('💳 Payment-first flow: Allowing payment for appointment status:', appointment.status);

      if (appointment.fee <= 0) {
        throw new Error('No payment required for this appointment');
      }

      if (appointment.paymentStatus === 'paid') {
        throw new Error('Appointment already paid');
      }

      // Get patient user data for Chapa
      const patientUser = await User.findOne({
        where: { walletAddress: patientWallet.toLowerCase() }
      });

      if (!patientUser) {
        throw new Error('Patient user not found');
      }

      // Extract Ethiopian-specific patient data
      const patientData = this.extractEthiopianPatientData(patientUser);

      // Generate unique transaction reference (max 50 characters)
      const txRef = `ELITE-${Date.now()}-${appointmentId.substring(0, 8)}`;

      // Prepare description (max 50 characters, only letters, numbers, hyphens, underscores, spaces, dots)
      const serviceDesc = this.getServiceTypeDescription(appointment.serviceType);
      const reason = appointment.reason || 'Medical consultation';
      let description = `${serviceDesc} - ${reason}`;
      
      // Clean description to meet Chapa requirements
      description = description
        .replace(/[^a-zA-Z0-9\-_\s\.]/g, '') // Remove invalid characters
        .substring(0, 50); // Limit to 50 characters

      // Prepare Chapa payment data with Ethiopian specifics
      const chapaPaymentData = {
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        email: patientData.email,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phoneNumber: patientData.phoneNumber,
        txRef,
        title: 'Elite Tena',
        description: description,
        callbackUrl: `${process.env.BACKEND_URL}/api/payments/chapa/webhook`,
        returnUrl: `${process.env.FRONTEND_URL}/appointments/${appointmentId}/payment-success`,
        customization: {
          title: 'Elite Tena', // Max 16 characters
          description: 'Ethiopian Healthcare Payment', // Max 50 characters, valid chars only
          logo: `${process.env.FRONTEND_URL}/images/elite-tena-logo.png`
        },
        // Ethiopian payment method preferences
        paymentMethods: ['telebirr', 'cbe_birr', 'awash_birr', 'visa', 'mastercard'],
        ...paymentData
      };

      // Initialize payment with Chapa
      console.log('🔍 DEBUG: Calling paymentService.initializePayment with data:', JSON.stringify(chapaPaymentData, null, 2));
      const paymentResult = await paymentService.initializePayment('chapa', chapaPaymentData);
      console.log('🔍 DEBUG: paymentService result:', JSON.stringify(paymentResult, null, 2));

      if (!paymentResult.success) {
        // Handle Chapa API errors
        const errorMessage = typeof paymentResult.error === 'string' ? paymentResult.error : JSON.stringify(paymentResult.error);
        console.log('⚠️ Chapa API Error:', errorMessage);

        throw new Error(`Chapa payment initialization failed: ${errorMessage}`);
      }

      // Create payment record
      const payment = await Payment.create({
        appointmentId: appointmentId,
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet: appointment.doctorWalletAddress,
        amount: parseFloat(appointment.fee),
        currency: 'ETB',
        status: 'pending',
        paymentMethod: 'chapa',
        transactionId: txRef,
        providerData: paymentResult.data,
        customerEmail: patientData.email,
        customerPhone: patientData.phoneNumber
      });

      // Update appointment with Chapa details
      await appointment.update({
        paymentStatus: 'pending',
        paymentMethod: 'chapa',
        chapa_transaction_id: txRef
      });

      console.log('✅ Chapa payment initialized successfully');

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
        provider: 'chapa'
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
   * ✅ Verify Chapa payment and trigger consent workflow
   */
  async verifyChapaPaymentAndTriggerConsent(txRef) {
    try {
      console.log('✅ Verifying Chapa payment and triggering consent:', txRef);

      // Find payment record
      const payment = await Payment.findOne({
        where: { transactionId: txRef },
        include: [{
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Patient, as: 'patientDetails' },
            { model: Doctor, as: 'doctorDetails' }
          ]
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
          message: 'Payment already verified and consent triggered'
        };
      }

      // Check if payment is still pending verification
      if (payment.status === 'pending') {
        console.log('🔄 Payment pending Chapa verification');
        
        const createdTime = new Date(payment.createdAt).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - createdTime;
        
        // Auto-complete test payments after 10 seconds for development
        if (timeDiff > 10000 && process.env.NODE_ENV === 'development') {
          console.log('🧪 Auto-completing test payment for development');
          await this.completeChapaPaymentAndTriggerConsent(payment);
          
          return {
            success: true,
            status: 'completed',
            payment: payment,
            message: 'Test payment completed successfully'
          };
        } else {
          return {
            success: true,
            status: 'processing',
            payment: payment,
            message: 'Payment verification in progress'
          };
        }
      }

      // Verify with Chapa API
      const verificationResult = await paymentService.verifyPayment('chapa', txRef);

      if (!verificationResult.success) {
        await payment.update({
          status: 'failed',
          failureReason: verificationResult.error,
          verifiedAt: new Date()
        });

        throw new Error(`Chapa payment verification failed: ${verificationResult.error}`);
      }

      // Check payment status from Chapa
      const isPaymentSuccessful = verificationResult.status === 'success';
      const paymentStatus = isPaymentSuccessful ? 'completed' : 'failed';

      // Update payment record
      await payment.update({
        status: paymentStatus,
        providerTransactionId: verificationResult.data?.tx_ref || verificationResult.data?.reference,
        providerData: verificationResult.data,
        verifiedAt: new Date(),
        failureReason: paymentStatus === 'failed' ? 'Payment not successful' : null
      });

      if (isPaymentSuccessful) {
        await this.completeChapaPaymentAndTriggerConsent(payment);
      }

      console.log('✅ Chapa payment verification completed:', paymentStatus);

      return {
        success: true,
        status: paymentStatus,
        payment: payment,
        providerData: verificationResult.data
      };

    } catch (error) {
      console.error('❌ Chapa payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔗 Complete payment and trigger consent workflow
   * This is the key integration point between payment and consent
   */
  async completeChapaPaymentAndTriggerConsent(payment) {
    try {
      console.log('🔗 Completing payment and triggering consent workflow');

      const appointment = payment.appointment;
      if (!appointment) {
        throw new Error('Appointment not found for payment');
      }

      // 1. Update appointment status
      await appointment.update({
        paymentStatus: 'paid',
        paymentConfirmedAt: new Date(),
        status: 'confirmed' // Ready for consultation
      });

      // 2. Auto-request consent from patient
      const consentResult = await this.autoRequestConsentAfterPayment(appointment);

      // 3. Send notifications
      await this.sendPaymentSuccessNotifications(appointment, payment);

      // 4. Log the successful integration
      console.log('✅ Payment-Consent integration completed:', {
        appointmentId: appointment.id,
        paymentAmount: payment.amount,
        consentRequested: consentResult.success
      });

      return {
        success: true,
        appointmentConfirmed: true,
        consentRequested: consentResult.success,
        consentId: consentResult.consentId
      };

    } catch (error) {
      console.error('❌ Payment-Consent integration error:', error);
      throw error;
    }
  }

  /**
   * 🤝 Auto-request consent after successful payment
   */
  async autoRequestConsentAfterPayment(appointment) {
    try {
      console.log('🤝 Auto-requesting consent after payment');

      // Check if consent already exists
      const existingConsent = await Consent.findOne({
        where: {
          patientWalletAddress: appointment.patientWalletAddress,
          doctorWalletAddress: appointment.doctorWalletAddress,
          status: ['pending', 'active'],
          appointmentId: appointment.id
        }
      });

      if (existingConsent) {
        console.log('ℹ️ Consent already exists for this appointment');
        return {
          success: true,
          consentId: existingConsent.id,
          message: 'Consent already exists'
        };
      }

      // Calculate consent expiration (24 hours after appointment)
      const appointmentDate = new Date(appointment.appointmentDate);
      const expiresAt = new Date(appointmentDate.getTime() + (24 * 60 * 60 * 1000));

      // Create consent request with appointment-specific permissions
      const consent = await Consent.create({
        patientWalletAddress: appointment.patientWalletAddress,
        doctorWalletAddress: appointment.doctorWalletAddress,
        appointmentId: appointment.id,
        permissions: this.getAppointmentSpecificPermissions(appointment.serviceType),
        purpose: `Medical consultation - ${appointment.reason || 'Healthcare service'}`,
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: expiresAt,
        requestReason: `Automatic consent request after payment confirmation for ${appointment.serviceType} appointment`
      });

      // Send consent request notification to patient
      await this.sendConsentRequestNotification(appointment, consent);

      console.log('✅ Consent auto-requested successfully');

      return {
        success: true,
        consentId: consent.id,
        message: 'Consent request sent to patient'
      };

    } catch (error) {
      console.error('❌ Auto-consent request error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔒 Check if consultation can proceed (payment + consent)
   */
  async checkConsultationAccess(appointmentId) {
    try {
      const appointment = await Appointment.findByPk(appointmentId, {
        include: [{
          model: Consent,
          as: 'consent',
          where: { status: 'active' },
          required: false
        }]
      });

      if (!appointment) {
        return {
          canAccess: false,
          reason: 'Appointment not found'
        };
      }

      // Free appointment: Only needs consent
      if (appointment.fee === 0) {
        const hasConsent = appointment.consent && appointment.consent.status === 'active';
        return {
          canAccess: hasConsent,
          reason: hasConsent ? 'Access granted' : 'Patient consent required',
          requiresPayment: false,
          requiresConsent: !hasConsent
        };
      }

      // Paid appointment: Needs BOTH payment AND consent
      const isPaid = appointment.paymentStatus === 'paid';
      const hasConsent = appointment.consent && appointment.consent.status === 'active';

      return {
        canAccess: isPaid && hasConsent,
        reason: !isPaid ? 'Payment required' : !hasConsent ? 'Patient consent required' : 'Access granted',
        requiresPayment: !isPaid,
        requiresConsent: !hasConsent,
        paymentStatus: appointment.paymentStatus,
        consentStatus: appointment.consent?.status || 'not_requested'
      };

    } catch (error) {
      console.error('❌ Consultation access check error:', error);
      return {
        canAccess: false,
        reason: 'Access check failed',
        error: error.message
      };
    }
  }

  /**
   * 📱 Handle Chapa webhook for real-time payment updates
   */
  async handleChapaWebhook(webhookData) {
    try {
      console.log('📱 Processing Chapa webhook:', webhookData);

      const { tx_ref, status, amount, customer } = webhookData;

      if (!tx_ref) {
        throw new Error('Transaction reference missing in webhook');
      }

      // Find payment by transaction reference
      const payment = await Payment.findOne({
        where: { transactionId: tx_ref },
        include: [{ model: Appointment, as: 'appointment' }]
      });

      if (!payment) {
        console.log('⚠️ Payment not found for webhook tx_ref:', tx_ref);
        return { success: false, error: 'Payment not found' };
      }

      // Update payment status based on webhook
      const paymentStatus = status === 'success' ? 'completed' : 'failed';
      
      await payment.update({
        status: paymentStatus,
        providerData: webhookData,
        verifiedAt: new Date(),
        failureReason: paymentStatus === 'failed' ? 'Payment failed via webhook' : null
      });

      // If payment successful, trigger consent workflow
      if (paymentStatus === 'completed') {
        await this.completeChapaPaymentAndTriggerConsent(payment);
      }

      console.log('✅ Chapa webhook processed successfully');

      return {
        success: true,
        status: paymentStatus,
        message: 'Webhook processed successfully'
      };

    } catch (error) {
      console.error('❌ Chapa webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods

  /**
   * Extract Ethiopian-specific patient data for Chapa
   */
  extractEthiopianPatientData(user) {
    const profileData = user.profileData || {};
    
    // Handle Ethiopian phone number format with proper validation
    let phoneNumber = profileData.phoneNumber || profileData.phone || '+251911234567';
    
    // Clean and validate phone number
    phoneNumber = this.validateAndFixEthiopianPhoneNumber(phoneNumber);

    return {
      email: user.email || 'patient@elitetena.com',
      firstName: profileData.firstName || profileData.name?.split(' ')[0] || 'Patient',
      lastName: profileData.lastName || profileData.name?.split(' ').slice(1).join(' ') || 'User',
      phoneNumber: phoneNumber
    };
  }

  /**
   * Validate and fix Ethiopian phone number format for Chapa
   */
  validateAndFixEthiopianPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return '+251911234567'; // Default valid Ethiopian number
    }

    // Convert to string and clean
    let cleaned = phoneNumber.toString().trim().replace(/[\s-]/g, '');

    // Handle different input formats
    if (cleaned.startsWith('0')) {
      // Local format: 0911234567 -> +251911234567
      cleaned = '+251' + cleaned.substring(1);
    } else if (cleaned.startsWith('251') && !cleaned.startsWith('+251')) {
      // Missing +: 251911234567 -> +251911234567
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('9') && cleaned.length >= 9) {
      // Mobile number without country code: 911234567 -> +251911234567
      cleaned = '+251' + cleaned;
    } else if (!cleaned.startsWith('+251')) {
      // Invalid format, use default
      return '+251911234567';
    }

    // Validate Ethiopian phone number format
    // Format: +251XXXXXXXXX (13 digits total)
    // Mobile prefixes: 90, 91, 92, 93, 94, 95, 96, 97, 98, 99
    const ethiopianPhoneRegex = /^\+251(9[0-9])\d{7}$/;
    
    if (ethiopianPhoneRegex.test(cleaned)) {
      return cleaned;
    }

    // If too long, try to truncate to proper length
    if (cleaned.startsWith('+251') && cleaned.length > 13) {
      const truncated = cleaned.substring(0, 13);
      if (ethiopianPhoneRegex.test(truncated)) {
        return truncated;
      }
    }

    // If still invalid, return default valid number
    console.log(`⚠️ Invalid Ethiopian phone number: ${phoneNumber}, using default`);
    return '+251911234567';
  }

  /**
   * Get service type description for payment
   */
  getServiceTypeDescription(serviceType) {
    const descriptions = {
      'inPerson': 'In-Person Consultation',
      'videoCall': 'Video Consultation',
      'chat': 'Chat Consultation'
    };
    return descriptions[serviceType] || 'Medical Consultation';
  }

  /**
   * Get appointment-specific consent permissions
   */
  getAppointmentSpecificPermissions(serviceType) {
    const basePermissions = ['viewMedicalHistory', 'createRecords'];
    
    switch (serviceType) {
      case 'videoCall':
        return [...basePermissions, 'videoConsultation', 'recordSession'];
      case 'chat':
        return [...basePermissions, 'chatConsultation', 'messageHistory'];
      case 'inPerson':
      default:
        return [...basePermissions, 'physicalExamination', 'vitalSigns'];
    }
  }

  /**
   * Send payment success notifications
   */
  async sendPaymentSuccessNotifications(appointment, payment) {
    try {
      // Notify patient
      await this.createNotification(appointment.patientWalletAddress, {
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of ${payment.amount} ETB has been confirmed. Doctor will now request consultation consent.`,
        appointmentId: appointment.id,
        priority: 'high'
      });

      // Notify doctor
      await this.createNotification(appointment.doctorWalletAddress, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `Payment of ${payment.amount} ETB received for appointment. Consent request sent to patient.`,
        appointmentId: appointment.id,
        priority: 'medium'
      });

    } catch (error) {
      console.error('⚠️ Failed to send payment notifications:', error.message);
    }
  }

  /**
   * Send consent request notification
   */
  async sendConsentRequestNotification(appointment, consent) {
    try {
      await this.createNotification(appointment.patientWalletAddress, {
        type: 'consent_request',
        title: 'Consultation Consent Required',
        message: `Doctor is requesting your consent for the upcoming ${this.getServiceTypeDescription(appointment.serviceType).toLowerCase()}. Please review and grant access.`,
        appointmentId: appointment.id,
        consentId: consent.id,
        priority: 'high'
      });

    } catch (error) {
      console.error('⚠️ Failed to send consent request notification:', error.message);
    }
  }

  /**
   * Create notification record
   */
  async createNotification(userWallet, notificationData) {
    try {
      await Notification.create({
        userWallet: userWallet,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: {
          appointmentId: notificationData.appointmentId,
          consentId: notificationData.consentId,
          priority: notificationData.priority
        },
        isRead: false
      });
    } catch (error) {
      console.error('⚠️ Failed to create notification:', error.message);
    }
  }
}

export default new ChapaPaymentConsentBridge();