/**
 * PHASE 2: APPOINTMENT SYSTEM OVERHAUL
 * 
 * This is a completely rewritten appointment controller with:
 * - Proper validation and error handling
 * - Robust database relationships
 * - Clear doctor/patient name resolution
 * - Comprehensive logging
 */

import db from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
const { Appointment, Patient, Doctor, User, Sequelize, Op } = db;

/**
 * Helper: Ensure patient record exists, auto-create if missing
 */
const ensurePatientExists = async (walletAddress) => {
  const normalizedWallet = walletAddress.toLowerCase();

  let patient = await Patient.findOne({
    where: { walletAddress: normalizedWallet }
  });

  if (!patient) {
    const user = await User.findOne({
      where: { walletAddress: normalizedWallet }
    });

    if (user && user.role === 'patient') {
      patient = await Patient.create({
        walletAddress: normalizedWallet,
        name: user.profileData?.name || 
              user.profileData?.fullName || 
              `Patient ${normalizedWallet.substring(0, 8)}`
      });
      console.log(`🔧 Auto-created missing patient record for: ${normalizedWallet}`);
    }
  }

  return patient;
};

/**
 * Helper: Ensure doctor record exists, auto-create if missing
 */
const ensureDoctorExists = async (walletAddress) => {
  const normalizedWallet = walletAddress.toLowerCase();

  let doctor = await Doctor.findOne({
    where: { walletAddress: normalizedWallet }
  });

  if (!doctor) {
    const user = await User.findOne({
      where: { walletAddress: normalizedWallet }
    });

    if (user && user.role === 'doctor') {
      doctor = await Doctor.create({
        walletAddress: normalizedWallet,
        name: user.profileData?.name || 
              user.profileData?.fullName || 
              `Dr. ${normalizedWallet.substring(0, 8)}`,
        specialization: user.profileData?.specialization || 'General Practice',
        department: user.profileData?.department || 'General Practice'
      });
      console.log(`🔧 Auto-created missing doctor record for: ${normalizedWallet}`);
    }
  }

  return doctor;
};

/**
 * Helper: Get user display name from profile data
 */
const getUserDisplayName = (user, defaultName = 'Unknown User') => {
  if (!user || !user.profileData) return defaultName;
  
  const profile = user.profileData;
  return profile.name || 
         profile.fullName || 
         (profile.firstName && profile.lastName 
           ? `${profile.firstName} ${profile.lastName}` 
           : profile.firstName || defaultName);
};

/**
 * PHASE 2: Robust appointment creation with proper validation
 */
export const createAppointment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      appointmentDate,
      reason,
      duration,
      fee
    } = req.body;

    console.log('📝 ========== CREATING APPOINTMENT V2 ==========');
    console.log('📝 Patient:', patientWalletAddress);
    console.log('📝 Doctor:', doctorWalletAddress);
    console.log('📝 Date:', appointmentDate);

    // 1. VALIDATE INPUTS
    if (!patientWalletAddress || !doctorWalletAddress || !appointmentDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWalletAddress, doctorWalletAddress, and appointmentDate are required'
      });
    }

    // 2. VERIFY USERS EXIST
    const patient = await ensurePatientExists(patientWalletAddress);
    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: `No patient user found with wallet: ${patientWalletAddress}. User must register first.`
      });
    }

    const doctor = await ensureDoctorExists(doctorWalletAddress);
    if (!doctor) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Doctor not found',
        message: `No doctor user found with wallet: ${doctorWalletAddress}. Doctor must be registered first.`
      });
    }

    // 3. CHECK AVAILABILITY
    const appointmentDateTime = new Date(appointmentDate);
    const bufferTime = 30 * 60000; // 30 minutes buffer

    const existingAppointment = await Appointment.findOne({
      where: {
        doctorWalletAddress: doctorWalletAddress.toLowerCase(),
        appointmentDate: {
          [Op.between]: [
            new Date(appointmentDateTime.getTime() - bufferTime),
            new Date(appointmentDateTime.getTime() + bufferTime)
          ]
        },
        status: { [Op.in]: ['scheduled', 'confirmed', 'in_progress'] }
      },
      transaction
    });

    if (existingAppointment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: 'Doctor not available at this time',
        message: 'Doctor has another appointment within 30 minutes of this time'
      });
    }

    // 4. CREATE APPOINTMENT
    const appointment = await Appointment.create({
      id: uuidv4(),
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      appointmentDate: appointmentDateTime,
      reason: reason || 'General consultation',
      duration: duration || 30,
      fee: fee || 0,
      status: 'scheduled',
      paymentStatus: fee > 0 ? 'pending' : 'free',
      workflowState: 'scheduled',
      requiresApproval: (fee > 0),
      approvalStatus: (fee > 0) ? 'pending' : 'approved'
    }, { transaction });

    // 5. FETCH FULL DATA FOR RESPONSE
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          attributes: ['walletAddress', 'name']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          attributes: ['walletAddress', 'name', 'specialization']
        }
      ],
      transaction
    });

    // Get user data separately to avoid association conflicts
    const patientUser = await User.findOne({
      where: { walletAddress: patientWalletAddress.toLowerCase() },
      attributes: ['email', 'profileData', 'role'],
      transaction
    });

    const doctorUser = await User.findOne({
      where: { walletAddress: doctorWalletAddress.toLowerCase() },
      attributes: ['email', 'profileData', 'role'],
      transaction
    });

    await transaction.commit();

    // 6. EMIT REAL-TIME EVENT
    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        doctorWalletAddress,
        'appointment:created',
        {
          title: 'New Appointment Scheduled',
          message: `New appointment with ${getUserDisplayName(patientUser, 'Patient')}`,
          relatedId: appointment.id,
          priority: 'medium'
        }
      );
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Appointment created successfully:', appointment.id);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        ...fullAppointment.toJSON(),
        patientName: getUserDisplayName(patientUser, 'Unknown Patient'),
        doctorName: getUserDisplayName(doctorUser, 'Unknown Doctor'),
        doctorSpecialization: fullAppointment.doctorDetails?.specialization || 'General Practice'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Create appointment V2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error.message
    });
  }
};

