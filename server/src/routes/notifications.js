import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  getUnreadCount,
  sendTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Get user notifications
router.get('/:userId', getUserNotifications);

// Get unread count
router.get('/:userId/unread-count', getUnreadCount);

// Mark notification as read
router.post('/mark-read', markNotificationAsRead);

// Send test notification (for testing)
router.post('/test', sendTestNotification);

export default router;