/**
 * Notification Routes
 * Handles notification-related API endpoints
 */

import express from 'express';
import db from '../models/index.js';
import LabNotificationService from '../services/LabNotificationService.js';

const router = express.Router();
const { Notification } = db;

/**
 * Get notifications for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const { type, isRead, limit = 50, page = 1 } = req.query;

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Build where clause
    const where = {
      userId: userWalletAddress.toLowerCase()
    };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const count = await Notification.count({
      where: {
        userId: userWalletAddress.toLowerCase(),
        isRead: false
      }
    });

    res.json({
      success: true,
      data: { unreadCount: count }
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Mark notifications as read
 */
router.patch('/mark-read', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const { notificationIds, markAll = false } = req.body;

    if (!userWalletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    let updateWhere = {
      userId: userWalletAddress.toLowerCase(),
      isRead: false
    };

    if (!markAll) {
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({
          success: false,
          message: 'notificationIds array is required when markAll is false'
        });
      }
      updateWhere.id = { [db.Sequelize.Op.in]: notificationIds };
    }

    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: updateWhere }
    );

    res.json({
      success: true,
      data: { updatedCount }
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get lab-specific notifications for technicians
 */
router.get('/lab', async (req, res) => {
  try {
    const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    if (!['lab_technician', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Lab technicians only'
      });
    }

    const result = await LabNotificationService.getUnreadNotifications(
      userWalletAddress,
      'new_lab_order'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch lab notifications',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        count: result.count
      }
    });

  } catch (error) {
    console.error('Error fetching lab notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Test notification endpoint (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req, res) => {
    try {
      const userWalletAddress = req.user?.walletAddress || req.headers['x-wallet-address'];
      const { title, message, type = 'info' } = req.body;

      if (!userWalletAddress) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const notification = await Notification.create({
        userId: userWalletAddress.toLowerCase(),
        title: title || 'Test Notification',
        message: message || 'This is a test notification from the development environment.',
        type,
        priority: 'medium'
      });

      res.json({
        success: true,
        message: 'Test notification created',
        data: { notification }
      });

    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification',
        error: error.message
      });
    }
  });
}

export default router;