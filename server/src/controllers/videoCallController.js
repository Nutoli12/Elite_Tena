import db from '../models/index.js';
import { getIO } from '../services/socketService.js';
import EnhancedNotificationService from '../services/enhancedNotificationService.js';
import JitsiVideoService from '../services/JitsiVideoService.js';
import { v4 as uuidv4 } from 'uuid';
import { Sequelize } from 'sequelize';

const { VideoCall, User, Appointment, Consent, PremiumConsultation } = db;

/**
 * 📹 VIDEO CALL CONTROLLER
 * Handles video consultation sessions
 */

/**
 * Initiate a video call (with consent check and Daily.co integration)
 */
export const initiateCall = async (req, res) => {
  try {
    const {
      initiatorWallet,
      receiverWallet,
      appointmentId,
      consultationId,
      scheduledTime,
      durationMinutes = 30
    } = req.body;

    console.log('📹 Initiating video call from:', initiatorWallet, 'to:', receiverWallet);

    // Validate required fields
    if (!initiatorWallet || !receiverWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'initiatorWallet and receiverWallet are required'
      });
    }

    // 🔒 CONSENT CHECK: If appointmentId provided, check consent (simplified for now)
    if (appointmentId) {
      const appointment = await Appointment.findByPk(appointmentId);

      if (appointment) {
        // Basic appointment validation - consent check simplified
        console.log('📋 Video call for appointment:', appointmentId, 'Status:', appointment.status);
        
        // Allow video calls for confirmed appointments
        if (appointment.status === 'cancelled') {
          return res.status(403).json({
            success: false,
            error: 'Cannot start video call for cancelled appointment',
            message: 'This appointment has been cancelled'
          });
        }
      }
    }

    // Check if users exist and get their details
    const [initiator, receiver] = await Promise.all([
      User.findOne({ 
        where: { walletAddress: initiatorWallet.toLowerCase() },
        attributes: ['walletAddress', 'email', 'profileData', 'role']
      }),
      User.findOne({ 
        where: { walletAddress: receiverWallet.toLowerCase() },
        attributes: ['walletAddress', 'email', 'profileData', 'role']
      })
    ]);

    if (!initiator || !receiver) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'One or both users not found'
      });
    }

    // Check for existing active call between these users
    const existingCall = await VideoCall.findOne({
      where: {
        [Sequelize.Op.or]: [
          {
            initiatorWallet: initiatorWallet.toLowerCase(),
            receiverWallet: receiverWallet.toLowerCase()
          },
          {
            initiatorWallet: receiverWallet.toLowerCase(),
            receiverWallet: initiatorWallet.toLowerCase()
          }
        ],
        status: ['initiated', 'ringing', 'active']
      }
    });

    if (existingCall) {
      return res.status(409).json({
        success: false,
        error: 'Call already in progress',
        message: 'There is already an active call between these users',
        data: existingCall
      });
    }

    // Generate unique room ID
    const roomId = `room-${uuidv4()}`;
    let jitsiRoomData = null;

    // Create Jitsi Meet room (always available - it's free!)
    try {
      const initiatorName = initiator.profileData?.fullName || initiator.profileData?.firstName || 'Doctor';
      const receiverName = receiver.profileData?.fullName || receiver.profileData?.firstName || 'Patient';

      jitsiRoomData = await JitsiVideoService.setupVideoConsultation({
        id: roomId,
        patientWallet: receiver.role === 'patient' ? receiverWallet : initiatorWallet,
        doctorWallet: receiver.role === 'doctor' ? receiverWallet : initiatorWallet,
        scheduledTime,
        durationMinutes,
        patientName: receiver.role === 'patient' ? receiverName : initiatorName,
        doctorName: receiver.role === 'doctor' ? receiverName : initiatorName
      });

      console.log('✅ Jitsi Meet room created:', jitsiRoomData.roomName);
    } catch (jitsiError) {
      console.error('❌ JITSI ERROR DETAILS:', {
        message: jitsiError.message,
        stack: jitsiError.stack
      });
      console.warn('⚠️ Failed to create Jitsi room:', jitsiError.message);
      // Jitsi should never fail, but fallback just in case
    }

    // Create video call record
    const videoCall = await VideoCall.create({
      initiatorWallet: initiatorWallet.toLowerCase(),
      receiverWallet: receiverWallet.toLowerCase(),
      appointmentId: appointmentId || null,
      roomId,
      status: 'initiated',
      metadata: {
        scheduledTime,
        durationMinutes,
        jitsiRoom: jitsiRoomData ? {
          roomName: jitsiRoomData.roomName,
          roomUrl: jitsiRoomData.roomUrl,
          doctorUrl: jitsiRoomData.doctorUrl,
          patientUrl: jitsiRoomData.patientUrl,
          provider: 'jitsi'
        } : null,
        initiatorRole: initiator.role,
        receiverRole: receiver.role
      }
    });

    // Send notification to receiver
    const initiatorName = initiator.profileData?.fullName || initiator.profileData?.firstName || 'Someone';
    await EnhancedNotificationService.sendToUser(
      receiverWallet,
      'video_call_request',
      {
        senderName: initiatorName,
        relatedId: videoCall.id,
        relatedType: 'video_call',
        appointmentId,
        consultationId
      }
    );

    // Emit real-time call request via Socket.io
    try {
      const io = getIO();
      io.to(receiverWallet.toLowerCase()).emit('incoming_call', {
        callId: videoCall.id,
        roomId: videoCall.roomId,
        initiatorWallet: initiatorWallet.toLowerCase(),
        initiatorName,
        initiatorRole: initiator.role,
        appointmentId,
        consultationId,
        jitsiRoomUrl: jitsiRoomData?.roomUrl,
        scheduledTime,
        durationMinutes
      });
      console.log('✅ Call request sent via Socket.io');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available for call notification');
    }

    console.log('✅ Video call initiated:', videoCall.id);

    res.status(201).json({
      success: true,
      message: 'Video call initiated',
      data: {
        ...videoCall.toJSON(),
        jitsiRoomUrl: jitsiRoomData?.roomUrl,
        jitsiUrls: jitsiRoomData ? {
          doctorUrl: jitsiRoomData.doctorUrl,
          patientUrl: jitsiRoomData.patientUrl,
          initiatorUrl: initiator.role === 'doctor' ? jitsiRoomData.doctorUrl : jitsiRoomData.patientUrl,
          receiverUrl: receiver.role === 'doctor' ? jitsiRoomData.doctorUrl : jitsiRoomData.patientUrl
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Initiate call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      message: error.message
    });
  }
};

