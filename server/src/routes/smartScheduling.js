/**
 * Smart Appointment Scheduling Routes
 * API endpoints for smart scheduling functionality
 * Requirements: All requirements
 */

import express from 'express';
import SlotManager from '../services/SlotManager.js';
import ConcurrencyManager from '../services/ConcurrencyManager.js';
import AvailabilityManager from '../services/AvailabilityManager.js';
import QueueService from '../services/QueueService.js';
import EmergencyManager from '../services/EmergencyManager.js';
import DynamicDurationManager from '../services/DynamicDurationManager.js';
import { authenticateToken } from '../middleware/auth.js';
import db from '../models/index.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/smart-scheduling/appointments/book
 * Book an appointment slot
 */
router.post('/appointments/book', async (req, res) => {
  try {
    const { slotId, appointmentData } = req.body;
    
    if (!slotId || !appointmentData) {
      return res.status(400).json({
        success: false,
        error: 'Slot ID and appointment data are required'
      });
    }
    
    // Add patient wallet address from authenticated user
    appointmentData.patientWalletAddress = req.user.walletAddress;
    
    const result = await ConcurrencyManager.executeAtomicBooking({
      slotId,
      appointmentData
    });
    
    res.json({
      success: true,
      appointment: result.appointment,
      slot: result.slot,
      message: 'Appointment booked successfully'
    });
    
  } catch (error) {
    console.error('Booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/appointments/available-slots
 * Get available slots for a doctor
 */
router.get('/appointments/available-slots', async (req, res) => {
  try {
    const { doctorWalletAddress, date } = req.query;
    
    if (!doctorWalletAddress || !date) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address and date are required'
      });
    }
    
    const slots = await SlotManager.getAvailableSlots(
      doctorWalletAddress,
      new Date(date)
    );
    
    res.json({
      success: true,
      slots: slots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration,
        slotType: slot.slotType
      })),
      count: slots.length
    });
    
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/smart-scheduling/appointments/:id/reschedule
 * Reschedule an appointment
 */
router.put('/appointments/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { newSlotId } = req.body;
    
    if (!newSlotId) {
      return res.status(400).json({
        success: false,
        error: 'New slot ID is required'
      });
    }
    
    // Get current appointment
    const appointment = await db.Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    // Verify user owns the appointment
    if (appointment.patientWalletAddress !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to reschedule this appointment'
      });
    }
    
    // Release old slot
    const oldSlots = await db.TimeSlot.findAll({
      where: { appointmentId: id }
    });
    
    for (const slot of oldSlots) {
      await SlotManager.releaseSlot(slot.id);
    }
    
    // Book new slot
    const result = await ConcurrencyManager.executeAtomicBooking({
      slotId: newSlotId,
      appointmentData: {
        patientWalletAddress: appointment.patientWalletAddress,
        reason: appointment.reason,
        appointmentType: appointment.appointmentType,
        fee: appointment.fee
      }
    });
    
    // Update appointment with new times
    await appointment.update({
      scheduledStartTime: result.slot.startTime,
      scheduledEndTime: result.slot.endTime
    });
    
    res.json({
      success: true,
      appointment: await appointment.reload(),
      newSlot: result.slot,
      message: 'Appointment rescheduled successfully'
    });
    
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/smart-scheduling/doctors/:walletAddress/availability
 * Update doctor availability in real-time
 */
