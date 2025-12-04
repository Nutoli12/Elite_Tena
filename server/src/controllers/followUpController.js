import db from '../models/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const notificationService = require('../../services/notification.cjs');

const { FollowUp, Appointment, User } = db;

/**
 * Create follow-up reminder
 */
export const createFollowUp = async (req, res) => {
  try {
    const {
      appointmentId,
      patientWallet,
      doctorWallet,
      scheduledDate,
      reason,
      notes
    } = req.body;

    console.log('📅 Creating follow-up reminder...');

    // Validate required fields
    if (!appointmentId || !patientWallet || !doctorWallet || !scheduledDate || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create follow-up
    const followUp = await FollowUp.create({
      appointmentId,
      patientWallet: patientWallet.toLowerCase(),
      doctorWallet: doctorWallet.toLowerCase(),
      scheduledDate,
      reason,
      notes,
      status: 'pending'
    });

    console.log('✅ Follow-up created:', followUp.id);

    res.status(201).json({
      success: true,
      message: 'Follow-up reminder created successfully',
      data: followUp
    });
  } catch (error) {
    console.error('❌ Create follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create follow-up',
      message: error.message
    });
  }
};

/**
 * Get all follow-ups for a patient
 */
export const getPatientFollowUps = async (req, res) => {
  try {
    const { patientWallet } = req.params;

    console.log('🔍 Fetching follow-ups for patient:', patientWallet);

    const followUps = await FollowUp.findAll({
      where: { patientWallet: patientWallet.toLowerCase() },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'reason']
        }
      ],
      order: [['scheduledDate', 'ASC']]
    });

    console.log(`✅ Found ${followUps.length} follow-ups`);

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });
  } catch (error) {
    console.error('❌ Get follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-ups',
      message: error.message
    });
  }
};

/**
 * Get all follow-ups for a doctor
 */
export const getDoctorFollowUps = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('🔍 Fetching follow-ups for doctor:', doctorWallet);

    const followUps = await FollowUp.findAll({
      where: { doctorWallet: doctorWallet.toLowerCase() },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'reason']
        }
      ],
      order: [['scheduledDate', 'ASC']]
    });

    console.log(`✅ Found ${followUps.length} follow-ups`);

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });
  } catch (error) {
    console.error('❌ Get follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-ups',
      message: error.message
    });
  }
};

/**
 * Send follow-up reminder manually
 */
export const sendFollowUpReminder = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📧 Sending follow-up reminder:', id);

    const followUp = await FollowUp.findByPk(id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
    }

    // Get patient and doctor details
    const [patient, doctor] = await Promise.all([
      User.findOne({ where: { walletAddress: followUp.patientWallet } }),
      User.findOne({ where: { walletAddress: followUp.doctorWallet } })
    ]);

    if (!patient || !doctor) {
      return res.status(404).json({
        success: false,
        error: 'Patient or doctor not found'
      });
    }

    // Send notifications
    const result = await notificationService.sendFollowUpReminder(
      followUp,
      {
        name: patient.profileData?.fullName || 'Patient',
        email: patient.email,
        phoneNumber: patient.profileData?.phoneNumber,
        deviceToken: patient.profileData?.deviceToken
      },
      {
        name: doctor.profileData?.fullName || 'Doctor'
      }
    );

    // Update follow-up
    await followUp.update({
      status: 'reminded',
      remindersSent: followUp.remindersSent + 1,
      lastReminderDate: new Date()
    });

    console.log('✅ Follow-up reminder sent');

    res.json({
      success: true,
      message: 'Follow-up reminder sent successfully',
      data: {
        followUp,
        notifications: result
      }
    });
  } catch (error) {
    console.error('❌ Send reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reminder',
      message: error.message
    });
  }
};

/**
 * Update follow-up status
 */
export const updateFollowUpStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log('🔄 Updating follow-up status:', id, 'to', status);

    const followUp = await FollowUp.findByPk(id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
    }

    await followUp.update({ status, notes });

    console.log('✅ Follow-up status updated');

    res.json({
      success: true,
      message: 'Follow-up status updated successfully',
      data: followUp
    });
  } catch (error) {
    console.error('❌ Update follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update follow-up',
      message: error.message
    });
  }
};

/**
 * Delete follow-up
 */
export const deleteFollowUp = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting follow-up:', id);

    const followUp = await FollowUp.findByPk(id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
    }

    await followUp.destroy();

    console.log('✅ Follow-up deleted');

    res.json({
      success: true,
      message: 'Follow-up deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete follow-up',
      message: error.message
    });
  }
};

/**
 * Get pending follow-ups (for automated reminders)
 */
export const getPendingFollowUps = async (req, res) => {
  try {
    const { Op } = db.Sequelize;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log('🔍 Fetching pending follow-ups...');

    const followUps = await FollowUp.findAll({
      where: {
        status: ['pending', 'reminded'],
        scheduledDate: {
          [Op.between]: [now, sevenDaysFromNow]
        }
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'reason']
        }
      ],
      order: [['scheduledDate', 'ASC']]
    });

    console.log(`✅ Found ${followUps.length} pending follow-ups`);

    res.json({
      success: true,
      data: followUps,
      count: followUps.length
    });
  } catch (error) {
    console.error('❌ Get pending follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending follow-ups',
      message: error.message
    });
  }
};