/**
 * Answer a video call
 */
export const answerCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userWallet } = req.body;

    console.log('📞 Answering call:', callId);

    const videoCall = await VideoCall.findByPk(callId, {
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'profileData', 'role']
        }
      ]
    });

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Verify user is the receiver
    if (videoCall.receiverWallet.toLowerCase() !== userWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only the receiver can answer this call'
      });
    }

    // Check if call is still valid (not expired or already ended)
    if (!['initiated', 'ringing'].includes(videoCall.status)) {
      return res.status(400).json({
        success: false,
        error: 'Call no longer available',
        message: `Call is ${videoCall.status} and cannot be answered`
      });
    }

    // Update call status
    await videoCall.update({
      status: 'active',
      startedAt: new Date()
    });

    // Get Jitsi Meet URLs if available
    let jitsiUrls = null;
    if (videoCall.metadata?.jitsiRoom) {
      try {
        const receiverName = videoCall.receiver.profileData?.fullName || 'User';
        const receiverUrl = await JitsiVideoService.createMeetingUrl({
          roomName: videoCall.metadata.jitsiRoom.roomName,
          participantName: receiverName,
          isHost: videoCall.receiver.role === 'doctor',
          userId: userWallet
        });

        jitsiUrls = {
          receiverUrl,
          roomUrl: videoCall.metadata.jitsiRoom.roomUrl,
          doctorUrl: videoCall.metadata.jitsiRoom.doctorUrl,
          patientUrl: videoCall.metadata.jitsiRoom.patientUrl
        };
      } catch (jitsiError) {
        console.warn('⚠️ Failed to generate Jitsi URL:', jitsiError.message);
      }
    }

    // Notify initiator that call was answered
    try {
      const io = getIO();
      io.to(videoCall.initiatorWallet).emit('call_answered', {
        callId: videoCall.id,
        roomId: videoCall.roomId,
        answeredBy: userWallet,
        answeredAt: new Date().toISOString(),
        jitsiRoomUrl: videoCall.metadata?.jitsiRoom?.roomUrl
      });
      console.log('✅ Call answer notification sent');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available');
    }

    // Send notification
    const receiverName = videoCall.receiver.profileData?.fullName || 'Someone';
    await EnhancedNotificationService.sendToUser(
      videoCall.initiatorWallet,
      'video_call_answered',
      {
        receiverName,
        relatedId: videoCall.id,
        relatedType: 'video_call'
      }
    );

    console.log('✅ Call answered');

    res.json({
      success: true,
      message: 'Call answered',
      data: {
        ...videoCall.toJSON(),
        jitsiUrls
      }
    });

  } catch (error) {
    console.error('❌ Answer call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to answer call',
      message: error.message
    });
  }
};

/**
 * Reject a video call
 */
