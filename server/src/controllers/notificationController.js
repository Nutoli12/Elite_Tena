import db from '../models/index.js';
const { Notification, User } = db;

/**
 * Create a new notification
 */
export const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, relatedId, priority } = req.body;

    console.log('🔔 Creating notification for user:', userId);

    const notification = await Notification.create({
      userId: userId.toLowerCase(),
      title,
      message,
      type: type || 'info',
      relatedId,
      priority: priority || 'medium',
      isRead: false
    });

    console.log('✅ Notification created:', notification.id);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isRead, type, limit = 50 } = req.query;

    console.log('🔍 Fetching notifications for user:', userId);

    const where = { userId: userId.toLowerCase() };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }
    if (type) {
      where.type = type;
    }

    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'profileData']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`✅ Found ${notifications.length} notifications`);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📖 Marking notification as read:', id);

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.update({ isRead: true });

    console.log('✅ Notification marked as read');

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📖 Marking all notifications as read for user:', userId);

    const result = await Notification.update(
      { isRead: true },
      { where: { userId: userId.toLowerCase(), isRead: false } }
    );

    console.log('✅ All notifications marked as read');

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result[0]
    });
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting notification:', id);

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.destroy();

    console.log('✅ Notification deleted');

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
};

/**
 * 🔔 NEW: Get notification statistics for user
 */
export const getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📊 Fetching notification stats for user:', userId);

    const [total, unread, byType] = await Promise.all([
      Notification.count({ where: { userId: userId.toLowerCase() } }),
      Notification.count({ where: { userId: userId.toLowerCase(), isRead: false } }),
      Notification.findAll({
        where: { userId: userId.toLowerCase() },
        attributes: [
          'type',
          [db.sequelize.fn('COUNT', db.sequelize.col('type')), 'count']
        ],
        group: ['type'],
        raw: true
      })
    ]);

    const stats = {
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {})
    };

    console.log('✅ Notification stats calculated');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification stats',
      message: error.message
    });
  }
};

/**
 * Legacy compatibility functions
 */
export const markNotificationAsRead = markAsRead;
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const count = await Notification.count({ 
      where: { userId: userId.toLowerCase(), isRead: false } 
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

export const sendTestNotification = async (req, res) => {
  try {
    const { userId, type, title, message } = req.body;
    
    console.log('🧪 Sending test notification');
    
    const notification = await Notification.create({
      userId: userId.toLowerCase(),
      title: title || 'Test Notification',
      message: message || 'This is a test notification from the system',
      type: type || 'info',
      priority: 'medium',
      isRead: false
    });
    
    res.json({
      success: true,
      message: 'Test notification sent',
      data: notification
    });
  } catch (error) {
    console.error('❌ Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
};