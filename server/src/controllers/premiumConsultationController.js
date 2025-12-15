import db from '../models/index.js';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import DailyVideoService from '../services/DailyVideoService.js';
import EnhancedNotificationService from '../services/enhancedNotificationService.js';
import ChapaPaymentConsentBridge from '../services/ChapaPaymentConsentBridge.js';

const { 
  PremiumConsultation, 
  ConsultationMessage, 
  VideoCallSession,
  ConsultationAvailability,
  User, 
  DoctorPaymentSettings 
} = db;

/**
 * 💬🎥 PREMIUM CONSULTATION CONTROLLER
 * Handles chat and video consultation requests, payments, and sessions
 */

/**
 * Request a new consultation (chat or video)
 * POST /api/premium-consultations/request
 */
export const requestConsultation = async (req, res) => {
  try {
    const {
      patientWallet,
      doctorWallet,
      consultationType, // 'chat' or 'video'
      scheduledTime,    // Required for video
      durationMinutes   // Optional, defaults from doctor settings
    } = req.body;

    console.log('📋 New consultation request:', { patientWallet, doctorWallet, consultationType });

    // Validate required fields
    if (!patientWallet || !doctorWallet || !consultationType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientWallet, doctorWallet, consultationType'
      });
    }

    if (!['chat', 'video'].includes(consultationType)) {
      return res.status(400).json({
        success: false,
        error: 'consultationType must be "chat" or "video"'
      });
    }

    // Video consultations require scheduled time
    if (consultationType === 'video' && !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Video consultations require a scheduledTime'
      });
    }

    // Get patient and doctor
    const [patient, doctor] = await Promise.all([
      User.findOne({ where: { walletAddress: patientWallet.toLowerCase() } }),
      User.findOne({ where: { walletAddress: doctorWallet.toLowerCase() } })
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    // Get doctor's payment settings for pricing
    const paymentSettings = await DoctorPaymentSettings.findOne({
      where: { doctorWalletAddress: doctorWallet.toLowerCase() }
    });

    // Determine fee and duration
    let consultationFee, duration;
    if (consultationType === 'chat') {
      consultationFee = paymentSettings?.chatConsultationFee || paymentSettings?.chatFee || 500;
      duration = paymentSettings?.chatDurationHours || 24;
    } else {
      consultationFee = paymentSettings?.videoConsultationFee || paymentSettings?.videoCallFee || 800;
      duration = durationMinutes || paymentSettings?.videoSlotDurationMinutes || 30;
    }

    // Create consultation record
    const consultation = await PremiumConsultation.create({
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: doctorWallet.toLowerCase(),
      consultationType,
      scheduledTime: consultationType === 'video' ? new Date(scheduledTime) : null,
      durationMinutes: consultationType === 'video' ? duration : null,
      consultationFee,
      currency: 'ETB',
      status: 'payment_pending',
      chatRoomId: consultationType === 'chat' ? `chat-${uuidv4()}` : null
    });

    // Notify doctor
    const patientName = patient.name || patient.profileData?.fullName || patient.profileData?.firstName || 'A patient';
    await EnhancedNotificationService.sendToUser(
      doctorWallet,
      'consultation_request',
      {
        title: `New ${consultationType} consultation request`,
        message: `${patientName} has requested a ${consultationType} consultation`,
        relatedId: consultation.id,
        relatedType: 'consultation'
      }
    );

    console.log('✅ Consultation created:', consultation.id);

    res.status(201).json({
      success: true,
      message: 'Consultation request created',
      data: {
        consultationId: consultation.id,
        consultationType,
        fee: consultationFee,
        currency: 'ETB',
        status: consultation.status,
        scheduledTime: consultation.scheduledTime,
        paymentMethods: getAvailablePaymentMethods(paymentSettings)
      }
    });

  } catch (error) {
    console.error('❌ Request consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create consultation request',
      message: error.message
    });
  }
};

