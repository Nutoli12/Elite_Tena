/**
 * SlotManager Service
 * Handles time slot creation, booking, and availability management
 * Requirements: 1.3, 1.4, 1.5
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

class SlotManager {
  /**
   * Create time slots for a doctor based on availability template
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Object} schedule - Schedule configuration
   * @returns {Promise<Array>} Created time slots
   */
  async createSlots(doctorWalletAddress, schedule) {
    const { date, startTime, endTime, slotDuration = 30, bufferTime = 15, slotType = 'regular' } = schedule;
    
    const slots = [];
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    
    let currentTime = new Date(start);
    
    while (currentTime < end) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
      
      if (slotEnd <= end) {
        const slot = await db.TimeSlot.create({
          doctorWalletAddress,
          startTime: new Date(currentTime),
          endTime: slotEnd,
          duration: slotDuration,
          status: 'available',
          slotType,
          bufferTime,
          isBookable: true
        });
        slots.push(slot);
      }
      
      // Move to next slot (including buffer time)
      currentTime = new Date(currentTime.getTime() + (slotDuration + bufferTime) * 60000);
    }
    
    return slots;
  }

  /**
   * Book a time slot atomically
   * @param {string} slotId - Time slot ID
   * @param {Object} appointmentData - Appointment data
   * @returns {Promise<Object>} Booking result
   */
  async bookSlot(slotId, appointmentData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Lock the slot for update
      const slot = await db.TimeSlot.findByPk(slotId, {
        lock: true,
        transaction
      });
      
      if (!slot) {
        throw new Error('Time slot not found');
      }
      
      if (!slot.isAvailable()) {
        throw new Error('Time slot is not available for booking');
      }
      
      // Create appointment
      const appointment = await db.Appointment.create({
        patientWalletAddress: appointmentData.patientWalletAddress,
        doctorWalletAddress: slot.doctorWalletAddress,
        scheduledStartTime: slot.startTime,
        scheduledEndTime: slot.endTime,
        estimatedDuration: slot.duration,
        status: 'scheduled',
        appointmentType: appointmentData.appointmentType || 'regular',
        reason: appointmentData.reason,
        fee: appointmentData.fee || 0
      }, { transaction });
      
      // Update slot status
      await slot.update({
        status: 'booked',
        appointmentId: appointment.id
      }, { transaction });
      
      await transaction.commit();
      
      return {
        success: true,
        appointment,
        slot: await slot.reload()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Release a time slot
   * @param {string} slotId - Time slot ID
   * @returns {Promise<Object>} Updated slot
   */
  async releaseSlot(slotId) {
    const slot = await db.TimeSlot.findByPk(slotId);
    
    if (!slot) {
      throw new Error('Time slot not found');
    }
    
    return await slot.update({
      status: 'available',
      appointmentId: null
    });
  }

  /**
   * Block time slots for a period
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Array>} Blocked slots
   */
  async blockSlots(doctorWalletAddress, startTime, endTime) {
    const slots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startTime
        },
        endTime: {
          [Op.lte]: endTime
        },
        status: 'available'
      }
    });
    
    const blockedSlots = [];
    for (const slot of slots) {
      await slot.update({
        status: 'blocked',
        isBookable: false
      });
      blockedSlots.push(slot);
    }
    
    return blockedSlots;
  }

  /**
   * Get available slots for a doctor
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date to check
   * @returns {Promise<Array>} Available slots
   */
  async getAvailableSlots(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        },
        status: 'available',
        isBookable: true
      },
      order: [['startTime', 'ASC']]
    });
  }

  /**
   * Find overlapping slots
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Array>} Overlapping slots
   */
  async findOverlappingSlots(doctorWalletAddress, startTime, endTime) {
    return await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            endTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            [Op.and]: [
              {
                startTime: {
                  [Op.lte]: startTime
                }
              },
              {
                endTime: {
                  [Op.gte]: endTime
                }
              }
            ]
          }
        ],
        status: {
          [Op.ne]: 'cancelled'
        }
      }
    });
  }

  /**
   * Reserve slots for emergency use
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @param {number} percentage - Percentage of slots to reserve (0-1)
   * @returns {Promise<Array>} Reserved slots
   */
  async reserveEmergencySlots(doctorWalletAddress, date, percentage = 0.2) {
    const availableSlots = await this.getAvailableSlots(doctorWalletAddress, date);
    const slotsToReserve = Math.floor(availableSlots.length * percentage);
    
    const reservedSlots = [];
    for (let i = 0; i < slotsToReserve && i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      await slot.update({
        status: 'emergency_reserved',
        slotType: 'emergency'
      });
      reservedSlots.push(slot);
    }
    
    return reservedSlots;
  }

  /**
   * Get slot statistics for a doctor
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date
   * @returns {Promise<Object>} Slot statistics
   */
  async getSlotStatistics(doctorWalletAddress, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const slots = await db.TimeSlot.findAll({
      where: {
        doctorWalletAddress,
        startTime: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      }
    });
    
    const stats = {
      total: slots.length,
      available: slots.filter(s => s.status === 'available').length,
      booked: slots.filter(s => s.status === 'booked').length,
      blocked: slots.filter(s => s.status === 'blocked').length,
      emergencyReserved: slots.filter(s => s.status === 'emergency_reserved').length,
      utilizationRate: 0
    };
    
    if (stats.total > 0) {
      stats.utilizationRate = (stats.booked / stats.total) * 100;
    }
    
    return stats;
  }
}

export default new SlotManager();