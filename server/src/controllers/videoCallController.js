import db from '../models/index.js';
import { getIO } from '../services/socketService.js';
import EnhancedNotificationService from '../services/enhancedNotificationService.js';
import { v4 as uuidv4 } from 'uuid';

const { VideoCall, User, Appointment } = db;

/**
 * 📹 VIDEO CALL CONTROLLER
 * Handles video consultation sessions
 */

/**
 * Initiate a video call
 */
export const initiateCall = async (req, res) => {
  try {
    const {
      initiatorWallet,
      receiverWallet,
      appointmentId
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

    // Check if users exist
    const [initiator, receiver] = await Promise.all([
      User.findOne({ where: { walletAddress: initiatorWallet.toLowerCase() } }),
      User.findOne({ where: { walletAddress: receiverWallet.toLowerCase() } })
    ]);

    if (!initiator || !receiver) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'One or both users not found'
      });
    }

    // Generate unique room ID
    const roomId = `room-${uuidv4()}`;

    // Create video call record
    const videoCall = await VideoCall.create({
      initiatorWallet: initiatorWallet.toLowerCase(),
      receiverWallet: receiverWallet.toLowerCase(),
      appointmentId: appointmentId || null,
      roomId,
      status: 'initiated'
    });

    // Send notification to receiver
    const initiatorName = initiator.profileData?.fullName || 'Someone';
    await EnhancedNotificationService.sendToUser(
      receiverWallet,
      'video_call_request',
      {
        senderName: initiatorName,
        relatedId: videoCall.id,
        relatedType: 'video_call'
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
        appointmentId
      });
      console.log('✅ Call request sent via Socket.io');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available for call notification');
    }

    console.log('✅ Video call initiated:', videoCall.id);

    res.status(201).json({
      success: true,
      message: 'Video call initiated',
      data: videoCall
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
        error: 'Unauthorized',
        message: 'Only the receiver can answer this call'
      });
    }

    // Update call status
    await videoCall.update({
      status: 'active',
      startedAt: new Date()
    });

    // Notify initiator that call was answered
    try {
      const io = getIO();
      io.to(videoCall.initiatorWallet).emit('call_answered', {
        callId: videoCall.id,
        roomId: videoCall.roomId
      });
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available');
    }

    console.log('✅ Call answered');

    res.json({
      success: true,
      message: 'Call answered',
      data: videoCall
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
    const { userWallet, reason, quality } = req.body;

    console.log('🔚 Ending call:', callId);

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

    // Update call status
    await videoCall.update({
      status: 'ended',
      endedAt: new Date(),
      endReason: reason || 'normal',
      quality: quality || null
    });

    // Notify other participant
    const otherParticipant = videoCall.initiatorWallet.toLowerCase() === userWallet.toLowerCase()
      ? videoCall.receiverWallet
      : videoCall.initiatorWallet;

    try {
      const io = getIO();
      io.to(otherParticipant).emit('call_ended', {
        callId: videoCall.id,
        reason
      });
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available');
    }

    console.log('✅ Call ended. Duration:', videoCall.duration, 'seconds');

    res.json({
      success: true,
      message: 'Call ended',
      data: videoCall
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
      [db.Sequelize.Op.or]: [
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
    const { quality } = req.body;

    const videoCall = await VideoCall.findByPk(callId);

    if (!videoCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    await videoCall.update({ quality });

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
