/**
 * Notification Service
 * Handles SMS, Email, and Push notifications
 */

const axios = require('axios');

class NotificationService {
  constructor() {
    // SMS Configuration (Africa's Talking or similar)
    this.smsConfig = {
      apiKey: process.env.SMS_API_KEY || '',
      username: process.env.SMS_USERNAME || 'sandbox',
      from: process.env.SMS_FROM || 'EliteTena'
    };

    // Email Configuration (SendGrid or similar)
    this.emailConfig = {
      apiKey: process.env.EMAIL_API_KEY || '',
      from: process.env.EMAIL_FROM || 'noreply@elitetena.com'
    };

    // Push Notification Configuration (Firebase)
    this.pushConfig = {
      serverKey: process.env.FIREBASE_SERVER_KEY || ''
    };
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phoneNumber, message) {
    try {
      console.log(`📱 Sending SMS to ${phoneNumber}: ${message}`);
      
      // For development, just log
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ SMS sent (development mode)');
        return { success: true, mode: 'development' };
      }

      // Production SMS sending (Africa's Talking example)
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        {
          username: this.smsConfig.username,
          to: phoneNumber,
          message: message,
          from: this.smsConfig.from
        },
        {
          headers: {
            'apiKey': this.smsConfig.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ SMS sending error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Email notification
   */
  async sendEmail(to, subject, html) {
    try {
      console.log(`📧 Sending email to ${to}: ${subject}`);
      
      // For development, just log
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Email sent (development mode)');
        return { success: true, mode: 'development' };
      }

      // Production email sending (SendGrid example)
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{
            to: [{ email: to }],
            subject: subject
          }],
          from: { email: this.emailConfig.from },
          content: [{
            type: 'text/html',
            value: html
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.emailConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Email sending error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Push notification
   */
  async sendPushNotification(deviceToken, title, body, data = {}) {
    try {
      console.log(`🔔 Sending push notification: ${title}`);
      
      // For development, just log
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Push notification sent (development mode)');
        return { success: true, mode: 'development' };
      }

      // Production push notification (Firebase example)
      const response = await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: deviceToken,
          notification: {
            title: title,
            body: body,
            sound: 'default'
          },
          data: data
        },
        {
          headers: {
            'Authorization': `key=${this.pushConfig.serverKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Push notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(appointment, patient, doctor, daysUntil) {
    const appointmentDate = new Date(appointment.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-ET', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `Reminder: You have an appointment with Dr. ${doctor.name || 'your doctor'} on ${formattedDate}. Location: Elite-Tena Healthcare. Reply CONFIRM to confirm.`;

    const emailHtml = `
      <h2>Appointment Reminder</h2>
      <p>Dear ${patient.name || 'Patient'},</p>
      <p>This is a reminder that you have an upcoming appointment:</p>
      <ul>
        <li><strong>Doctor:</strong> Dr. ${doctor.name || 'your doctor'}</li>
        <li><strong>Date & Time:</strong> ${formattedDate}</li>
        <li><strong>Location:</strong> Elite-Tena Healthcare</li>
        <li><strong>Reason:</strong> ${appointment.reason || 'Consultation'}</li>
      </ul>
      <p>Please arrive 15 minutes early for check-in.</p>
      <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
      <br>
      <p>Best regards,<br>Elite-Tena Healthcare Team</p>
    `;

    // Send via all channels
    const results = await Promise.allSettled([
      this.sendSMS(patient.phoneNumber, message),
      this.sendEmail(patient.email, 'Appointment Reminder', emailHtml),
      patient.deviceToken ? this.sendPushNotification(
        patient.deviceToken,
        'Appointment Reminder',
        `Appointment with Dr. ${doctor.name} on ${formattedDate}`,
        { appointmentId: appointment.id, type: 'appointment_reminder' }
      ) : Promise.resolve({ success: false, error: 'No device token' })
    ]);

    return {
      sms: results[0].value,
      email: results[1].value,
      push: results[2].value
    };
  }

  /**
   * Send follow-up reminder
   */
  async sendFollowUpReminder(followUp, patient, doctor) {
    const followUpDate = new Date(followUp.scheduledDate);
    const formattedDate = followUpDate.toLocaleDateString('en-ET', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `Follow-up reminder: Dr. ${doctor.name} recommends a follow-up appointment on ${formattedDate}. Book now: elitetena.com/appointments`;

    const emailHtml = `
      <h2>Follow-up Appointment Reminder</h2>
      <p>Dear ${patient.name || 'Patient'},</p>
      <p>Dr. ${doctor.name} has recommended a follow-up appointment for your ${followUp.reason}.</p>
      <ul>
        <li><strong>Recommended Date:</strong> ${formattedDate}</li>
        <li><strong>Doctor:</strong> Dr. ${doctor.name}</li>
        <li><strong>Reason:</strong> ${followUp.reason}</li>
      </ul>
      <p>Please book your appointment at your earliest convenience.</p>
      <a href="https://elitetena.com/appointments" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Book Appointment</a>
      <br><br>
      <p>Best regards,<br>Elite-Tena Healthcare Team</p>
    `;

    const results = await Promise.allSettled([
      this.sendSMS(patient.phoneNumber, message),
      this.sendEmail(patient.email, 'Follow-up Appointment Reminder', emailHtml),
      patient.deviceToken ? this.sendPushNotification(
        patient.deviceToken,
        'Follow-up Reminder',
        `Time for your follow-up with Dr. ${doctor.name}`,
        { followUpId: followUp.id, type: 'followup_reminder' }
      ) : Promise.resolve({ success: false, error: 'No device token' })
    ]);

    return {
      sms: results[0].value,
      email: results[1].value,
      push: results[2].value
    };
  }

  /**
   * Send medication reminder
   */
  async sendMedicationReminder(prescription, patient) {
    const message = `Medication reminder: Time to take your ${prescription.medication}. Dosage: ${prescription.dosage}. ${prescription.instructions}`;

    const results = await Promise.allSettled([
      this.sendSMS(patient.phoneNumber, message),
      patient.deviceToken ? this.sendPushNotification(
        patient.deviceToken,
        'Medication Reminder',
        `Time to take ${prescription.medication}`,
        { prescriptionId: prescription.id, type: 'medication_reminder' }
      ) : Promise.resolve({ success: false, error: 'No device token' })
    ]);

    return {
      sms: results[0].value,
      push: results[1].value
    };
  }
}

module.exports = new NotificationService();
