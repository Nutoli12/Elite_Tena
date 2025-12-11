/**
 * DynamicDurationManager - Dynamic Duration and Buffer Management
 * Handles appointment duration tracking, slot adjustment, and buffer time enforcement
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import SlotManager from './SlotManager.js';
import QueueService from './QueueService.js';

class DynamicDurationManager {
  /**
   * Track appointment start
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Updated appointment
   */
  async startAppointment(appointmentId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const appointment = await db.Appointment.findByPk(appointmentId, {
        include: ['timeSlot'],
        transaction
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      const now = new Date();
      
      // Update appointment with actual start time
      await appointment.update({
        actualStartTime: now,
        status: 'in_progress'
      }, { transaction });
      
      // Update queue status
      await QueueService.startAppointment(appointmentId);
      
      await transaction.commit();
      
      return appointment.reload();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Complete appointment and handle duration adjustments
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Completion result
   */
  async completeAppointment(appointmentId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const appointment = await db.Appointment.findByPk(appointmentId, {
        include: ['timeSlot'],
        transaction
      });
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      const now = new Date();
      const actualDuration = Math.round((now - appointment.actualStartTime) / (1000 * 60));
      const scheduledDuration = appointment.estimatedDuration;
      const durationDifference = actualDuration - scheduledDuration;
      
      // Update appointment with completion details
      await appointment.update({
        actualEndTime: now,
        actualDuration,
        status: 'completed',
        durationVariance: durationDifference
      }, { transaction });
      
      // Handle duration adjustments
      const adjustmentResult = await this.handleDurationAdjustment(
        appointment,
        durationDifference,
        transaction
      );
      
      // Update queue
      await QueueService.updateQueuePosition(appointmentId);
      
      await transaction.commit();
      
      return {
        appointment: await appointment.reload(),
        durationDifference,
        adjustmentResult
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Handle duration adjustment and subsequent appointment impacts
   * @param {Object} appointment - Completed appointment
   * @param {number} durationDifference - Duration difference in minutes
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Adjustment result
   */
  async handleDurationAdjustment(appointment, durationDifference, transaction) {
    const result = {
      type: durationDifference > 0 ? 'overrun' : 'early_completion',
      durationDifference,
      affectedAppointments: [],
      slotsAdjusted: [],
      bufferViolations: []
    };
    
    if (durationDifference === 0) {
      result.type = 'on_time';
      return result;
    }
    
    if (durationDifference > 0) {
      // Appointment ran over - handle overrun
      return await this.handleAppointmentOverrun(appointment, durationDifference, transaction);
    } else {
      // Appointment finished early - handle early completion
      return await this.handleEarlyCompletion(appointment, Math.abs(durationDifference), transaction);
    }
  }

  /**
   * Handle appointment overrun
   * @param {Object} appointment - Overrun appointment
   * @param {number} overrunMinutes - Overrun in minutes
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Overrun handling result
   */
  async handleAppointmentOverrun(appointment, overrunMinutes, transaction) {
    const result = {
      type: 'overrun',
      durationDifference: overrunMinutes,
      affectedAppointments: [],
      slotsAdjusted: [],
      bufferViolations: [],
      delayPropagation: []
    };
    
    // Find subsequent appointments for the same doctor
    const subsequentAppointments = await db.Appointment.findAll({
      where: {
        doctorWalletAddress: appointment.doctorWalletAddress,
        scheduledStartTime: {
          [Op.gt]: appointment.scheduledStartTime
        },
        status: { [Op.in]: ['scheduled', 'in_progress'] }
      },
      include: ['timeSlot'],
      order: [['scheduledStartTime', 'ASC']],
      transaction
    });
    
    let cumulativeDelay = overrunMinutes;
    
    for (const nextAppointment of subsequentAppointments) {
      // Check if this appointment is affected by the delay
      const timeBetween = Math.round(
        (nextAppointment.scheduledStartTime - appointment.scheduledEndTime) / (1000 * 60)
      );
      
      if (timeBetween < cumulativeDelay) {
        // This appointment is affected
        const appointmentDelay = cumulativeDelay - timeBetween;
        
        // Update appointment times
        const newStartTime = new Date(nextAppointment.scheduledStartTime.getTime() + appointmentDelay * 60000);
        const newEndTime = new Date(nextAppointment.scheduledEndTime.getTime() + appointmentDelay * 60000);
        
        await nextAppointment.update({
          scheduledStartTime: newStartTime,
          scheduledEndTime: newEndTime,
          delayMinutes: appointmentDelay,
          delayReason: `Previous appointment overrun by ${overrunMinutes} minutes`
        }, { transaction });
        
        // Update the time slot
        if (nextAppointment.timeSlot) {
          await nextAppointment.timeSlot.update({
            startTime: newStartTime,
            endTime: newEndTime
          }, { transaction });
          
          result.slotsAdjusted.push(nextAppointment.timeSlot);
        }
        
        result.affectedAppointments.push({
          appointmentId: nextAppointment.id,
          originalStartTime: nextAppointment.scheduledStartTime,
          newStartTime,
          delayMinutes: appointmentDelay
        });
        
        // Handle queue delays
        await QueueService.handleAppointmentDelay(
          nextAppointment.id,
          appointmentDelay,
          'Previous appointment overrun'
        );
        
        // Check for buffer violations
        const bufferViolation = await this.checkBufferViolation(nextAppointment, transaction);
        if (bufferViolation) {
          result.bufferViolations.push(bufferViolation);
        }
        
        // Reduce cumulative delay by the buffer time that was consumed
        const bufferTime = nextAppointment.timeSlot?.bufferTime || 15;
        cumulativeDelay = Math.max(0, cumulativeDelay - bufferTime);
      } else {
        // Buffer time absorbed the delay
        break;
      }
    }
    
    return result;
  }

  /**
   * Handle early appointment completion
   * @param {Object} appointment - Early completed appointment
   * @param {number} earlyMinutes - Early completion in minutes
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Early completion handling result
   */
  async handleEarlyCompletion(appointment, earlyMinutes, transaction) {
    const result = {
      type: 'early_completion',
      durationDifference: -earlyMinutes,
      affectedAppointments: [],
      slotsReleased: [],
      opportunitiesCreated: []
    };
    
    // Find the next appointment
    const nextAppointment = await db.Appointment.findOne({
      where: {
        doctorWalletAddress: appointment.doctorWalletAddress,
        scheduledStartTime: {
          [Op.gt]: appointment.scheduledStartTime
        },
        status: { [Op.in]: ['scheduled', 'waiting'] }
      },
      include: ['timeSlot'],
      order: [['scheduledStartTime', 'ASC']],
      transaction
    });
    
    if (nextAppointment) {
      const timeBetween = Math.round(
        (nextAppointment.scheduledStartTime - appointment.scheduledEndTime) / (1000 * 60)
      );
      
      // If there's enough time, we can potentially move the next appointment earlier
      if (earlyMinutes > 5 && timeBetween >= earlyMinutes) {
        const canMoveEarlier = await this.canMoveAppointmentEarlier(
          nextAppointment,
          earlyMinutes,
          transaction
        );
        
        if (canMoveEarlier) {
          const newStartTime = new Date(
            nextAppointment.scheduledStartTime.getTime() - earlyMinutes * 60000
          );
          const newEndTime = new Date(
            nextAppointment.scheduledEndTime.getTime() - earlyMinutes * 60000
          );
          
          await nextAppointment.update({
            scheduledStartTime: newStartTime,
            scheduledEndTime: newEndTime,
            movedEarlier: earlyMinutes,
            moveReason: 'Previous appointment completed early'
          }, { transaction });
          
          if (nextAppointment.timeSlot) {
            await nextAppointment.timeSlot.update({
              startTime: newStartTime,
              endTime: newEndTime
            }, { transaction });
          }
          
          result.affectedAppointments.push({
            appointmentId: nextAppointment.id,
            originalStartTime: nextAppointment.scheduledStartTime,
            newStartTime,
            minutesEarlier: earlyMinutes
          });
        }
      }
      
      // Create opportunity for walk-in or emergency appointments
      if (earlyMinutes >= 15) {
        const opportunitySlot = await this.createOpportunitySlot(
          appointment,
          earlyMinutes,
          transaction
        );
        
        if (opportunitySlot) {
          result.opportunitiesCreated.push(opportunitySlot);
        }
      }
    }
    
    return result;
  }

  /**
   * Check if appointment can be moved earlier
   * @param {Object} appointment - Appointment to check
   * @param {number} minutes - Minutes to move earlier
   * @param {Object} transaction - Database transaction
   * @returns {Promise<boolean>} Can move earlier
   */
  async canMoveAppointmentEarlier(appointment, minutes, transaction) {
    // Check if patient is already checked in or in queue
    const queueEntry = await db.QueueEntry.findOne({
      where: {
        appointmentId: appointment.id,
        status: { [Op.in]: ['waiting', 'checked_in'] }
      },
      transaction
    });
    
    // Only move if patient is already waiting
    return queueEntry && queueEntry.status === 'checked_in';
  }

  /**
   * Create opportunity slot from early completion
   * @param {Object} appointment - Completed appointment
   * @param {number} availableMinutes - Available minutes
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Opportunity slot
   */
  async createOpportunitySlot(appointment, availableMinutes, transaction) {
    if (availableMinutes < 15) return null;
    
    const slotDuration = Math.min(availableMinutes - 5, 30); // Leave 5 min buffer
    const startTime = new Date(appointment.actualEndTime.getTime() + 5 * 60000); // 5 min after completion
    const endTime = new Date(startTime.getTime() + slotDuration * 60000);
    
    const opportunitySlot = await db.TimeSlot.create({
      doctorWalletAddress: appointment.doctorWalletAddress,
      startTime,
      endTime,
      duration: slotDuration,
      status: 'available',
      slotType: 'walk_in',
      bufferTime: 5,
      isBookable: true,
      createdFromEarlyCompletion: true,
      originalAppointmentId: appointment.id
    }, { transaction });
    
    return opportunitySlot;
  }

  /**
   * Check for buffer time violations
   * @param {Object} appointment - Appointment to check
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Buffer violation info
   */
  async checkBufferViolation(appointment, transaction) {
    const previousAppointment = await db.Appointment.findOne({
      where: {
        doctorWalletAddress: appointment.doctorWalletAddress,
        scheduledEndTime: {
          [Op.lte]: appointment.scheduledStartTime
        },
        status: 'completed'
      },
      order: [['scheduledEndTime', 'DESC']],
      transaction
    });
    
    if (!previousAppointment || !previousAppointment.actualEndTime) {
      return null;
    }
    
    const timeBetween = Math.round(
      (appointment.scheduledStartTime - previousAppointment.actualEndTime) / (1000 * 60)
    );
    
    const requiredBuffer = appointment.timeSlot?.bufferTime || 15;
    
    if (timeBetween < requiredBuffer) {
      return {
        appointmentId: appointment.id,
        previousAppointmentId: previousAppointment.id,
        actualBuffer: timeBetween,
        requiredBuffer,
        violation: requiredBuffer - timeBetween
      };
    }
    
    return null;
  }

  /**
   * Enforce buffer time for new bookings
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} proposedStartTime - Proposed start time
   * @param {Date} proposedEndTime - Proposed end time
   * @param {number} requiredBuffer - Required buffer time
   * @returns {Promise<Object>} Buffer validation result
   */
  async enforceBufferTime(doctorWalletAddress, proposedStartTime, proposedEndTime, requiredBuffer = 15) {
    // Check previous appointment
    const previousAppointment = await db.Appointment.findOne({
      where: {
        doctorWalletAddress,
        scheduledEndTime: {
          [Op.lte]: proposedStartTime
        },
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['scheduledEndTime', 'DESC']]
    });
    
    // Check next appointment
    const nextAppointment = await db.Appointment.findOne({
      where: {
        doctorWalletAddress,
        scheduledStartTime: {
          [Op.gte]: proposedEndTime
        },
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['scheduledStartTime', 'ASC']]
    });
    
    const violations = [];
    
    // Check buffer before proposed appointment
    if (previousAppointment) {
      const bufferBefore = Math.round(
        (proposedStartTime - previousAppointment.scheduledEndTime) / (1000 * 60)
      );
      
      if (bufferBefore < requiredBuffer) {
        violations.push({
          type: 'insufficient_buffer_before',
          requiredBuffer,
          actualBuffer: bufferBefore,
          conflictingAppointment: previousAppointment.id
        });
      }
    }
    
    // Check buffer after proposed appointment
    if (nextAppointment) {
      const bufferAfter = Math.round(
        (nextAppointment.scheduledStartTime - proposedEndTime) / (1000 * 60)
      );
      
      if (bufferAfter < requiredBuffer) {
        violations.push({
          type: 'insufficient_buffer_after',
          requiredBuffer,
          actualBuffer: bufferAfter,
          conflictingAppointment: nextAppointment.id
        });
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      suggestedAdjustments: violations.length > 0 ? this.suggestBufferAdjustments(
        proposedStartTime,
        proposedEndTime,
        violations,
        requiredBuffer
      ) : null
    };
  }

  /**
   * Suggest buffer time adjustments
   * @param {Date} proposedStartTime - Proposed start time
   * @param {Date} proposedEndTime - Proposed end time
   * @param {Array} violations - Buffer violations
   * @param {number} requiredBuffer - Required buffer time
   * @returns {Array} Suggested adjustments
   */
  suggestBufferAdjustments(proposedStartTime, proposedEndTime, violations, requiredBuffer) {
    const suggestions = [];
    
    for (const violation of violations) {
      const adjustment = requiredBuffer - violation.actualBuffer;
      
      if (violation.type === 'insufficient_buffer_before') {
        suggestions.push({
          type: 'move_later',
          minutes: adjustment,
          newStartTime: new Date(proposedStartTime.getTime() + adjustment * 60000),
          newEndTime: new Date(proposedEndTime.getTime() + adjustment * 60000)
        });
      } else if (violation.type === 'insufficient_buffer_after') {
        suggestions.push({
          type: 'move_earlier',
          minutes: adjustment,
          newStartTime: new Date(proposedStartTime.getTime() - adjustment * 60000),
          newEndTime: new Date(proposedEndTime.getTime() - adjustment * 60000)
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Get duration statistics for a doctor
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Duration statistics
   */
  async getDurationStatistics(doctorWalletAddress, startDate, endDate) {
    const appointments = await db.Appointment.findAll({
      where: {
        doctorWalletAddress,
        scheduledStartTime: { [Op.between]: [startDate, endDate] },
        status: 'completed',
        actualStartTime: { [Op.ne]: null },
        actualEndTime: { [Op.ne]: null }
      }
    });
    
    if (appointments.length === 0) {
      return {
        totalAppointments: 0,
        averageScheduledDuration: 0,
        averageActualDuration: 0,
        averageVariance: 0,
        onTimePercentage: 0,
        overrunPercentage: 0,
        earlyCompletionPercentage: 0
      };
    }
    
    let totalScheduledDuration = 0;
    let totalActualDuration = 0;
    let totalVariance = 0;
    let onTimeCount = 0;
    let overrunCount = 0;
    let earlyCount = 0;
    
    for (const appointment of appointments) {
      const scheduledDuration = appointment.estimatedDuration;
      const actualDuration = appointment.actualDuration || Math.round(
        (appointment.actualEndTime - appointment.actualStartTime) / (1000 * 60)
      );
      const variance = actualDuration - scheduledDuration;
      
      totalScheduledDuration += scheduledDuration;
      totalActualDuration += actualDuration;
      totalVariance += Math.abs(variance);
      
      if (Math.abs(variance) <= 5) { // Within 5 minutes is considered on time
        onTimeCount++;
      } else if (variance > 5) {
        overrunCount++;
      } else {
        earlyCount++;
      }
    }
    
    return {
      totalAppointments: appointments.length,
      averageScheduledDuration: Math.round(totalScheduledDuration / appointments.length),
      averageActualDuration: Math.round(totalActualDuration / appointments.length),
      averageVariance: Math.round(totalVariance / appointments.length),
      onTimePercentage: Math.round((onTimeCount / appointments.length) * 100),
      overrunPercentage: Math.round((overrunCount / appointments.length) * 100),
      earlyCompletionPercentage: Math.round((earlyCount / appointments.length) * 100)
    };
  }
}

export default new DynamicDurationManager();