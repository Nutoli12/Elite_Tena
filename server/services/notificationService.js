import db from '../src/models/index.js';

class NotificationService {
  constructor() {
    this.notifications = new Map(); // In-memory storage for demo
  }

  async sendAppointmentReminder(patient, appointment) {
    try {
      console.log('📅 Sending appointment reminder to:', patient.email);
      
      const notification = {
        id: `notif-${Date.now()}`,
        userId: patient.walletAddress,
        type: 'appointment_reminder',
        title: 'Appointment Reminder',
        message: `You have an appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleDateString()}`,
        data: { appointmentId: appointment.id },
        isRead: false,
        createdAt: new Date().toISOString()
      };

      this.notifications.set(notification.id, notification);
      
      // In production, send SMS/Email here
      console.log('✅ Appointment reminder sent');
      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('❌ Failed to send appointment reminder:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentConfirmation(patient, payment) {
    try {
      console.log('💰 Sending payment confirmation to:', patient.email);
      
      const notification = {
        id: `notif-${Date.now()}`,
        userId: patient.walletAddress,
        type: 'payment_confirmation',
        title: 'Payment Confirmed',
        message: `Your payment of ${payment.amount} ETB has been processed successfully`,
        data: { paymentId: payment.id },
        isRead: false,
        createdAt: new Date().toISOString()
      };

      this.notifications.set(notification.id, notification);
      
      console.log('✅ Payment confirmation sent');
      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('❌ Failed to send payment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  async sendLabResultsReady(patient, labResults) {
    try {
      console.log('🧪 Sending lab results notification to:', patient.email);
      
      const notification = {
        id: `notif-${Date.now()}`,
        userId: patient.walletAddress,
        type: 'lab_results_ready',
        title: 'Lab Results Ready',
        message: `Your ${labResults.testName} results are now available`,
        data: { labResultId: labResults.id },
        isRead: false,
        createdAt: new Date().toISOString()
      };

      this.notifications.set(notification.id, notification);
      
      console.log('✅ Lab results notification sent');
      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('❌ Failed to send lab results notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPrescriptionReady(patient, prescription) {
    try {
      console.log('💊 Sending prescription notification to:', patient.email);
      
      const notification = {
        id: `notif-${Date.now()}`,
        userId: patient.walletAddress,
        type: 'prescription_ready',
        title: 'Prescription Ready',
        message: `Your prescription for ${prescription.medication} is ready for pickup`,
        data: { prescriptionId: prescription.id },
        isRead: false,
        createdAt: new Date().toISOString()
      };

      this.notifications.set(notification.id, notification);
      
      console.log('✅ Prescription notification sent');
      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('❌ Failed to send prescription notification:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserNotifications(userId) {
    try {
      const userNotifications = Array.from(this.notifications.values())
        .filter(notif => notif.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return { success: true, data: userNotifications };
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(notificationId) {
    try {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.isRead = true;
        this.notifications.set(notificationId, notification);
        return { success: true };
      }
      return { success: false, error: 'Notification not found' };
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  async getUnreadCount(userId) {
    try {
      const unreadCount = Array.from(this.notifications.values())
        .filter(notif => notif.userId === userId && !notif.isRead)
        .length;

      return { success: true, count: unreadCount };
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();