/**
 * PHASE 2: Robust appointment fetching with proper name resolution
 */
export const getAppointments = async (req, res) => {
  try {
    const { userRole, userId } = req.query;

    console.log('🔍 ========== FETCHING APPOINTMENTS V2 ==========');
    console.log('🔍 User Role:', userRole);
    console.log('🔍 User ID:', userId);

    if (!userRole || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userRole or userId',
        message: 'Both userRole and userId are required'
      });
    }

    // Sanitize wallet address (remove browser suffixes like :1, :2)
    const sanitizedUserId = userId.split(':')[0].toLowerCase();

    let whereClause = {};

    // Case-insensitive wallet matching
    if (userRole === 'patient') {
      whereClause = {
        patientWalletAddress: sanitizedUserId
      };
    } else if (userRole === 'doctor') {
      whereClause = {
        doctorWalletAddress: sanitizedUserId
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid user role',
        message: 'userRole must be either "patient" or "doctor"'
      });
    }

    console.log('🔍 Query WHERE clause:', JSON.stringify(whereClause, null, 2));

    // Fetch appointments with proper includes
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress', 'name']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'specialization']
        }
      ],
      order: [['appointmentDate', 'DESC']]
    });

    console.log(`✅ Found ${appointments.length} appointments`);

    // Manually fetch user data to get names
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const appointmentData = appointment.toJSON();

        // Get patient user data
        const patientUser = await User.findOne({
          where: { walletAddress: appointment.patientWalletAddress },
          attributes: ['email', 'profileData', 'role']
        });

        // Get doctor user data
        const doctorUser = await User.findOne({
          where: { walletAddress: appointment.doctorWalletAddress },
          attributes: ['email', 'profileData', 'role']
        });

        // Extract names with fallbacks
        const patientName = getUserDisplayName(patientUser, 'Unknown Patient');
        const doctorName = getUserDisplayName(doctorUser, 'Unknown Doctor');
        const doctorSpecialization = appointmentData.doctorDetails?.specialization || 'General Practice';

        return {
          ...appointmentData,
          // Clear display information
          patientName,
          doctorName,
          doctorSpecialization,
          displayDoctor: `${doctorName} (${doctorSpecialization})`,
          displayPatient: patientName,
          appointmentSummary: `Appointment with ${doctorName} on ${new Date(appointment.appointmentDate).toLocaleDateString()}`,
          // Additional metadata
          patientEmail: patientUser?.email || '',
          doctorEmail: doctorUser?.email || ''
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAppointments,
      count: enrichedAppointments.length,
      userRole,
      userId: sanitizedUserId
    });

  } catch (error) {
    console.error('❌ Get appointments V2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
};

/**
 * PHASE 2: Get appointment by ID with full data
 */
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching appointment V2:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          attributes: ['walletAddress', 'name']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          attributes: ['walletAddress', 'name', 'specialization']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        message: `No appointment found with id: ${id}`
      });
    }

    // Get user data for names
    const patientUser = await User.findOne({
      where: { walletAddress: appointment.patientWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });

    const doctorUser = await User.findOne({
      where: { walletAddress: appointment.doctorWalletAddress },
      attributes: ['email', 'profileData', 'role']
    });

    const enrichedAppointment = {
      ...appointment.toJSON(),
      patientName: getUserDisplayName(patientUser, 'Unknown Patient'),
      doctorName: getUserDisplayName(doctorUser, 'Unknown Doctor'),
      doctorSpecialization: appointment.doctorDetails?.specialization || 'General Practice'
    };

    console.log('✅ Appointment found and enriched');

    res.json({
      success: true,
      data: enrichedAppointment
    });

  } catch (error) {
    console.error('❌ Get appointment by ID V2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment',
      message: error.message
    });
  }
};

/**
 * PHASE 2: Update appointment with validation
 */
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating appointment V2:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        message: `No appointment found with id: ${id}`
      });
    }

    // Validate updates
    if (updates.appointmentDate) {
      const newDate = new Date(updates.appointmentDate);
      if (newDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date',
          message: 'Cannot schedule appointment in the past'
        });
      }
    }

    await appointment.update(updates);

    console.log('✅ Appointment updated successfully');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Update appointment V2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment',
      message: error.message
    });
  }
};

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment
};