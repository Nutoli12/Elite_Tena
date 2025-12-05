import express from 'express';
import {
  getAppointmentMessages,
  getDirectMessages,
  sendMessage,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getConversations,
  deleteMessage
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * 💬 CHAT ROUTES
 * All chat-related endpoints
 */

// Get messages
router.get('/appointment/:appointmentId', getAppointmentMessages);
router.get('/direct/:user1/:user2', getDirectMessages);
router.get('/conversations/:userId', getConversations);
router.get('/unread/:userId', getUnreadCount);

// Send message
router.post('/send', sendMessage);

// Mark as read
router.put('/read/:messageId', markAsRead);
router.put('/read-all/:userId', markAllAsRead);

// Delete message
router.delete('/:messageId', deleteMessage);

export default router;
