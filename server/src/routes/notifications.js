import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  sendTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Get user notifications
router.get('/:userId', getUserNotifications);

// Get unread count
router.get('/:userId/unread-count', getUnreadCount);

// Mark notification as read (legacy)
router.post('/mark-read', markNotificationAsRead);

// Mark single notification as read by ID (new route for frontend)
router.put('/:id/read', markAsRead);
router.post('/:id/read', markAsRead);

// Mark all notifications as read for a user
router.put('/:userId/read-all', markAllAsRead);
router.post('/:userId/read-all', markAllAsRead);

// Delete notification by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Notification } = await import('../models/index.js').then(m => m.default);
    
    const notification = await Notification.findByPk(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.destroy();
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Send test notification (for testing)
router.post('/test', sendTestNotification);

export default router;