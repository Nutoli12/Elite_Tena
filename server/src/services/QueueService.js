/**
 * QueueService - Patient Queue Management
 * Handles patient queues, wait times, and position tracking
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

class QueueService {
  /**
   * Add patient to queue
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {string} patientWalletAddress - Patient's wallet address
   * @param {string} appointmentId - Appointment ID
   * @param {Object} options - Queue options
   * @returns {Promise<Object>} Queue entry
   */
  async addToQueue(doctorWalletAddress, patientWalletAddress, appointmentId, options = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const appointmentDate = options.appointmentDate || new Date();
      const queueDate = new Date(appointmentDate);
      queueDate.setHours(0, 0, 0, 0);
      
      // Find or create queue for the day
      let queue = await db.PatientQueue.findOne({
        where: {
          doctorWalletAddress,
          queueDate
        },
        transaction
      });
      
      if (!queue) {
        queue = await db.PatientQueue.create({
          doctorWalletAddress,
          queueDate,
          status: 'active',
          totalPatients: 0,
          currentPosition: 0
        }, { transaction });
      }
      
      // Get next position
      const nextPosition = await this.getNextPosition(queue.id, transaction);
      
      // Create queue entry
      const queueEntry = await db.QueueEntry.create({
        queueId: queue.id,
        patientWalletAddress,
        appointmentId,
        position: nextPosition,
        status: 'waiting',
        joinedAt: new Date(),
        priority: options.priority || 'normal',
        estimatedWaitTime: await this.calculateEstimatedWaitTime(queue.id, nextPosition)
      }, { transaction });
      
      // Update queue totals
      await queue.update({
        totalPatients: queue.totalPatients + 1
      }, { transaction });
      
      await transaction.commit();
      
      return {
        queueEntry: await queueEntry.reload({ include: ['queue', 'patient', 'appointment'] }),
        queue: await queue.reload()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update queue position after appointment completion
   * @param {string} appointmentId - Completed appointment ID
   * @returns {Promise<Object>} Updated queue info
   */
  async updateQueuePosition(appointmentId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Find the completed queue entry
      const completedEntry = await db.QueueEntry.findOne({
        where: { appointmentId },
        include: ['queue'],
        transaction
      });
      
      if (!completedEntry) {
        throw new Error('Queue entry not found');
      }
      
      // Mark as completed
      await completedEntry.update({
        status: 'completed',
        completedAt: new Date()
      }, { transaction });
      
      // Update queue current position
      const queue = completedEntry.queue;
      await queue.update({
        currentPosition: completedEntry.position
      }, { transaction });
      
      // Recalculate wait times for remaining patients
      await this.recalculateWaitTimes(queue.id, transaction);
      
      await transaction.commit();
      
      return {
        completedEntry,
        updatedQueue: await queue.reload()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Calculate estimated wait time
   * @param {string} queueId - Queue ID
   * @param {number} position - Position in queue
   * @returns {Promise<number>} Estimated wait time in minutes
   */
  async calculateEstimatedWaitTime(queueId, position) {
    const queue = await db.PatientQueue.findByPk(queueId);
    if (!queue) return 0;
    
    // Get average appointment duration for this doctor
    const avgDuration = await this.getAverageAppointmentDuration(queue.doctorWalletAddress);
    
    // Calculate positions ahead
    const positionsAhead = Math.max(0, position - queue.currentPosition - 1);
    
    // Base wait time calculation
    let estimatedWait = positionsAhead * avgDuration;
    
    // Add buffer for delays (20% buffer)
    estimatedWait = Math.round(estimatedWait * 1.2);
    
    return estimatedWait;
  }

  /**
   * Get average appointment duration for a doctor
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @returns {Promise<number>} Average duration in minutes
   */
  async getAverageAppointmentDuration(doctorWalletAddress) {
    const result = await db.Appointment.findOne({
      where: {
        doctorWalletAddress,
        status: 'completed',
        actualStartTime: { [Op.ne]: null },
        actualEndTime: { [Op.ne]: null }
      },
      attributes: [
        [db.sequelize.fn('AVG', 
          db.sequelize.literal('EXTRACT(EPOCH FROM (actual_end_time - actual_start_time))/60')
        ), 'avgDuration']
      ],
      raw: true
    });
    
    return result?.avgDuration ? Math.round(result.avgDuration) : 30; // Default 30 minutes
  }

  /**
   * Recalculate wait times for all waiting patients in queue
   * @param {string} queueId - Queue ID
   * @param {Object} transaction - Database transaction
   * @returns {Promise<void>}
   */
  async recalculateWaitTimes(queueId, transaction = null) {
    const waitingEntries = await db.QueueEntry.findAll({
      where: {
        queueId,
        status: 'waiting'
      },
      order: [['position', 'ASC']],
      transaction
    });
    
    for (const entry of waitingEntries) {
      const newWaitTime = await this.calculateEstimatedWaitTime(queueId, entry.position);
      await entry.update({
        estimatedWaitTime: newWaitTime
      }, { transaction });
    }
  }

  /**
   * Get next position in queue
   * @param {string} queueId - Queue ID
   * @param {Object} transaction - Database transaction
   * @returns {Promise<number>} Next position
   */
  async getNextPosition(queueId, transaction = null) {
    const result = await db.QueueEntry.findOne({
      where: { queueId },
      attributes: [[db.sequelize.fn('MAX', db.sequelize.col('position')), 'maxPosition']],
      raw: true,
      transaction
    });
    
    return (result?.maxPosition || 0) + 1;
  }

  /**
   * Remove patient from queue
   * @param {string} appointmentId - Appointment ID
   * @param {string} reason - Removal reason
   * @returns {Promise<Object>} Removed entry
   */
  async removeFromQueue(appointmentId, reason = 'cancelled') {
    const transaction = await db.sequelize.transaction();
    
    try {
      const queueEntry = await db.QueueEntry.findOne({
        where: { appointmentId },
        include: ['queue'],
        transaction
      });
      
      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }
      
      // Update entry status
      await queueEntry.update({
        status: reason === 'cancelled' ? 'cancelled' : 'removed',
        completedAt: new Date()
      }, { transaction });
      
      // Update queue total
      await queueEntry.queue.update({
        totalPatients: Math.max(0, queueEntry.queue.totalPatients - 1)
      }, { transaction });
      
      // Recalculate wait times
      await this.recalculateWaitTimes(queueEntry.queueId, transaction);
      
      await transaction.commit();
      
      return queueEntry;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get queue status for patient
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Queue status
   */
  async getQueueStatus(appointmentId) {
    const queueEntry = await db.QueueEntry.findOne({
      where: { appointmentId },
      include: [
        {
          model: db.PatientQueue,
          as: 'queue',
          include: ['doctor']
        },
        {
          model: db.Patient,
          as: 'patient'
        },
        {
          model: db.Appointment,
          as: 'appointment'
        }
      ]
    });
    
    if (!queueEntry) {
      return null;
    }
    
    const positionsAhead = Math.max(0, queueEntry.position - queueEntry.queue.currentPosition - 1);
    
    return {
      queueEntry,
      positionsAhead,
      estimatedWaitTime: queueEntry.estimatedWaitTime,
      currentPosition: queueEntry.position,
      queueStatus: queueEntry.queue.status,
      totalInQueue: queueEntry.queue.totalPatients
    };
  }

  /**
   * Get doctor's queue for the day
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} date - Date (optional, defaults to today)
   * @returns {Promise<Object>} Doctor's queue
   */
  async getDoctorQueue(doctorWalletAddress, date = new Date()) {
    const queueDate = new Date(date);
    queueDate.setHours(0, 0, 0, 0);
    
    const queue = await db.PatientQueue.findOne({
      where: {
        doctorWalletAddress,
        queueDate
      },
      include: [
        {
          model: db.QueueEntry,
          as: 'entries',
          include: ['patient', 'appointment'],
          order: [['position', 'ASC']]
        },
        {
          model: db.Doctor,
          as: 'doctor'
        }
      ]
    });
    
    if (!queue) {
      return null;
    }
    
    const waitingEntries = queue.entries.filter(e => e.status === 'waiting');
    const completedEntries = queue.entries.filter(e => e.status === 'completed');
    
    return {
      queue,
      waitingPatients: waitingEntries,
      completedPatients: completedEntries,
      currentPatient: queue.entries.find(e => e.position === queue.currentPosition + 1),
      stats: {
        total: queue.totalPatients,
        waiting: waitingEntries.length,
        completed: completedEntries.length,
        averageWaitTime: this.calculateAverageWaitTime(completedEntries)
      }
    };
  }

  /**
   * Calculate average wait time from completed entries
   * @param {Array} completedEntries - Completed queue entries
   * @returns {number} Average wait time in minutes
   */
  calculateAverageWaitTime(completedEntries) {
    if (completedEntries.length === 0) return 0;
    
    const totalWaitTime = completedEntries.reduce((sum, entry) => {
      if (entry.joinedAt && entry.completedAt) {
        const waitTime = (entry.completedAt - entry.joinedAt) / (1000 * 60); // Convert to minutes
        return sum + waitTime;
      }
      return sum;
    }, 0);
    
    return Math.round(totalWaitTime / completedEntries.length);
  }

  /**
   * Handle patient check-in
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Updated queue entry
   */
  async checkInPatient(appointmentId) {
    const queueEntry = await db.QueueEntry.findOne({
      where: { appointmentId },
      include: ['queue', 'patient', 'appointment']
    });
    
    if (!queueEntry) {
      throw new Error('Queue entry not found');
    }
    
    if (queueEntry.status !== 'waiting') {
      throw new Error('Patient is not in waiting status');
    }
    
    await queueEntry.update({
      status: 'checked_in',
      checkedInAt: new Date()
    });
    
    return queueEntry.reload();
  }

  /**
   * Mark appointment as in progress
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Updated queue entry
   */
  async startAppointment(appointmentId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const queueEntry = await db.QueueEntry.findOne({
        where: { appointmentId },
        include: ['queue'],
        transaction
      });
      
      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }
      
      // Update queue entry
      await queueEntry.update({
        status: 'in_progress',
        startedAt: new Date()
      }, { transaction });
      
      // Update queue current position
      await queueEntry.queue.update({
        currentPosition: queueEntry.position
      }, { transaction });
      
      await transaction.commit();
      
      return queueEntry.reload();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Handle appointment delays
   * @param {string} appointmentId - Appointment ID
   * @param {number} delayMinutes - Delay in minutes
   * @param {string} reason - Delay reason
   * @returns {Promise<Object>} Updated queue info
   */
  async handleAppointmentDelay(appointmentId, delayMinutes, reason) {
    const queueEntry = await db.QueueEntry.findOne({
      where: { appointmentId },
      include: ['queue']
    });
    
    if (!queueEntry) {
      throw new Error('Queue entry not found');
    }
    
    // Update estimated wait times for all subsequent patients
    const subsequentEntries = await db.QueueEntry.findAll({
      where: {
        queueId: queueEntry.queueId,
        position: { [Op.gt]: queueEntry.position },
        status: 'waiting'
      }
    });
    
    for (const entry of subsequentEntries) {
      await entry.update({
        estimatedWaitTime: entry.estimatedWaitTime + delayMinutes
      });
    }
    
    return {
      delayedEntry: queueEntry,
      affectedPatients: subsequentEntries.length,
      delayMinutes,
      reason
    };
  }

  /**
   * Get queue statistics
   * @param {string} doctorWalletAddress - Doctor's wallet address
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStatistics(doctorWalletAddress, startDate, endDate) {
    const queues = await db.PatientQueue.findAll({
      where: {
        doctorWalletAddress,
        queueDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: ['entries']
    });
    
    let totalPatients = 0;
    let totalWaitTime = 0;
    let completedAppointments = 0;
    let cancelledAppointments = 0;
    
    for (const queue of queues) {
      totalPatients += queue.totalPatients;
      
      for (const entry of queue.entries) {
        if (entry.status === 'completed' && entry.joinedAt && entry.completedAt) {
          const waitTime = (entry.completedAt - entry.joinedAt) / (1000 * 60);
          totalWaitTime += waitTime;
          completedAppointments++;
        } else if (entry.status === 'cancelled') {
          cancelledAppointments++;
        }
      }
    }
    
    return {
      totalQueues: queues.length,
      totalPatients,
      completedAppointments,
      cancelledAppointments,
      averageWaitTime: completedAppointments > 0 ? Math.round(totalWaitTime / completedAppointments) : 0,
      averagePatientsPerDay: queues.length > 0 ? Math.round(totalPatients / queues.length) : 0,
      completionRate: totalPatients > 0 ? Math.round((completedAppointments / totalPatients) * 100) : 0
    };
  }
}

export default new QueueService();