// Helper to get available payment methods
function getAvailablePaymentMethods(settings) {
  const methods = [];
  if (process.env.CHAPA_SECRET_KEY) {
    methods.push({ id: 'chapa', name: 'Chapa (Card/Mobile Money)', type: 'gateway' });
  }
  if (settings?.telebirrEnabled) {
    methods.push({ id: 'telebirr', name: 'Telebirr', type: 'p2p', details: settings.telebirrNumber });
  }
  if (settings?.cbeBirrEnabled) {
    methods.push({ id: 'cbe_birr', name: 'CBE Birr', type: 'p2p', details: settings.cbeBirrAccount });
  }
  if (settings?.bankTransferEnabled) {
    methods.push({ 
      id: 'bank_transfer', 
      name: settings.bankName || 'Bank Transfer', 
      type: 'p2p',
      details: settings.bankAccountNumber
    });
  }
  return methods;
}


/**
 * Submit payment reference (P2P payment)
 * POST /api/premium-consultations/:id/submit-payment
 */
export const submitPaymentReference = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, patientWallet } = req.body;

    console.log('💰 Payment reference submitted:', { id, paymentMethod, paymentReference });

    const consultation = await PremiumConsultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    // Verify patient owns this consultation
    if (consultation.patientWallet.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Update payment info
    await consultation.update({
      paymentMethod,
      paymentReference,
      paymentStatus: 'submitted',
      status: 'payment_submitted'
    });

    // Notify doctor to verify payment
    const patient = await User.findOne({ where: { walletAddress: patientWallet.toLowerCase() } });
    const patientName = patient?.name || patient?.profileData?.fullName || 'Patient';

    await EnhancedNotificationService.sendToUser(
      consultation.doctorWallet,
      'payment_verification_needed',
      {
        title: 'Payment verification needed',
        message: `${patientName} has submitted payment for ${consultation.consultationType} consultation. Reference: ${paymentReference}`,
        relatedId: consultation.id,
        relatedType: 'consultation'
      }
    );

    res.json({
      success: true,
      message: 'Payment reference submitted. Waiting for doctor verification.',
      data: { status: consultation.status, paymentStatus: consultation.paymentStatus }
    });

  } catch (error) {
    console.error('❌ Submit payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit payment', message: error.message });
  }
};

/**
 * Initialize Chapa payment for consultation
 * POST /api/premium-consultations/:id/pay-chapa
 */
