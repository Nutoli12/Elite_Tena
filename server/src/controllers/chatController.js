import db from '../models/index.js';
import { getIO } from '../services/socketService.js';
import EnhancedNotificationService from '../services/enhancedNotificationService.js';

const { Message, User, Appointment } = db;

/**
 * 💬 CHAT CONTROLLER
 * Handles all chat-related operations
 */

/**
 * Get chat messages for an appointment
 */
export const getAppointmentMessages = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { limit = 50, before } = req.query;

    console.log('💬 Fetching messages for appointment:', appointmentId);

    const where = { appointmentId };
    if (before) {
      where.createdAt = { [db.Sequelize.Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    console.log(`✅ Found ${messages.length} messages`);

    res.json({
      success: true,
      data: chronologicalMessages,
      count: messages.length
    });

  } catch (error) {
    console.error('❌ Get appointment messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
};

/**
 * Get chat messages between two users
 */
export const getDirectMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const { limit = 50, before } = req.query;

    console.log('💬 Fetching direct messages between:', user1, user2);

    const where = {
      [db.Sequelize.Op.or]: [
        { senderWallet: user1.toLowerCase(), receiverWallet: user2.toLowerCase() },
        { senderWallet: user2.toLowerCase(), receiverWallet: user1.toLowerCase() }
      ]
    };

    if (before) {
      where.createdAt = { [db.Sequelize.Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['walletAddress', 'email', 'profileData', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    const chronologicalMessages = messages.reverse();

    console.log(`✅ Found ${messages.length} messages`);

    res.json({
      success: true,
      data: chronologicalMessages,
      count: messages.length
    });

  } catch (error) {
    console.error('❌ Get direct messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
};

/**
 * Send a message
 */
export const sendMessage = async (req, res) => {
  try {
    const {
      senderWallet,
      receiverWallet,
      appointmentId,
      content,
      type = 'text',
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      metadata
    } = req.body;

    console.log('📤 Sending message from:', senderWallet, 'to:', receiverWallet);

    // Validate required fields
    if (!senderWallet || !receiverWallet || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'senderWallet, receiverWallet, and content are required'
      });
    }

    // Create message
    const message = await Message.create({
      senderWallet: senderWallet.toLowerCase(),
      receiverWallet: receiverWallet.toLowerCase(),
      appointmentId: appointmentId || null,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      metadata,
      read: false
    });

    // Load sender info for real-time notification
    const sender = await User.findOne({
      where: { walletAddress: senderWallet.toLowerCase() },
      attributes: ['walletAddress', 'email', 'profileData', 'role']
    });

    // Emit real-time message via Socket.io
    try {
      const io = getIO();
      
      // Emit to appointment room if applicable
      if (appointmentId) {
        io.to(appointmentId).emit('receive_message', {
          ...message.toJSON(),
          sender
        });
      }

      // Emit to receiver's personal room
      io.to(receiverWallet.toLowerCase()).emit('receive_message', {
        ...message.toJSON(),
        sender
      });

      console.log('✅ Real-time message sent');
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available, message saved to DB only');
    }

    // Send notification to receiver
    const senderName = sender?.profileData?.fullName || 'Someone';
    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    await EnhancedNotificationService.sendToUser(
      receiverWallet,
      'chat_message',
      {
        senderName,
        preview,
        relatedId: message.id,
        relatedType: 'message'
      }
    );

    console.log('✅ Message created:', message.id);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...message.toJSON(),
        sender
      }
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    console.log('📖 Marking message as read:', messageId);

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Only receiver can mark as read
    if (message.receiverWallet.toLowerCase() !== userId.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only the receiver can mark message as read'
      });
    }

    await message.update({ read: true, readAt: new Date() });

    // Emit read receipt via Socket.io
    try {
      const io = getIO();
      io.to(message.senderWallet.toLowerCase()).emit('message_read', {
        messageId: message.id,
        readAt: message.readAt
      });
    } catch (socketError) {
      console.warn('⚠️ Socket.io not available for read receipt');
    }

    console.log('✅ Message marked as read');

    res.json({
      success: true,
      message: 'Message marked as read',
      data: message
    });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      message: error.message
    });
  }
};

/**
 * Mark all messages as read for a conversation
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const { otherUserId, appointmentId } = req.body;

    console.log('📖 Marking all messages as read for user:', userId);

    const where = {
      receiverWallet: userId.toLowerCase(),
      read: false
    };

    if (appointmentId) {
      where.appointmentId = appointmentId;
    } else if (otherUserId) {
      where.senderWallet = otherUserId.toLowerCase();
    }

    const result = await Message.update(
      { read: true, readAt: new Date() },
      { where }
    );

    console.log(`✅ Marked ${result[0]} messages as read`);

    res.json({
      success: true,
      message: 'All messages marked as read',
      count: result[0]
    });

  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all messages as read',
      message: error.message
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Message.count({
      where: {
        receiverWallet: userId.toLowerCase(),
        read: false
      }
    });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message
    });
  }
};

/**
 * Get chat conversations list
 */
export const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('💬 Fetching conversations for user:', userId);

    // Get all unique conversations
    const conversations = await db.sequelize.query(`
      SELECT DISTINCT ON (other_user)
        other_user,
        last_message_id,
        last_message_content,
        last_message_time,
        unread_count,
        u.email,
        u."profileData",
        u.role
      FROM (
        SELECT 
          CASE 
            WHEN "senderWallet" = :userId THEN "receiverWallet"
            ELSE "senderWallet"
          END as other_user,
          id as last_message_id,
          content as last_message_content,
          "createdAt" as last_message_time,
          (
            SELECT COUNT(*)
            FROM messages m2
            WHERE m2."receiverWallet" = :userId
            AND m2."senderWallet" = CASE 
              WHEN messages."senderWallet" = :userId THEN messages."receiverWallet"
              ELSE messages."senderWallet"
            END
            AND m2.read = false
          ) as unread_count
        FROM messages
        WHERE "senderWallet" = :userId OR "receiverWallet" = :userId
        ORDER BY "createdAt" DESC
      ) conversations
      LEFT JOIN users u ON u."walletAddress" = conversations.other_user
      ORDER BY other_user, last_message_time DESC
    `, {
      replacements: { userId: userId.toLowerCase() },
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${conversations.length} conversations`);

    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    console.log('🗑️ Deleting message:', messageId);

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Only sender can delete
    if (message.senderWallet.toLowerCase() !== userId.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only the sender can delete this message'
      });
    }

    await message.destroy();

    console.log('✅ Message deleted');

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      message: error.message
    });
  }
};
