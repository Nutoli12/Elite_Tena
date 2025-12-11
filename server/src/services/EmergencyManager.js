/**
 * EmergencyManager - Emergency Appointment Management
 * Handles urgent appointments, slot reservation, and rescheduling
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import SlotManager from './SlotManager.js';
import QueueService from './QueueService.js';

class EmergencyManager {
  /**
   * Emergency priority levels
   */
  static PRIORITY_LEVELS = {
    CRITICAL: { level: 1, name: 'critical', maxWaitMinutes: 15 },
    HIGH: { level: 2, name: 'high', maxWaitMinutes: 60 },
    MEDIUM: { level: 3, name: 'medium', maxWaitMinutes: 180 },
    LOW: { level: 4, name: 'low', maxWaitMinutes: 360 }
  };

  /**
   * Find emergency slot for urgent appointment
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Object} emergencyRequest - Emergency request details
   * @returns {Promise<Object>} Emergency slot result
   */
  async findEmergencySlot(doctorWalletAddress, emergencyRequest) {
    const { urgencyLevel, requiredDuration = 30, preferredTime } = emergencyRequest;
    const priority = this.PRIORITY_LEVELS[urgencyLevel.toUpperCase()] || this.PRIORITY_LEVELS.MEDIUM;
    
    const now = new Date();
    const maxWaitTime = new Date(now.getTime() + priority.maxWaitMinutes * 60000);
    
    // Strategy 1: Find emergency reserved slots
    let emergencySlot = await this.findEmergencyReservedSlot(doctorWalletAddress, now, maxWaitTime, requiredDuration);
    
    if (emergencySlot) {
      return {
        strategy: 'emergency_reserved',
        slot: emergencySlot,
        waitTime: 0,
        priority
      };
    }
    
    // Strategy 2: Find available regular slots within acceptable time
    let availableSlot = await this.findAvailableSlotInTimeframe(doctorWalletAddress, now, maxWaitTime, requiredDuration);
    
    if (availableSlot) {
      return {
        strategy: 'available_slot',
        slot: availableSlot,
        waitTime: Math.round((availableSlot.startTime - now) / (1000 * 60)),
        priority
      };
    }
    
    // Strategy 3: Create emergency slot by rescheduling non-urgent appointments
    if (priority.level <= 2) { // Only for critical and high priority
      const reschedulingResult = await this.createEmergencySlotByRescheduling(
        doctorWalletAddress, 
        now, 
        maxWaitTime, 
        requiredDuration,
        priority
      );
      
      if (reschedulingResult.success) {
        return {
          strategy: 'rescheduled_slot',
          slot: reschedulingResult.slot,
          waitTime: Math.round((reschedulingResult.slot.startTime - now) / (1000 * 60)),
          rescheduledAppointments: reschedulingResult.rescheduledAppointments,
          priority
        };
      }
    }
    
    // Strategy 4: Find next available slot (even if beyond max wait time)
    const nextSlot = await this.findNextAvailableSlot(doctorWalletAddress, now, requiredDuration);
    
    if (nextSlot) {
      return {
        strategy: 'next_available',
        slot: nextSlot,
        waitTime: Math.round((nextSlot.startTime - now) / (1000 * 60)),
        priority,
        exceedsMaxWait: true
      };
    }
    
    return {
      strategy: 'no_slot_available',
      slot: null,
      waitTime: null,
      priority,
      suggestions: await this.getAlternativeSuggestions(doctorWalletAddress, emergencyRequest)
    };
  }

  /**
   * Find emergency reserved slot
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {number} requiredDuration - Required duration
   * @returns {Promise<Object>} Emergency slot
   */
  async findEmergencyReservedSlot(doctorWalletAddress, startTime, endTime, requiredDuration) {
    return await db.TimeSlot.findOne({
      where: {
        doctorWalletAddress,
        startTime: { [Op.between]: [startTime, endTime] },
        status: 'emergency_reserved',
        duration: { [Op.gte]: requiredDuration },
        isBookable: true
      },
      order: [['startTime', 'ASC']]
    });
  }

  /**
   * Find available slot in timeframe
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {number} requiredDuration - Required duration
   * @returns {Promise<Object>} Available slot
   */
  async findAvailableSlotInTimeframe(doctorWalletAddress, startTime, endTime, requiredDuration) {
    return await db.TimeSlot.findOne({
      where: {
        doctorWalletAddress,
        startTime: { [Op.between]: [startTime, endTime] },
        status: 'available',
        duration: { [Op.gte]: requiredDuration },
        isBookable: true
      },
      order: [['startTime', 'ASC']]
    });
  }

  /**
   * Create emergency slot by rescheduling non-urgent appointments
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {number} requiredDuration - Required duration
   * @param {Object} priority - Priority level
   * @returns {Promise<Object>} Rescheduling result
   */
  async createEmergencySlotByRescheduling(doctorWalletAddress, startTime, endTime, requiredDuration, priority) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Find non-urgent booked appointments that can be rescheduled
      const reschedulableAppointments = await db.Appointment.findAll({
        where: {
          doctorWalletAddress,
          scheduledStartTime: { [Op.between]: [startTime, endTime] },
          status: 'scheduled',
          appointmentType: { [Op.ne]: 'emergency' },
          urgencyLevel: { [Op.or]: [null, 'low', 'medium'] }
        },
        include: [{
          model: db.TimeSlot,
          as: 'timeSlot',
          where: {
            duration: { [Op.gte]: requiredDuration }
          }
        }],
        order: [['scheduledStartTime', 'ASC']],
        transaction
      });
      
      if (reschedulableAppointments.length === 0) {
        await transaction.rollback();
        return { success: false, reason: 'No reschedulable appointments found' };
      }
      
      const appointmentToReschedule = reschedulableAppointments[0];
      const slotToUse = appointmentToReschedule.timeSlot;
      
      // Find alternative slot for the rescheduled appointment
      const alternativeSlot = await this.findAlternativeSlot(
        doctorWalletAddress,
        appointmentToReschedule,
        transaction
      );
      
      if (!alternativeSlot) {
        await transaction.rollback();
        return { success: false, reason: 'No alternative slot found for rescheduling' };
      }
      
      // Reschedule the appointment
      await appointmentToReschedule.update({
        scheduledStartTime: alternativeSlot.startTime,
        scheduledEndTime: alternativeSlot.endTime,
        rescheduledReason: `Rescheduled for ${priority.name} priority emergency appointment`,
        rescheduledAt: new Date()
      }, { transaction });
      
      // Update the alternative slot
      await alternativeSlot.update({
        status: 'booked',
        appointmentId: appointmentToReschedule.id
      }, { transaction });
      
      // Release the original slot for emergency use
      await slotToUse.update({
        status: 'available',
        appointmentId: null,
        slotType: 'emergency'
      }, { transaction });
      
      await transaction.commit();
      
      return {
        success: true,
        slot: slotToUse,
        rescheduledAppointments: [appointmentToReschedule],
        alternativeSlot
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Find alternative slot for rescheduled appointment
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Object} appointment - Appointment to reschedule
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Alternative slot
   */
  async findAlternativeSlot(doctorWalletAddress, appointment, transaction) {
    const appointmentDuration = appointment.estimatedDuration || 30;
    const currentTime = new Date();
    const nextWeek = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return await db.TimeSlot.findOne({
      where: {
        doctorWalletAddress,
        startTime: { [Op.gt]: currentTime },
        endTime: { [Op.lte]: nextWeek },
        status: 'available',
        duration: { [Op.gte]: appointmentDuration },
        isBookable: true
      },
      order: [['startTime', 'ASC']],
      transaction
    });
  }

  /**
   * Find next available slot
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} afterTime - After this time
   * @param {number} requiredDuration - Required duration
   * @returns {Promise<Object>} Next available slot
   */
  async findNextAvailableSlot(doctorWalletAddress, afterTime, requiredDuration) {
    return await db.TimeSlot.findOne({
      where: {
        doctorWalletAddress,
        startTime: { [Op.gt]: afterTime },
        status: 'available',
        duration: { [Op.gte]: requiredDuration },
        isBookable: true
      },
      order: [['startTime', 'ASC']]
    });
  }

  /**
   * Book emergency appointment
   * @param {string} slotId - Slot ID
   * @param {Object} emergencyData - Emergency appointment data
   * @returns {Promise<Object>} Booking result
   */
  async bookEmergencyAppointment(slotId, emergencyData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const slot = await db.TimeSlot.findByPk(slotId, {
        lock: true,
        transaction
      });
      
      if (!slot) {
        throw new Error('Emergency slot not found');
      }
      
      if (!slot.isAvailable() && slot.status !== 'emergency_reserved') {
        throw new Error('Slot is not available for emergency booking');
      }
      
      // Create emergency appointment
      const appointment = await db.Appointment.create({
        patientWalletAddress: emergencyData.patientWalletAddress,
        doctorWalletAddress: slot.doctorWalletAddress,
        scheduledStartTime: slot.startTime,
        scheduledEndTime: slot.endTime,
        estimatedDuration: slot.duration,
        status: 'scheduled',
        appointmentType: 'emergency',
        urgencyLevel: emergencyData.urgencyLevel,
        reason: emergencyData.reason,
        emergencyDetails: emergencyData.emergencyDetails,
        fee: emergencyData.fee || 0,
        priority: this.PRIORITY_LEVELS[emergencyData.urgencyLevel.toUpperCase()]?.level || 3
      }, { transaction });
      
      // Update slot
      await slot.update({
        status: 'booked',
        appointmentId: appointment.id,
        slotType: 'emergency'
      }, { transaction });
      
      // Add to queue with high priority
      await QueueService.addToQueue(
        slot.doctorWalletAddress,
        emergencyData.patientWalletAddress,
        appointment.id,
        {
          priority: 'emergency',
          appointmentDate: slot.startTime
        }
      );
      
      await transaction.commit();
      
      return {
        success: true,
        appointment: await appointment.reload({ include: ['patient', 'doctor'] }),
        slot: await slot.reload()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get alternative suggestions when no emergency slot is available
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Object} emergencyRequest - Emergency request
   * @returns {Promise<Array>} Alternative suggestions
   */
  async getAlternativeSuggestions(doctorWalletAddress, emergencyRequest) {
    const suggestions = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Suggest other doctors with emergency availability
    const otherDoctors = await db.Doctor.findAll({
      where: {
        walletAddress: { [Op.ne]: doctorWalletAddress },
        isActive: true
      },
      include: [{
        model: db.TimeSlot,
        as: 'timeSlots',
        where: {
          startTime: { [Op.between]: [now, tomorrow] },
          [Op.or]: [
            { status: 'emergency_reserved' },
            { status: 'available' }
          ],
          isBookable: true
        },
        required: true
      }],
      limit: 3
    });
    
    for (const doctor of otherDoctors) {
      const availableSlot = doctor.timeSlots[0];
      suggestions.push({
        type: 'alternative_doctor',
        doctor: {
          walletAddress: doctor.walletAddress,
          name: doctor.name,
          specialization: doctor.specialization
        },
        slot: availableSlot,
        waitTime: Math.round((availableSlot.startTime - now) / (1000 * 60))
      });
    }
    
    // Suggest walk-in availability
    const walkInSlots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: { [Op.between]: [now, tomorrow] },
        slotType: 'walk_in',
        status: 'available',
        isBookable: true
      },
      order: [['startTime', 'ASC']],
      limit: 3
    });
    
    for (const slot of walkInSlots) {
      suggestions.push({
        type: 'walk_in',
        slot,
        waitTime: Math.round((slot.startTime - now) / (1000 * 60))
      });
    }
    
    return suggestions;
  }

  /**
   * Reserve emergency slots for a doctor's schedule
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @param {Object} options - Reservation options
   * @returns {Promise<Array>} Reserved slots
   */
  async reserveEmergencySlots(doctorWalletAddress, date, options = {}) {
    const { percentage = 0.2, minSlots = 2, maxSlots = 6 } = options;
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all available slots for the day
    const availableSlots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: { [Op.between]: [startOfDay, endOfDay] },
        status: 'available',
        isBookable: true
      },
      order: [['startTime', 'ASC']]
    });
    
    if (availableSlots.length === 0) {
      return [];
    }
    
    // Calculate number of slots to reserve
    let slotsToReserve = Math.floor(availableSlots.length * percentage);
    slotsToReserve = Math.max(minSlots, Math.min(maxSlots, slotsToReserve));
    
    // Distribute emergency slots throughout the day
    const reservedSlots = [];
    const interval = Math.floor(availableSlots.length / slotsToReserve);
    
    for (let i = 0; i < slotsToReserve && i * interval < availableSlots.length; i++) {
      const slotIndex = i * interval;
      const slot = availableSlots[slotIndex];
      
      await slot.update({
        status: 'emergency_reserved',
        slotType: 'emergency'
      });
      
      reservedSlots.push(slot);
    }
    
    return reservedSlots;
  }

  /**
   * Release expired emergency reservations
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {number} hoursBeforeExpiry - Hours before slot time to release
   * @returns {Promise<Array>} Released slots
   */
  async releaseExpiredEmergencyReservations(doctorWalletAddress, hoursBeforeExpiry = 2) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() + hoursBeforeExpiry);
    
    const expiredSlots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        status: 'emergency_reserved',
        startTime: { [Op.lte]: cutoffTime },
        appointmentId: null
      }
    });
    
    const releasedSlots = [];
    for (const slot of expiredSlots) {
      await slot.update({
        status: 'available',
        slotType: 'regular'
      });
      releasedSlots.push(slot);
    }
    
    return releasedSlots;
  }

  /**
   * Get emergency statistics
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Emergency statistics
   */
  async getEmergencyStatistics(doctorWalletAddress, startDate, endDate) {
    const emergencyAppointments = await db.Appointment.findAll({
      where: {
        doctorWalletAddress,
        appointmentType: 'emergency',
        scheduledStartTime: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const stats = {
      totalEmergencies: emergencyAppointments.length,
      byUrgency: {},
      averageResponseTime: 0,
      successfulBookings: 0,
      rescheduledAppointments: 0
    };
    
    // Group by urgency level
    for (const appointment of emergencyAppointments) {
      const urgency = appointment.urgencyLevel || 'medium';
      stats.byUrgency[urgency] = (stats.byUrgency[urgency] || 0) + 1;
      
      if (appointment.status !== 'cancelled') {
        stats.successfulBookings++;
      }
      
      if (appointment.rescheduledAt) {
        stats.rescheduledAppointments++;
      }
    }
    
    // Calculate success rate
    stats.successRate = stats.totalEmergencies > 0 
      ? Math.round((stats.successfulBookings / stats.totalEmergencies) * 100) 
      : 0;
    
    return stats;
  }
}

export default new EmergencyManager();