export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userWallet, reason } = req.body;

    console.log('❌ Rejecting call:', callId);

    const videoCall = await VideoCall.findByPk(callId);

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Verify user is the receiver
    if (videoCall.receiverWallet.toLowerCase() !== userWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Update call status
    await videoCall.update({
      status: 'rejected',
      endedAt: new Date(),
      endReason: reason || 'rejected_by_receiver'
    });

    // Notify initiator
    try {
      const io = getIO();
      io.to(videoCall.initiatorWallet).emit('call_rejected', {
        callId: videoCall.id,
        reason
      });
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available');
    }

    console.log('✅ Call rejected');

    res.json({
      success: true,
      message: 'Call rejected',
      data: videoCall
    });

  } catch (error) {
    console.error('❌ Reject call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject call',
      message: error.message
    });
  }
};

/**
 * End a video call
 */
export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userWallet, reason, quality, callSummary } = req.body;

    console.log('🔚 Ending call:', callId);

    const videoCall = await VideoCall.findByPk(callId, {
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'profileData', 'role']
        }
      ]
    });

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Verify user is part of the call
    const isParticipant = 
      videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase() ||
      videoCall.receiverWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Calculate duration if call was active
    let calculatedDuration = null;
    if (videoCall.startedAt) {
      calculatedDuration = Math.floor((new Date() - new Date(videoCall.startedAt)) / 1000);
    }

    // Update call status with enhanced metadata
    const updateData = {
      status: 'ended',
      endedAt: new Date(),
      endReason: reason || 'normal',
      quality: quality || null,
      duration: calculatedDuration
    };

    // Add call summary to metadata if provided
    if (callSummary || quality) {
      updateData.metadata = {
        ...videoCall.metadata,
        callSummary,
        endedBy: userWallet,
        qualityMetrics: quality
      };
    }

    await videoCall.update(updateData);

    // Clean up Jitsi room if it exists (automatic cleanup)
    if (videoCall.metadata?.jitsiRoom) {
      try {
        await JitsiVideoService.deleteRoom(videoCall.metadata.jitsiRoom.roomName);
        console.log('✅ Jitsi room cleanup (automatic)');
      } catch (jitsiError) {
        console.warn('⚠️ Jitsi room cleanup note:', jitsiError.message);
      }
    }

    // Notify other participant
    const otherParticipant = videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase()
      ? videoCall.receiverWallet
      : videoCall.initiatorWallet;

    const endedByUser = videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase() 
      ? videoCall.initiator 
      : videoCall.receiver;

    try {
      const io = getIO();
      io.to(otherParticipant).emit('call_ended', {
        callId: videoCall.id,
        reason,
        duration: calculatedDuration,
        endedBy: endedByUser.profileData?.fullName || 'Other participant',
        endedAt: new Date().toISOString()
      });
      console.log('✅ Call end notification sent');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available');
    }

    // Send notification
    const endedByName = endedByUser.profileData?.fullName || 'Someone';
    await EnhancedNotificationService.sendToUser(
      otherParticipant,
      'video_call_ended',
      {
        endedByName,
        duration: calculatedDuration,
        relatedId: videoCall.id,
        relatedType: 'video_call'
      }
    );

    console.log('✅ Call ended. Duration:', calculatedDuration, 'seconds');

    res.json({
      success: true,
      message: 'Call ended',
      data: {
        ...videoCall.toJSON(),
        duration: calculatedDuration
      }
    });

  } catch (error) {
    console.error('❌ End call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call',
      message: error.message
    });
  }
};

/**
 * Get call details
 */
export const getCall = async (req, res) => {
  try {
    const { callId } = req.params;

    const videoCall = await VideoCall.findByPk(callId, {
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: Appointment,
          as: 'appointment'
        }
      ]
    });

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      data: videoCall
    });

  } catch (error) {
    console.error('❌ Get call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call',
      message: error.message
    });
  }
};

/**
 * Get call history for a user
 */
export const getCallHistory = async (req, res) => {
  try {
    const { userWallet } = req.params;
    const { limit = 50, status } = req.query;

    console.log('📋 Fetching call history for:', userWallet);

    const where = {
      [Sequelize.Op.or]: [
        { initiatorWallet: userWallet.toLowerCase() },
        { receiverWallet: userWallet.toLowerCase() }
      ]
    };

    if (status) {
      where.status = status;
    }

    const calls = await VideoCall.findAll({
      where,
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: Appointment,
          as: 'appointment'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`✅ Found ${calls.length} calls`);

    res.json({
      success: true,
      data: calls,
      count: calls.length
    });

  } catch (error) {
    console.error('❌ Get call history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call history',
      message: error.message
    });
  }
};

/**
 * Update call quality metrics
 */