export const initializeChapaPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { patientWallet, returnUrl } = req.body;

    const consultation = await PremiumConsultation.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['email', 'name', 'profileData'] },
        { model: User, as: 'doctor', attributes: ['name', 'profileData'] }
      ]
    });

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    if (consultation.patientWallet.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Generate Chapa transaction reference
    const txRef = `CONSULT-${consultation.id}-${Date.now()}`;

    // Initialize Chapa payment
    const chapaResult = await ChapaPaymentConsentBridge.initializeDirectChapaPayment({
      amount: consultation.consultationFee,
      email: consultation.patient?.email || `${patientWallet.slice(0, 8)}@elitetena.com`,
      firstName: consultation.patient?.name || consultation.patient?.profileData?.firstName || 'Patient',
      lastName: consultation.patient?.profileData?.lastName || '',
      phoneNumber: consultation.patient?.profileData?.phone || consultation.patient?.profileData?.phoneNumber,
      txRef,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/consultations/${id}/payment-success`,
      customization: {
        title: `${consultation.consultationType === 'video' ? 'Video' : 'Chat'} Consultation`,
        description: `Consultation with Dr. ${consultation.doctor?.name || consultation.doctor?.profileData?.lastName || 'Doctor'}`
      }
    });

    if (!chapaResult.success) {
      return res.status(400).json({ success: false, error: chapaResult.error });
    }

    // Update consultation with Chapa reference
    await consultation.update({
      paymentMethod: 'chapa',
      chapaTxRef: txRef,
      paymentStatus: 'pending'
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: chapaResult.checkoutUrl,
        txRef,
        amount: consultation.consultationFee
      }
    });

  } catch (error) {
    console.error('❌ Chapa payment init error:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize payment', message: error.message });
  }
};

/**
 * Verify payment and activate consultation (Doctor action)
 * POST /api/premium-consultations/:id/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.body;

    console.log('✅ Doctor verifying payment:', id);

    const consultation = await PremiumConsultation.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'profileData'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'profileData'] }
      ]
    });

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    if (consultation.doctorWallet.toLowerCase() !== doctorWallet.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Only the assigned doctor can verify payment' });
    }

    // Calculate expiration
    let expiresAt;
    if (consultation.consultationType === 'chat') {
      // Chat expires after configured hours (default 24)
      const settings = await DoctorPaymentSettings.findOne({
        where: { doctorWalletAddress: doctorWallet.toLowerCase() }
      });
      const hours = settings?.chatDurationHours || 24;
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else {
      // Video expires after scheduled time + duration + buffer
      const buffer = 30 * 60 * 1000; // 30 min buffer
      expiresAt = new Date(
        new Date(consultation.scheduledTime).getTime() + 
        (consultation.durationMinutes * 60 * 1000) + 
        buffer
      );
    }

    // Setup video room if video consultation
    let videoSetup = null;
    if (consultation.consultationType === 'video' && DailyVideoService.isConfigured()) {
      try {
        videoSetup = await DailyVideoService.setupVideoConsultation({
          id: consultation.id,
          patientWallet: consultation.patientWallet,
          doctorWallet: consultation.doctorWallet,
          scheduledTime: consultation.scheduledTime,
          durationMinutes: consultation.durationMinutes,
          patientName: `${consultation.patient?.name || consultation.patient?.profileData?.firstName || 'Patient'}`,
          doctorName: `Dr. ${consultation.doctor?.name || consultation.doctor?.profileData?.lastName || 'Doctor'}`
        });
      } catch (videoError) {
        console.warn('⚠️ Daily.co setup failed, continuing without:', videoError.message);
      }
    }

    // Update consultation
    await consultation.update({
      paymentStatus: 'verified',
      paymentVerifiedBy: consultation.doctorWallet,
      paymentVerifiedAt: new Date(),
      status: 'verified',
      activatedAt: new Date(),
      expiresAt,
      ...(videoSetup && {
        dailyRoomName: videoSetup.roomName,
        dailyRoomUrl: videoSetup.roomUrl,
        dailyHostToken: videoSetup.doctorToken,
        dailyParticipantToken: videoSetup.patientToken
      })
    });

    // Notify patient
    await EnhancedNotificationService.sendToUser(
      consultation.patientWallet,
      'consultation_activated',
      {
        title: 'Consultation activated!',
        message: `Your ${consultation.consultationType} consultation has been activated. ${
          consultation.consultationType === 'chat' 
            ? 'You can now start chatting.' 
            : 'Join at the scheduled time.'
        }`,
        relatedId: consultation.id,
        relatedType: 'consultation'
      }
    );

    res.json({
      success: true,
      message: 'Payment verified and consultation activated',
      data: {
        status: 'verified',
        expiresAt,
        consultationType: consultation.consultationType,
        ...(videoSetup && { roomUrl: videoSetup.roomUrl })
      }
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment', message: error.message });
  }
};


/**
 * Get consultation details
 * GET /api/premium-consultations/:id
 */
export const getConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.query;

    const consultation = await PremiumConsultation.findByPk(id, {
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email', 'profileData'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email', 'profileData'] }
      ]
    });

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    // Verify access
    const isParticipant = 
      consultation.patientWallet.toLowerCase() === userWallet?.toLowerCase() ||
      consultation.doctorWallet.toLowerCase() === userWallet?.toLowerCase();

    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet?.toLowerCase();

    res.json({
      success: true,
      data: {
        ...consultation.toJSON(),
        // Include tokens only for respective users
        dailyHostToken: isDoctor ? consultation.dailyHostToken : undefined,
        dailyParticipantToken: !isDoctor ? consultation.dailyParticipantToken : undefined,
        isAccessible: consultation.isAccessible(),
        timeRemaining: consultation.getTimeRemaining()
      }
    });

  } catch (error) {
    console.error('❌ Get consultation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get consultation', message: error.message });
  }
};

/**
 * Get user's consultations
 * GET /api/premium-consultations
 */
export const getUserConsultations = async (req, res) => {
  try {
    const { userWallet, role, status, type, limit = 50 } = req.query;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: 'userWallet is required' });
    }

    const where = {};
    
    // Filter by role
    if (role === 'patient') {
      where.patientWallet = userWallet.toLowerCase();
    } else if (role === 'doctor') {
      where.doctorWallet = userWallet.toLowerCase();
    } else {
      where[Op.or] = [
        { patientWallet: userWallet.toLowerCase() },
        { doctorWallet: userWallet.toLowerCase() }
      ];
    }

    if (status) where.status = status;
    if (type) where.consultationType = type;

    const consultations = await PremiumConsultation.findAll({
      where,
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email', 'profileData'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email', 'profileData'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });

  } catch (error) {
    console.error('❌ Get consultations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get consultations', message: error.message });
  }
};

/**
 * Join consultation (marks as active)
 * POST /api/premium-consultations/:id/join
 */
export const joinConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.body;

    const consultation = await PremiumConsultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    // Verify access
    const isPatient = consultation.patientWallet.toLowerCase() === userWallet.toLowerCase();
    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if consultation is accessible
    if (!consultation.isAccessible()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consultation is not accessible',
        reason: consultation.status === 'expired' ? 'expired' : 'not_verified'
      });
    }

    // Mark as active if first join
    if (consultation.status === 'verified') {
      await consultation.update({
        status: 'active',
        startedAt: new Date()
      });
    }

    // For video, create a session record
    if (consultation.consultationType === 'video') {
      const existingSession = await VideoCallSession.findOne({
        where: { consultationId: id, status: { [Op.in]: ['waiting', 'active'] } }
      });

      if (!existingSession) {
        await VideoCallSession.create({
          consultationId: id,
          status: 'waiting'
        });
      }
    }

    res.json({
      success: true,
      message: 'Joined consultation',
      data: {
        consultationType: consultation.consultationType,
        chatRoomId: consultation.chatRoomId,
        dailyRoomUrl: consultation.dailyRoomUrl,
        token: isDoctor ? consultation.dailyHostToken : consultation.dailyParticipantToken,
        expiresAt: consultation.expiresAt
      }
    });

  } catch (error) {
    console.error('❌ Join consultation error:', error);
    res.status(500).json({ success: false, error: 'Failed to join consultation', message: error.message });
  }
};

/**
 * End consultation
 * POST /api/premium-consultations/:id/end
 */
export const endConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet, doctorNotes, consultationSummary, followUpRecommended } = req.body;

    const consultation = await PremiumConsultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();

    // Update consultation
    await consultation.update({
      status: 'completed',
      endedAt: new Date(),
      ...(isDoctor && {
        doctorNotes,
        consultationSummary,
        followUpRecommended
      })
    });

    // Clean up Daily.co room if video
    if (consultation.dailyRoomName && DailyVideoService.isConfigured()) {
      try {
        await DailyVideoService.deleteRoom(consultation.dailyRoomName);
      } catch (e) {
        console.warn('⚠️ Failed to delete Daily.co room:', e.message);
      }
    }

    // Notify other party
    const otherWallet = isDoctor ? consultation.patientWallet : consultation.doctorWallet;
    await EnhancedNotificationService.sendToUser(
      otherWallet,
      'consultation_ended',
      {
        title: 'Consultation ended',
        message: `Your ${consultation.consultationType} consultation has ended.`,
        relatedId: consultation.id,
        relatedType: 'consultation'
      }
    );

    res.json({
      success: true,
      message: 'Consultation ended',
      data: { status: 'completed', endedAt: consultation.endedAt }
    });

  } catch (error) {
    console.error('❌ End consultation error:', error);
    res.status(500).json({ success: false, error: 'Failed to end consultation', message: error.message });
  }
};

/**
 * Rate consultation
 * POST /api/premium-consultations/:id/rate
 */
export const rateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet, rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const consultation = await PremiumConsultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    const isPatient = consultation.patientWallet.toLowerCase() === userWallet.toLowerCase();
    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Update rating
    if (isPatient) {
      await consultation.update({ patientRating: rating, patientFeedback: feedback });
    } else {
      await consultation.update({ doctorRating: rating });
    }

    res.json({
      success: true,
      message: 'Rating submitted',
      data: { rating, feedback }
    });

  } catch (error) {
    console.error('❌ Rate consultation error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit rating', message: error.message });
  }
};
/**
 * Start video call for consultation
 * POST /api/premium-consultations/:id/start-video
 */
export const startVideoCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.body;

    console.log('🎥 Starting video call for consultation:', id);

    const consultation = await PremiumConsultation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['walletAddress', 'profileData', 'role']
        }
      ]
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found'
      });
    }

    // Verify user is part of consultation
    const isPatient = consultation.patientWallet.toLowerCase() === userWallet.toLowerCase();
    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if consultation is paid and active
    if (consultation.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment required',
        message: 'Consultation must be paid before starting video call'
      });
    }

    if (consultation.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Consultation not active',
        message: 'Consultation must be active to start video call'
      });
    }

    // Check if it's a video consultation
    if (consultation.consultationType !== 'video') {
      return res.status(400).json({
        success: false,
        error: 'Not a video consultation',
        message: 'This is not a video consultation'
      });
    }

    // Create or get existing video call session
    let videoSession = await VideoCallSession.findOne({
      where: { consultationId: id }
    });

    if (!videoSession) {
      // Create Daily.co room if configured
      let dailyRoomData = null;
      if (DailyVideoService.isConfigured()) {
        try {
          const patientName = consultation.patient.profileData?.fullName || 'Patient';
          const doctorName = consultation.doctor.profileData?.fullName || 'Doctor';

          dailyRoomData = await DailyVideoService.setupVideoConsultation({
            id: consultation.id,
            patientWallet: consultation.patientWallet,
            doctorWallet: consultation.doctorWallet,
            scheduledTime: consultation.scheduledTime,
            durationMinutes: consultation.durationMinutes || 30,
            patientName,
            doctorName
          });

          console.log('✅ Daily.co room created for consultation:', dailyRoomData.roomName);
        } catch (dailyError) {
          console.warn('⚠️ Failed to create Daily.co room:', dailyError.message);
        }
      }

      // Create video session record
      videoSession = await VideoCallSession.create({
        id: uuidv4(),
        consultationId: id,
        roomId: `consultation-${id}-${Date.now()}`,
        status: 'initiated',
        dailyRoomUrl: dailyRoomData?.roomUrl,
        dailyRoomName: dailyRoomData?.roomName,
        dailyHostToken: dailyRoomData?.doctorToken,
        dailyParticipantToken: dailyRoomData?.patientToken,
        expiresAt: dailyRoomData?.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      });
    }

    // Update consultation with video session info
    await consultation.update({
      dailyRoomUrl: videoSession.dailyRoomUrl,
      dailyHostToken: videoSession.dailyHostToken,
      dailyParticipantToken: videoSession.dailyParticipantToken
    });

    // Send notification to other participant
    const otherParticipant = isPatient ? consultation.doctorWallet : consultation.patientWallet;
    const initiatorName = isPatient ? 
      consultation.patient.profileData?.fullName || 'Patient' :
      consultation.doctor.profileData?.fullName || 'Doctor';

    await EnhancedNotificationService.sendToUser(
      otherParticipant,
      'video_consultation_started',
      {
        initiatorName,
        consultationId: id,
        relatedId: id,
        relatedType: 'consultation'
      }
    );

    console.log('✅ Video call started for consultation:', id);

    res.json({
      success: true,
      message: 'Video call started',
      data: {
        videoSession,
        consultation: {
          ...consultation.toJSON(),
          dailyRoomUrl: videoSession.dailyRoomUrl,
          dailyToken: isDoctor ? videoSession.dailyHostToken : videoSession.dailyParticipantToken
        }
      }
    });

  } catch (error) {
    console.error('❌ Start video call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start video call',
      message: error.message
    });
  }
};

/**
 * Get video call details for consultation
 * GET /api/premium-consultations/:id/video-call
 */
export const getVideoCallDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.query;

    const consultation = await PremiumConsultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found'
      });
    }

    // Verify user is part of consultation
    const isPatient = consultation.patientWallet.toLowerCase() === userWallet.toLowerCase();
    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get video session
    const videoSession = await VideoCallSession.findOne({
      where: { consultationId: id }
    });

    if (!videoSession) {
      return res.status(404).json({
        success: false,
        error: 'Video session not found'
      });
    }

    // Get appropriate token
    const token = isDoctor ? videoSession.dailyHostToken : videoSession.dailyParticipantToken;

    res.json({
      success: true,
      data: {
        videoSession,
        dailyRoomUrl: videoSession.dailyRoomUrl,
        dailyToken: token,
        joinUrl: token ? `${videoSession.dailyRoomUrl}?t=${token}` : videoSession.dailyRoomUrl
      }
    });

  } catch (error) {
    console.error('❌ Get video call details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video call details',
      message: error.message
    });
  }
};

/**
 * Get unified consultation history (both chat and video consultations + video calls)
 * GET /api/premium-consultations/unified-history
 */
export const getUnifiedConsultationHistory = async (req, res) => {
  try {
    const { userWallet, role, limit = 50 } = req.query;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: 'userWallet is required' });
    }

    console.log('📋 Getting unified consultation history for:', userWallet);

    // Get premium consultations (chat and video)
    const consultationWhere = {};
    if (role === 'patient') {
      consultationWhere.patientWallet = userWallet.toLowerCase();
    } else if (role === 'doctor') {
      consultationWhere.doctorWallet = userWallet.toLowerCase();
    } else {
      consultationWhere[Op.or] = [
        { patientWallet: userWallet.toLowerCase() },
        { doctorWallet: userWallet.toLowerCase() }
      ];
    }

    const consultations = await PremiumConsultation.findAll({
      where: consultationWhere,
      include: [
        { model: User, as: 'patient', attributes: ['walletAddress', 'name', 'email', 'profileData'] },
        { model: User, as: 'doctor', attributes: ['walletAddress', 'name', 'email', 'profileData'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Get standalone video calls (not part of premium consultations)
    const { VideoCall } = db;
    const videoCallWhere = {
      [Op.or]: [
        { initiatorWallet: userWallet.toLowerCase() },
        { receiverWallet: userWallet.toLowerCase() }
      ],
      // Only get video calls that are not part of consultations
      appointmentId: null
    };

    const videoCalls = await VideoCall.findAll({
      where: videoCallWhere,
      include: [
        { model: User, as: 'initiator', attributes: ['walletAddress', 'name', 'email', 'role'] },
        { model: User, as: 'receiver', attributes: ['walletAddress', 'name', 'email', 'role'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Transform data to unified format
    const unifiedHistory = [];

    // Add consultations
    consultations.forEach(consultation => {
      const isPatient = consultation.patientWallet.toLowerCase() === userWallet.toLowerCase();
      const otherParty = isPatient ? consultation.doctor : consultation.patient;
      
      unifiedHistory.push({
        id: consultation.id,
        type: 'consultation',
        subType: consultation.consultationType, // 'chat' or 'video'
        status: consultation.status,
        paymentStatus: consultation.paymentStatus,
        createdAt: consultation.createdAt,
        updatedAt: consultation.updatedAt,
        startedAt: consultation.startedAt,
        endedAt: consultation.endedAt,
        scheduledTime: consultation.scheduledTime,
        duration: consultation.durationMinutes,
        fee: consultation.consultationFee,
        currency: consultation.currency,
        otherParty: {
          wallet: otherParty?.walletAddress,
          name: otherParty?.name || otherParty?.fullName,
          role: isPatient ? 'doctor' : 'patient'
        },
        canJoin: consultation.isAccessible && typeof consultation.isAccessible === 'function' ? consultation.isAccessible() : false,
        rating: isPatient ? consultation.patientRating : consultation.doctorRating,
        feedback: isPatient ? consultation.patientFeedback : null,
        dailyRoomUrl: consultation.dailyRoomUrl,
        chatRoomId: consultation.chatRoomId
      });
    });

    // Add standalone video calls
    videoCalls.forEach(videoCall => {
      const isInitiator = videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase();
      const otherParty = isInitiator ? videoCall.receiver : videoCall.initiator;
      
      unifiedHistory.push({
        id: videoCall.id,
        type: 'video_call',
        subType: 'video',
        status: videoCall.status,
        createdAt: videoCall.createdAt,
        updatedAt: videoCall.updatedAt,
        startedAt: videoCall.startedAt,
        endedAt: videoCall.endedAt,
        duration: videoCall.duration,
        otherParty: {
          wallet: otherParty?.walletAddress,
          name: otherParty?.name || otherParty?.fullName,
          role: otherParty?.role
        },
        canJoin: ['initiated', 'ringing', 'active'].includes(videoCall.status),
        quality: videoCall.quality,
        dailyRoomUrl: videoCall.metadata?.dailyRoom?.roomUrl
      });
    });

    // Sort by creation date (most recent first)
    unifiedHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Limit results
    const limitedHistory = unifiedHistory.slice(0, parseInt(limit));

    console.log(`✅ Found ${limitedHistory.length} consultation/call records`);

    res.json({
      success: true,
      data: limitedHistory,
      count: limitedHistory.length,
      breakdown: {
        consultations: consultations.length,
        videoCalls: videoCalls.length,
        total: limitedHistory.length
      }
    });

  } catch (error) {
    console.error('❌ Get unified consultation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consultation history',
      message: error.message
    });
  }
};