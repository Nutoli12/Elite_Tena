import db from '../models/index.js';
import { Op } from 'sequelize';
import { getIO } from '../services/socketService.js';

const { PremiumConsultation, ConsultationMessage, User } = db;

/**
 * 💬 CONSULTATION CHAT CONTROLLER
 * Handles chat messages within premium consultations
 */

/**
 * Send a message in consultation
 * POST /api/premium-consultations/:id/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { senderWallet, content, messageType = 'text', fileUrl, fileName, fileSize, fileMimeType } = req.body;

    console.log('📤 Sending consultation message:', { consultationId: id, senderWallet });

    // Get consultation
    const consultation = await PremiumConsultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    // Verify sender is participant
    const isPatient = consultation.patientWallet.toLowerCase() === senderWallet.toLowerCase();
    const isDoctor = consultation.doctorWallet.toLowerCase() === senderWallet.toLowerCase();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check consultation is accessible
    if (!consultation.isAccessible()) {
      return res.status(400).json({ success: false, error: 'Consultation is not active or has expired' });
    }

    // Get sender info
    const sender = await User.findOne({
      where: { walletAddress: senderWallet.toLowerCase() },
      attributes: ['walletAddress', 'name', 'profileData']
    });

    // Create message
    const message = await ConsultationMessage.create({
      consultationId: id,
      senderWallet: senderWallet.toLowerCase(),
      senderRole: isDoctor ? 'doctor' : 'patient',
      messageType,
      content,
      fileUrl,
      fileName,
      fileSize,
      fileMimeType
    });

    // Emit via Socket.io
    try {
      const io = getIO();
      const receiverWallet = isDoctor ? consultation.patientWallet : consultation.doctorWallet;
      
      const messageData = {
        ...message.toJSON(),
        sender: {
          walletAddress: sender.walletAddress,
          name: sender.name,
          profileData: sender.profileData
        }
      };

      // Emit to consultation room
      io.to(consultation.chatRoomId).emit('consultation_message', messageData);
      // Also emit to receiver's personal room
      io.to(receiverWallet.toLowerCase()).emit('consultation_message', messageData);

      console.log('✅ Message sent via Socket.io');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available:', socketError.message);
    }

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', message: error.message });
  }
};

/**
 * Get messages for consultation
 * GET /api/premium-consultations/:id/messages
 */
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet, limit = 100, before } = req.query;

    const consultation = await PremiumConsultation.findByPk(id);
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

    const where = { consultationId: id };
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await ConsultationMessage.findAll({
      where,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['walletAddress', 'name', 'profileData']
      }],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages', message: error.message });
  }
};

/**
 * Mark messages as read
 * POST /api/premium-consultations/:id/messages/read
 */
export const markMessagesRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.body;

    const consultation = await PremiumConsultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    // Determine which messages to mark as read (messages NOT sent by this user)
    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();
    const senderRole = isDoctor ? 'patient' : 'doctor';

    const [count] = await ConsultationMessage.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          consultationId: id,
          senderRole,
          isRead: false
        }
      }
    );

    // Emit read receipt
    try {
      const io = getIO();
      const otherWallet = isDoctor ? consultation.patientWallet : consultation.doctorWallet;
      io.to(otherWallet.toLowerCase()).emit('messages_read', {
        consultationId: id,
        readBy: userWallet,
        readAt: new Date()
      });
    } catch (e) {
      // Socket not available
    }

    res.json({
      success: true,
      message: `Marked ${count} messages as read`
    });

  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read', message: error.message });
  }
};

/**
 * Get unread count for consultation
 * GET /api/premium-consultations/:id/messages/unread
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet } = req.query;

    const consultation = await PremiumConsultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet?.toLowerCase();
    const senderRole = isDoctor ? 'patient' : 'doctor';

    const count = await ConsultationMessage.count({
      where: {
        consultationId: id,
        senderRole,
        isRead: false
      }
    });

    res.json({ success: true, count });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count', message: error.message });
  }
};

/**
 * Send typing indicator
 * POST /api/premium-consultations/:id/typing
 */
export const sendTypingIndicator = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet, isTyping } = req.body;

    const consultation = await PremiumConsultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    try {
      const io = getIO();
      const isDoctor = consultation.doctorWallet.toLowerCase() === userWallet.toLowerCase();
      const receiverWallet = isDoctor ? consultation.patientWallet : consultation.doctorWallet;

      io.to(receiverWallet.toLowerCase()).emit('typing_indicator', {
        consultationId: id,
        userWallet,
        isTyping,
        isDoctor
      });
    } catch (e) {
      // Socket not available
    }

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