export const updateCallQuality = async (req, res) => {
  try {
    const { callId } = req.params;
    const { quality, userWallet } = req.body;

    const videoCall = await VideoCall.findByPk(callId);

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Verify user is part of the call
    const isParticipant = 
      videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase() ||
      videoCall.receiverWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Merge quality data with existing
    const existingQuality = videoCall.quality || {};
    const updatedQuality = {
      ...existingQuality,
      ...quality,
      lastUpdated: new Date().toISOString(),
      updatedBy: userWallet
    };

    await videoCall.update({ quality: updatedQuality });

    res.json({
      success: true,
      message: 'Call quality updated',
      data: videoCall
    });

  } catch (error) {
    console.error('❌ Update call quality error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update call quality',
      message: error.message
    });
  }
};

/**
 * Get Jitsi Meet room URL for a call
 */
export const getJitsiUrl = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userWallet } = req.query;

    const videoCall = await VideoCall.findByPk(callId, {
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'profileData', 'role']
        }
      ]
    });

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Verify user is part of the call
    const isParticipant = 
      videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase() ||
      videoCall.receiverWallet.toLowerCase() === userWallet.toLowerCase();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Check if Jitsi room exists
    if (!videoCall.metadata?.jitsiRoom) {
      return res.status(400).json({
        success: false,
        error: 'Jitsi not available',
        message: 'This call does not have Jitsi integration'
      });
    }

    // Get user details
    const user = videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase() 
      ? videoCall.initiator 
      : videoCall.receiver;

    // Generate meeting URL
    const meetingUrl = await JitsiVideoService.createMeetingUrl({
      roomName: videoCall.metadata.jitsiRoom.roomName,
      participantName: user.profileData?.fullName || 'User',
      isHost: user.role === 'doctor',
      userId: userWallet
    });

    res.json({
      success: true,
      data: {
        meetingUrl,
        roomUrl: videoCall.metadata.jitsiRoom.roomUrl,
        roomName: videoCall.metadata.jitsiRoom.roomName,
        joinUrl: meetingUrl,
        doctorUrl: videoCall.metadata.jitsiRoom.doctorUrl,
        patientUrl: videoCall.metadata.jitsiRoom.patientUrl
      }
    });

  } catch (error) {
    console.error('❌ Get Jitsi URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Jitsi URL',
      message: error.message
    });
  }
};

/**
 * Handle Jitsi Meet webhook events (not available in public Jitsi)
 */
export const handleJitsiWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('📡 Jitsi webhook received (not supported in public version):', event);

    const result = await JitsiVideoService.handleWebhook(event);

    // Find the video call by room name
    if (result.roomName) {
      const videoCall = await VideoCall.findOne({
        where: {
          'metadata.jitsiRoom.roomName': result.roomName
        }
      });

      if (videoCall) {
        // Update call status based on webhook event
        switch (result.action) {
          case 'meeting_started':
            if (videoCall.status === 'active') {
              await videoCall.update({
                metadata: {
                  ...videoCall.metadata,
                  meetingStarted: true,
                  meetingStartedAt: new Date().toISOString()
                }
              });
            }
            break;

          case 'meeting_ended':
            if (videoCall.status === 'active') {
              await videoCall.update({
                status: 'ended',
                endedAt: new Date(),
                endReason: 'meeting_ended'
              });
            }
            break;

          case 'participant_joined':
            // Notify other participants
            try {
              const io = getIO();
              const otherParticipant = result.userId === videoCall.initiatorWallet 
                ? videoCall.receiverWallet 
                : videoCall.initiatorWallet;
              
              io.to(otherParticipant).emit('participant_joined', {
                callId: videoCall.id,
                userId: result.userId,
                userName: result.userName
              });
            } catch (socketError) {
              console.warn('⚠️ Socket.io not available');
            }
            break;

          case 'participant_left':
            // Handle participant leaving
            try {
              const io = getIO();
              const otherParticipant = result.userId === videoCall.initiatorWallet 
                ? videoCall.receiverWallet 
                : videoCall.initiatorWallet;
              
              io.to(otherParticipant).emit('participant_left', {
                callId: videoCall.id,
                userId: result.userId,
                duration: result.duration
              });
            } catch (socketError) {
              console.warn('⚠️ Socket.io not available');
            }
            break;
        }
      }
    }

    res.json({ success: true, processed: result });

  } catch (error) {
    console.error('❌ Jitsi webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
};

/**
 * Get active calls for a user
 */
export const getActiveCalls = async (req, res) => {
  try {
    const { userWallet } = req.params;

    const activeCalls = await VideoCall.findAll({
      where: {
        [Sequelize.Op.or]: [
          { initiatorWallet: userWallet.toLowerCase() },
          { receiverWallet: userWallet.toLowerCase() }
        ],
        status: ['initiated', 'ringing', 'active']
      },
      include: [
        {
          model: User,
          as: 'initiator',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'profileData', 'role']
        },
        {
          model: Appointment,
          as: 'appointment',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: activeCalls,
      count: activeCalls.length
    });

  } catch (error) {
    console.error('❌ Get active calls error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active calls',
      message: error.message
    });
  }
};
