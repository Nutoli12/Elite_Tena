/**
 * Lab Notification Service
 * Handles all lab-related notifications for doctors, technicians, and patients
 */

import db from '../models/index.js';

const { Notification, User, LabWorkflowOrder, LabWorkflowTestCatalog } = db;

class LabNotificationService {
  
  /**
   * Send notification to all lab technicians when a new lab order is created
   */
  static async notifyLabTechniciansNewOrder(labOrder, testDetails = []) {
    try {
      console.log(`📧 Sending new lab order notifications for order ${labOrder.orderNumber}...`);

      // Get all active lab technicians
      const labTechnicians = await User.findAll({
        where: {
          role: 'lab_technician',
          isActive: true
        },
        attributes: ['walletAddress', 'name', 'email']
      });

      if (labTechnicians.length === 0) {
        console.log('⚠️  No lab technicians found to notify');
        return { success: true, notificationsSent: 0 };
      }

      // Get patient and doctor info for notification
      const patient = await User.findOne({
        where: { walletAddress: labOrder.patientWalletAddress },
        attributes: ['name', 'email']
      });

      const doctor = await User.findOne({
        where: { walletAddress: labOrder.doctorWalletAddress },
        attributes: ['name', 'email']
      });

      // Determine priority based on order priority
      const notificationPriority = labOrder.priority === 'stat' ? 'urgent' : 
                                  labOrder.priority === 'urgent' ? 'high' : 'medium';

      // Create notification for each lab technician
      const notifications = [];
      for (const technician of labTechnicians) {
        const notification = {
          userId: technician.walletAddress,
          title: `🧪 New Lab Order: ${labOrder.orderNumber}`,
          message: this.generateNewOrderMessage(labOrder, patient, doctor, testDetails),
          type: labOrder.priority === 'stat' || labOrder.priority === 'urgent' ? 'urgent_test' : 'new_lab_order',
          priority: notificationPriority,
          relatedId: labOrder.id.toString(),
          relatedType: 'lab_order',
          data: {
            orderNumber: labOrder.orderNumber,
            patientName: patient?.name || 'Unknown Patient',
            doctorName: doctor?.name || 'Unknown Doctor',
            testCodes: labOrder.testCodes,
            priority: labOrder.priority,
            sampleType: labOrder.sampleType,
            specialInstructions: labOrder.specialInstructions,
            collectionDate: labOrder.collectionDate,
            testNames: testDetails.map(test => test.testName).join(', ')
          }
        };

        notifications.push(notification);
      }

      // Bulk create notifications
      const createdNotifications = await Notification.bulkCreate(notifications);

      console.log(`✅ Sent ${createdNotifications.length} notifications to lab technicians`);

      // Send real-time notifications via WebSocket (if available)
      await this.sendRealTimeNotifications(labTechnicians, labOrder, 'new_order');

      return {
        success: true,
        notificationsSent: createdNotifications.length,
        techniciansNotified: labTechnicians.length
      };

    } catch (error) {
      console.error('❌ Error sending lab technician notifications:', error);
      return {
        success: false,
        error: error.message,
        notificationsSent: 0
      };
    }
  }

  /**
   * Generate notification message for new lab order
   */
  static generateNewOrderMessage(labOrder, patient, doctor, testDetails) {
    const patientName = patient?.name || 'Unknown Patient';
    const doctorName = doctor?.name || 'Unknown Doctor';
    const testCount = labOrder.testCodes.length;
    const testNames = testDetails.length > 0 
      ? testDetails.map(test => test.testName).slice(0, 3).join(', ')
      : labOrder.testCodes.slice(0, 3).join(', ');

    let message = `New lab order received from Dr. ${doctorName} for patient ${patientName}.\n\n`;
    message += `📋 Order Details:\n`;
    message += `• Order Number: ${labOrder.orderNumber}\n`;
    message += `• Priority: ${labOrder.priority.toUpperCase()}\n`;
    message += `• Tests (${testCount}): ${testNames}${testCount > 3 ? '...' : ''}\n`;
    
    if (labOrder.sampleType) {
      message += `• Sample Type: ${labOrder.sampleType}\n`;
    }
    
    if (labOrder.specialInstructions) {
      message += `• Special Instructions: ${labOrder.specialInstructions}\n`;
    }

    if (labOrder.collectionDate) {
      const collectionDate = new Date(labOrder.collectionDate).toLocaleDateString();
      message += `• Collection Date: ${collectionDate}\n`;
    }

    message += `\n🔬 Please process this order when ready.`;

    if (labOrder.priority === 'stat') {
      message += `\n\n⚠️ STAT ORDER - Immediate processing required!`;
    } else if (labOrder.priority === 'urgent') {
      message += `\n\n🚨 URGENT - Priority processing requested.`;
    }

    return message;
  }

