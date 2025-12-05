import db from '../models/index.js';
import { getIO } from './socketService.js';

const { Notification, User } = db;

/**
 * 🔔 Enhanced Notification Service
 * Handles all notification types for all user roles
 */
class EnhancedNotificationService {
  
  /**
   * Notification templates for different types
   */
  static templates = {
    // Patient notifications
    appointment_reminder: {
      title: 'Appointment Reminder',
      getMessage: (data) => `Your appointment with Dr. ${data.doctorName} is ${data.timeUntil}`,
      priority: 'high'
    },
    appointment_confirmed: {
      title: 'Appointment Confirmed',
      getMessage: (data) => `Your appointment on ${data.date} has been confirmed`,
      priority: 'medium'
    },
    appointment_cancelled: {
      title: 'Appointment Cancelled',
      getMessage: (data) => `Your appointment on ${data.date} has been cancelled`,
      priority: 'high'
    },
    payment_required: {
      title: 'Payment Required',
      getMessage: (data) => `Payment of ${data.amount} Birr is required for your appointment`,
      priority: 'high'
    },
    payment_confirmed: {
      title: 'Payment Confirmed',
      getMessage: (data) => `Your payment of ${data.amount} Birr has been confirmed`,
      priority: 'medium'
    },
    lab_results_ready: {
      title: 'Lab Results Ready',
      getMessage: (data) => `Your ${data.testType} results are now available`,
      priority: 'high'
    },
    prescription_ready: {
      title: 'Prescription Ready',
      getMessage: (data) => `Your prescription is ready for pickup at ${data.pharmacy}`,
      priority: 'medium'
    },
    video_call_ready: {
      title: 'Video Call Ready',
      getMessage: (data) => `Dr. ${data.doctorName} is ready for your video consultation`,
      priority: 'urgent'
    },
    chat_message: {
      title: 'New Message',
      getMessage: (data) => `${data.senderName}: ${data.preview}`,
      priority: 'low'
    },

    // Doctor notifications
    new_appointment_request: {
      title: 'New Appointment Request',
      getMessage: (data) => `${data.patientName} requested an appointment for ${data.date}`,
      priority: 'high'
    },
    patient_checked_in: {
      title: 'Patient Checked In',
      getMessage: (data) => `${data.patientName} has checked in for their appointment`,
      priority: 'high'
    },
    lab_results_to_review: {
      title: 'Lab Results to Review',
      getMessage: (data) => `${data.testType} results for ${data.patientName} are ready for review`,
      priority: 'medium'
    },
    prescription_request: {
      title: 'Prescription Request',
      getMessage: (data) => `${data.patientName} requested a prescription refill`,
      priority: 'medium'
    },
    payment_received: {
      title: 'Payment Received',
      getMessage: (data) => `Payment of ${data.amount} Birr received from ${data.patientName}`,
      priority: 'low'
    },
    video_call_request: {
      title: 'Video Call Request',
      getMessage: (data) => `${data.patientName} is requesting a video consultation`,
      priority: 'urgent'
    },

    // Pharmacist notifications
    new_prescription: {
      title: 'New Prescription',
      getMessage: (data) => `New prescription for ${data.patientName} - ${data.medication}`,
      priority: 'medium'
    },
    prescription_picked_up: {
      title: 'Prescription Picked Up',
      getMessage: (data) => `${data.patientName} picked up prescription #${data.prescriptionId}`,
      priority: 'low'
    },
    stock_alert: {
      title: 'Stock Alert',
      getMessage: (data) => `${data.medication} stock is low (${data.quantity} remaining)`,
      priority: 'high'
    },

    // Lab technician notifications
    new_lab_order: {
      title: 'New Lab Order',
      getMessage: (data) => `New ${data.testType} ordered for ${data.patientName}`,
      getPriority: (data) => data.urgency === 'urgent' ? 'urgent' : 'medium'
    },
    urgent_test: {
      title: 'Urgent Test Required',
      getMessage: (data) => `URGENT: ${data.testType} for ${data.patientName} in ${data.location}`,
      priority: 'urgent'
    },
    results_uploaded: {
      title: 'Results Uploaded',
      getMessage: (data) => `${data.testType} results uploaded for ${data.patientName}`,
      priority: 'low'
    },

    // System notifications
    system_update: {
      title: 'System Update',
      getMessage: (data) => data.message || 'System has been updated',
      priority: 'low'
    },
    maintenance_scheduled: {
      title: 'Maintenance Scheduled',
      getMessage: (data) => `System maintenance scheduled for ${data.date}`,
      priority: 'medium'
    }
  };