router.put('/doctors/:walletAddress/availability', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const updates = req.body;
    
    // Verify user is the doctor or has admin privileges
    if (req.user.walletAddress !== walletAddress && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this doctor\'s availability'
      });
    }
    
    const result = await AvailabilityManager.updateAvailability(walletAddress, updates);
    
    res.json({
      success: true,
      result,
      message: 'Availability updated successfully'
    });
    
  } catch (error) {
    console.error('Availability update error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/doctors/:walletAddress/schedule
 * Get doctor's schedule for a date
 */
router.get('/doctors/:walletAddress/schedule', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    const availability = await AvailabilityManager.getAvailability(
      walletAddress,
      new Date(date)
    );
    
    res.json({
      success: true,
      availability
    });
    
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/doctors/:walletAddress/templates
 * Create or update availability template
 */
router.post('/doctors/:walletAddress/templates', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const templateData = req.body;
    
    // Verify user is the doctor or has admin privileges
    if (req.user.walletAddress !== walletAddress && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create templates for this doctor'
      });
    }
    
    const template = await db.DoctorAvailabilityTemplate.create({
      ...templateData,
      doctorWalletAddress: walletAddress
    });
    
    res.json({
      success: true,
      template,
      message: 'Availability template created successfully'
    });
    
  } catch (error) {
    console.error('Template creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/appointments/emergency
 * Book emergency appointment
 */
router.post('/appointments/emergency', async (req, res) => {
  try {
    const { doctorWalletAddress, urgencyLevel, reason } = req.body;
    
    if (!doctorWalletAddress || !urgencyLevel || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address, urgency level, and reason are required'
      });
    }
    
    // Find available emergency slots
    const today = new Date();
    const slots = await SlotManager.getAvailableSlots(doctorWalletAddress, today);
    const emergencySlots = slots.filter(slot => slot.slotType === 'emergency' || slot.status === 'emergency_reserved');
    
    if (emergencySlots.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No emergency slots available',
        suggestReschedule: true
      });
    }
    
    // Book the first available emergency slot
    const result = await ConcurrencyManager.executeAtomicBooking({
      slotId: emergencySlots[0].id,
      appointmentData: {
        patientWalletAddress: req.user.walletAddress,
        appointmentType: 'emergency',
        urgencyLevel,
        reason,
        fee: 0 // Emergency appointments might be free or have different pricing
      }
    });
    
    res.json({
      success: true,
      appointment: result.appointment,
      slot: result.slot,
      message: 'Emergency appointment booked successfully'
    });
    
  } catch (error) {
    console.error('Emergency booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/appointments/emergency-slots
 * Get available emergency slots
 */
router.get('/appointments/emergency-slots', async (req, res) => {
  try {
    const { doctorWalletAddress, date } = req.query;
    
    if (!doctorWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address is required'
      });
    }
    
    const searchDate = date ? new Date(date) : new Date();
    const slots = await SlotManager.getAvailableSlots(doctorWalletAddress, searchDate);
    const emergencySlots = slots.filter(slot => 
      slot.slotType === 'emergency' || slot.status === 'emergency_reserved'
    );
    
    res.json({
      success: true,
      emergencySlots: emergencySlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration
      })),
      count: emergencySlots.length
    });
    
  } catch (error) {
    console.error('Emergency slots error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/appointments/:id/queue-status
 * Get queue status for an appointment
 */
router.get('/appointments/:id/queue-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const queueStatus = await QueueService.getQueueStatus(id);
    
    if (!queueStatus) {
      return res.status(404).json({
        success: false,
        error: 'Queue entry not found'
      });
    }
    
    res.json({
      success: true,
      queueStatus
    });
    
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/smart-scheduling/appointments/:id/check-in
 * Check in patient for appointment
 */
router.put('/appointments/:id/check-in', async (req, res) => {
  try {
    const { id } = req.params;
    
    const queueEntry = await QueueService.checkInPatient(id);
    
    res.json({
      success: true,
      queueEntry,
      message: 'Patient checked in successfully'
    });
    
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/doctors/:walletAddress/queue
 * Get doctor's queue for the day
 */
router.get('/doctors/:walletAddress/queue', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { date } = req.query;
    
    const queueDate = date ? new Date(date) : new Date();
    const doctorQueue = await QueueService.getDoctorQueue(walletAddress, queueDate);
    
    res.json({
      success: true,
      queue: doctorQueue
    });
    
  } catch (error) {
    console.error('Doctor queue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/appointments/:id/start
 * Start an appointment
 */
router.post('/appointments/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await DynamicDurationManager.startAppointment(id);
    
    res.json({
      success: true,
      appointment,
      message: 'Appointment started successfully'
    });
    
  } catch (error) {
    console.error('Start appointment error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/appointments/:id/complete
 * Complete an appointment
 */
router.post('/appointments/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await DynamicDurationManager.completeAppointment(id);
    
    res.json({
      success: true,
      result,
      message: 'Appointment completed successfully'
    });
    
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/appointments/emergency/find-slot
 * Find emergency slot
 */
router.post('/appointments/emergency/find-slot', async (req, res) => {
  try {
    const { doctorWalletAddress, urgencyLevel, requiredDuration } = req.body;
    
    if (!doctorWalletAddress || !urgencyLevel) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address and urgency level are required'
      });
    }
    
    const emergencyRequest = {
      urgencyLevel,
      requiredDuration: requiredDuration || 30
    };
    
    const result = await EmergencyManager.findEmergencySlot(doctorWalletAddress, emergencyRequest);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Find emergency slot error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/smart-scheduling/appointments/emergency/book
 * Book emergency appointment
 */
router.post('/appointments/emergency/book', async (req, res) => {
  try {
    const { slotId, urgencyLevel, reason, emergencyDetails } = req.body;
    
    if (!slotId || !urgencyLevel || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Slot ID, urgency level, and reason are required'
      });
    }
    
    const emergencyData = {
      patientWalletAddress: req.user.walletAddress,
      urgencyLevel,
      reason,
      emergencyDetails,
      fee: 0
    };
    
    const result = await EmergencyManager.bookEmergencyAppointment(slotId, emergencyData);
    
    res.json({
      success: true,
      result,
      message: 'Emergency appointment booked successfully'
    });
    
  } catch (error) {
    console.error('Emergency booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/smart-scheduling/statistics
 * Get scheduling statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { doctorWalletAddress, startDate, endDate } = req.query;
    
    if (!doctorWalletAddress || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Doctor wallet address, start date, and end date are required'
      });
    }
    
    const [
      availabilityStats,
      queueStats,
      emergencyStats,
      durationStats
    ] = await Promise.all([
      AvailabilityManager.getAvailabilityStatistics(
        doctorWalletAddress,
        new Date(startDate),
        new Date(endDate)
      ),
      QueueService.getQueueStatistics(
        doctorWalletAddress,
        new Date(startDate),
        new Date(endDate)
      ),
      EmergencyManager.getEmergencyStatistics(
        doctorWalletAddress,
        new Date(startDate),
        new Date(endDate)
      ),
      DynamicDurationManager.getDurationStatistics(
        doctorWalletAddress,
        new Date(startDate),
        new Date(endDate)
      )
    ]);
    
    res.json({
      success: true,
      statistics: {
        availability: availabilityStats,
        queue: queueStats,
        emergency: emergencyStats,
        duration: durationStats
      }
    });
    
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;