  /**
   * Notify doctor when lab results are uploaded by technician
   */
  static async notifyDoctorResultsUploaded(labResult, testDetails = []) {
    try {
      console.log(`📧 Sending result upload notification to doctor for order ${labResult.labOrder.orderNumber}...`);

      // Determine notification priority based on critical values
      const priority = labResult.hasCriticalValues ? 'urgent' : 'high';
      const notificationType = labResult.hasCriticalValues ? 'critical_lab_results' : 'lab_results_uploaded';

      // Generate detailed message
      const message = this.generateResultUploadMessage(labResult, testDetails);

      const notification = await Notification.create({
        userId: labResult.labOrder.doctorWalletAddress,
        title: labResult.hasCriticalValues 
          ? `🚨 CRITICAL Lab Results: ${labResult.labOrder.orderNumber}`
          : `📊 Lab Results Ready: ${labResult.labOrder.orderNumber}`,
        message,
        type: notificationType,
        priority,
        relatedId: labResult.id.toString(),
        relatedType: 'lab_result',
        data: {
          orderNumber: labResult.labOrder.orderNumber,
          patientName: labResult.labOrder.patient?.name || 'Unknown Patient',
          technicianName: labResult.technician?.name || 'Lab Technician',
          resultId: labResult.id,
          hasCriticalValues: labResult.hasCriticalValues,
          criticalValues: labResult.criticalValues || [],
          testCodes: labResult.labOrder.testCodes,
          testNames: testDetails.map(test => test.testName).join(', '),
          uploadedAt: labResult.resultDate || new Date().toISOString()
        }
      });

      console.log(`✅ Notified Dr. ${labResult.labOrder.doctor?.name} about uploaded results: ${labResult.labOrder.orderNumber}`);
      
      // Send real-time notification for critical values
      if (labResult.hasCriticalValues) {
        await this.sendRealTimeNotifications([labResult.labOrder.doctor], labResult.labOrder, 'critical_results');
      }

      return { success: true, notificationId: notification.id };

    } catch (error) {
      console.error('❌ Error notifying doctor about uploaded results:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate notification message for uploaded lab results
   */
  static generateResultUploadMessage(labResult, testDetails) {
    const patientName = labResult.labOrder.patient?.name || 'Unknown Patient';
    const technicianName = labResult.technician?.name || 'Lab Technician';
    const testCount = labResult.labOrder.testCodes.length;
    const testNames = testDetails.length > 0 
      ? testDetails.map(test => test.testName).slice(0, 3).join(', ')
      : labResult.labOrder.testCodes.slice(0, 3).join(', ');

    let message = `Lab results have been uploaded and are ready for your review.\n\n`;
    message += `👤 Patient: ${patientName}\n`;
    message += `🔬 Processed by: ${technicianName}\n`;
    message += `📋 Order: ${labResult.labOrder.orderNumber}\n`;
    message += `🧪 Tests (${testCount}): ${testNames}${testCount > 3 ? '...' : ''}\n`;
    message += `📅 Result Date: ${new Date(labResult.resultDate || new Date()).toLocaleDateString()}\n`;

    if (labResult.interpretation) {
      message += `\n📝 Technician Interpretation:\n${labResult.interpretation}\n`;
    }

    if (labResult.hasCriticalValues && labResult.criticalValues?.length > 0) {
      message += `\n🚨 CRITICAL VALUES DETECTED:\n`;
      labResult.criticalValues.forEach(critical => {
        message += `• ${critical.testName || critical.testCode}: ${critical.value} ${critical.unit || ''}\n`;
      });
      message += `\n⚠️ IMMEDIATE ATTENTION REQUIRED - Please review these critical results promptly.\n`;
    }

    message += `\n🔍 Please review the complete results in your dashboard and take appropriate clinical action.`;

    return message;
  }

  /**
   * Notify doctor when lab results are ready for review
   */
  static async notifyDoctorResultsReady(labResult) {
    try {
      const labOrder = await LabWorkflowOrder.findByPk(labResult.labOrderId, {
        include: [
          { model: User, as: 'patient', attributes: ['name', 'email'] },
          { model: User, as: 'doctor', attributes: ['name', 'email'] }
        ]
      });

      if (!labOrder) {
        console.log('⚠️  Lab order not found for result notification');
        return { success: false, error: 'Lab order not found' };
      }

      const notification = await Notification.create({
        userId: labOrder.doctorWalletAddress,
        title: `📊 Lab Results Ready: ${labOrder.orderNumber}`,
        message: `Lab results are ready for review for patient ${labOrder.patient?.name || 'Unknown Patient'}.\n\nOrder: ${labOrder.orderNumber}\nResult Date: ${new Date(labResult.resultDate).toLocaleDateString()}\n\nPlease review and approve the results.`,
        type: 'lab_results_to_review',
        priority: labResult.hasCriticalValues ? 'urgent' : 'medium',
        relatedId: labResult.id.toString(),
        relatedType: 'lab_result',
        data: {
          orderNumber: labOrder.orderNumber,
          patientName: labOrder.patient?.name || 'Unknown Patient',
          resultId: labResult.id,
          hasCriticalValues: labResult.hasCriticalValues,
          verificationStatus: labResult.verificationStatus
        }
      });

      console.log(`✅ Notified doctor about ready lab results: ${labOrder.orderNumber}`);
      return { success: true, notificationId: notification.id };

    } catch (error) {
      console.error('❌ Error notifying doctor about lab results:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify patient when lab results are available
   */
  static async notifyPatientResultsAvailable(labResult) {
    try {
      const labOrder = await LabWorkflowOrder.findByPk(labResult.labOrderId, {
        include: [
          { model: User, as: 'patient', attributes: ['name', 'email'] },
          { model: User, as: 'doctor', attributes: ['name', 'email'] }
        ]
      });

      if (!labOrder) {
        return { success: false, error: 'Lab order not found' };
      }

      const notification = await Notification.create({
        userId: labOrder.patientWalletAddress,
        title: `📋 Your Lab Results Are Ready`,
        message: `Your lab test results from Dr. ${labOrder.doctor?.name || 'your doctor'} are now available.\n\nOrder: ${labOrder.orderNumber}\nResult Date: ${new Date(labResult.resultDate).toLocaleDateString()}\n\nYou can view your results in the Lab History section.`,
        type: 'lab_results_ready',
        priority: 'medium',
        relatedId: labResult.id.toString(),
        relatedType: 'lab_result',
        data: {
          orderNumber: labOrder.orderNumber,
          doctorName: labOrder.doctor?.name || 'Unknown Doctor',
          resultId: labResult.id
        }
      });

      console.log(`✅ Notified patient about available lab results: ${labOrder.orderNumber}`);
      return { success: true, notificationId: notification.id };

    } catch (error) {
      console.error('❌ Error notifying patient about lab results:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send real-time notifications via WebSocket
   */
  static async sendRealTimeNotifications(users, labOrder, eventType) {
    try {
      // This would integrate with your WebSocket system
      // For now, we'll just log the intent
      console.log(`🔄 Real-time notification sent to ${users.length} users for ${eventType}`);
      
      // In a real implementation, you would:
      // 1. Get the WebSocket server instance
      // 2. Find connected users by wallet address
      // 3. Send real-time notification to their sockets
      
      /*
      const io = getSocketIOInstance(); // Your socket.io instance
      users.forEach(user => {
        const socketId = getSocketByWalletAddress(user.walletAddress);
        if (socketId) {
          io.to(socketId).emit('lab_notification', {
            type: eventType,
            orderNumber: labOrder.orderNumber,
            priority: labOrder.priority,
            timestamp: new Date().toISOString()
          });
        }
      });
      */

      return { success: true };
    } catch (error) {
      console.error('❌ Error sending real-time notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userWalletAddress, type = null) {
    try {
      const where = {
        userId: userWalletAddress.toLowerCase(),
        isRead: false
      };

      if (type) {
        where.type = type;
      }

      const notifications = await Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      return {
        success: true,
        notifications,
        count: notifications.length
      };

    } catch (error) {
      console.error('❌ Error getting unread notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notifications as read
   */
  static async markNotificationsAsRead(notificationIds, userWalletAddress) {
    try {
      const updated = await Notification.update(
        { isRead: true },
        {
          where: {
            id: { [db.Sequelize.Op.in]: notificationIds },
            userId: userWalletAddress.toLowerCase()
          }
        }
      );

      return {
        success: true,
        updatedCount: updated[0]
      };

    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LabNotificationService;