  /**
   * Send notification to a specific user
   */
  static async sendToUser(userId, type, data = {}) {
    try {
      const template = this.templates[type];
      if (!template) {
        console.warn(`⚠️ Unknown notification type: ${type}`);
        return { success: false, error: 'Unknown notification type' };
      }

      const normalizedUserId = userId.toLowerCase();

      // Determine priority
      let priority = data.priority;
      if (!priority) {
        priority = template.getPriority ? template.getPriority(data) : template.priority;
      }

      // Create notification in database
      const notification = await Notification.create({
        userId: normalizedUserId,
        type,
        title: template.title,
        message: template.getMessage(data),
        priority,
        relatedId: data.relatedId || null,
        relatedType: data.relatedType || null,
        isRead: false,
        expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
      });

      // Send real-time notification via Socket.io
      try {
        const io = getIO();
        io.to(normalizedUserId).emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Real-time notification sent to ${normalizedUserId}: ${type}`);
      } catch (socketError) {
        console.warn('⚠️ Socket.io not available, notification saved to DB only');
      }

      console.log(`✅ Notification created for ${normalizedUserId}: ${type}`);
      return { success: true, notification };

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  static async sendToRole(role, type, data = {}) {
    try {
      console.log(`📢 Sending notification to all ${role}s: ${type}`);

      // Get all users with the specified role
      const users = await User.findAll({
        where: { role, isActive: true },
        attributes: ['walletAddress']
      });

      if (users.length === 0) {
        console.log(`⚠️ No active ${role}s found`);
        return { success: true, count: 0 };
      }

      // Send to each user
      const results = await Promise.all(
        users.map(user => this.sendToUser(user.walletAddress, type, data))
      );

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Sent notification to ${successCount}/${users.length} ${role}s`);

      return { success: true, count: successCount, total: users.length };

    } catch (error) {
      console.error('❌ Failed to send notification to role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultiple(userIds, type, data = {}) {
    try {
      const results = await Promise.all(
        userIds.map(userId => this.sendToUser(userId, type, data))
      );

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Sent notification to ${successCount}/${userIds.length} users`);

      return { success: true, count: successCount, total: userIds.length };

    } catch (error) {
      console.error('❌ Failed to send notifications to multiple users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnread(userId) {
    try {
      const notifications = await Notification.findAll({
        where: {
          userId: userId.toLowerCase(),
          isRead: false,
          expiresAt: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.gt]: new Date() }] }
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      return { success: true, data: notifications, count: notifications.length };
    } catch (error) {
      console.error('❌ Failed to get unread notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId: userId.toLowerCase() }
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      await notification.update({ isRead: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.update(
        { isRead: true },
        { where: { userId: userId.toLowerCase(), isRead: false } }
      );

      return { success: true, count: result[0] };
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete old read notifications (cleanup)
   */
  static async cleanup(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.destroy({
        where: {
          isRead: true,
          createdAt: { [db.Sequelize.Op.lt]: cutoffDate }
        }
      });

      console.log(`🧹 Cleaned up ${result} old notifications`);
      return { success: true, count: result };
    } catch (error) {
      console.error('❌ Failed to cleanup notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EnhancedNotificationService;
