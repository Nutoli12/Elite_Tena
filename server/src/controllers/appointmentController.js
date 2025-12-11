import db from '../models/index.js';
const { Appointment, Patient, Doctor, User } = db;

/**
 * Helper: Ensure patient record exists, auto-create if missing
 * This handles legacy users who were created before Patient table existed
 */
const ensurePatientExists = async (walletAddress) => {
  const normalizedWallet = walletAddress.toLowerCase();

  // Check if patient record exists
  let patient = await Patient.findOne({
    where: { walletAddress: normalizedWallet }
  });

  if (!patient) {
    // Check if user exists with patient role
    const user = await User.findOne({
      where: { walletAddress: normalizedWallet }
    });

    if (user && user.role === 'patient') {
      // Auto-create missing patient record
      patient = await Patient.create({
        walletAddress: normalizedWallet
      });
      console.log(`🔧 Auto-created missing patient record for: ${normalizedWallet}`);
    }
  }

  return patient;
};

/**
 * Helper: Ensure doctor record exists, auto-create if missing
 * This handles legacy users who were created before Doctor table existed
 */
const ensureDoctorExists = async (walletAddress) => {
  const normalizedWallet = walletAddress.toLowerCase();

  // Check if doctor record exists
  let doctor = await Doctor.findOne({
    where: { walletAddress: normalizedWallet }
  });

  if (!doctor) {
    // Check if user exists with doctor role
    const user = await User.findOne({
      where: { walletAddress: normalizedWallet }
    });

    if (user && user.role === 'doctor') {
      // Auto-create missing doctor record
      doctor = await Doctor.create({
        walletAddress: normalizedWallet,
        specialization: user.profileData?.specialization || 'General Practice',
        department: user.profileData?.department || 'General Practice'
      });
      console.log(`🔧 Auto-created missing doctor record for: ${normalizedWallet}`);
    }
  }

  return doctor;
};

/**
 * Get all appointments (with optional filtering)
 */
export const getAppointments = async (req, res) => {
  try {
    // Support wallet from either URL path or query parameter
    const patientWalletFromPath = req.params.patientWallet;
    const doctorWalletFromPath = req.params.doctorWallet;
    const { patientWallet, doctorWallet, status, userRole, userId } = req.query;

    const finalPatientWallet = patientWalletFromPath || patientWallet;
    const finalDoctorWallet = doctorWalletFromPath || doctorWallet;

    console.log('🔍 Fetching appointments...', { userRole, userId });

    const where = {};

    // 👨‍⚕️ FIXED: Separate doctor vs patient views
    if (userRole && userId) {
      if (userRole === 'doctor') {
        where.doctorWalletAddress = userId.toLowerCase();
        console.log('📋 Fetching doctor schedule for:', userId);
      } else if (userRole === 'patient') {
        where.patientWalletAddress = userId.toLowerCase();
        console.log('👤 Fetching patient appointments for:', userId);
      }
    } else {
      // Legacy filtering
      if (finalPatientWallet) {
        where.patientWalletAddress = finalPatientWallet.toLowerCase();
      }
      if (finalDoctorWallet) {
        where.doctorWalletAddress = finalDoctorWallet.toLowerCase();
      }
    }

    if (status) {
      where.status = status;
    }

    // ENHANCED QUERY - Include names but with safe joins
    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false, // LEFT JOIN - don't fail if missing
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false, // LEFT JOIN - don't fail if missing
          attributes: ['walletAddress', 'specialization']
        },
        {
          model: User,
          as: 'patient',
          required: false,
          attributes: ['email', 'profileData']
        },
        {
          model: User,
          as: 'doctor',
          required: false,
          attributes: ['email', 'profileData']
        }
      ],
      order: [['appointmentDate', 'ASC']]
    });

    console.log(`✅ Found ${appointments.length} appointments`);

    // Format appointments with clear "appointedWith" information
    const formattedAppointments = appointments.map(appointment => {
      const appointmentData = appointment.toJSON();
      
      // Extract doctor information
      let doctorName = 'Unknown Doctor';
      let doctorSpecialization = 'General';
      let doctorEmail = '';
      
      if (appointment.doctor) {
        try {
          // profileData is already an object, no need to parse
          const profileData = appointment.doctor.profileData;
          doctorName = profileData?.name || 
                      profileData?.fullName || 
                      (profileData?.firstName && profileData?.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}` 
                        : profileData?.firstName || 'Unknown Doctor');
        } catch (e) {
          console.error('Error extracting doctor name:', e);
          doctorName = 'Unknown Doctor';
        }
        doctorEmail = appointment.doctor.email || '';
      }
      
      if (appointment.doctorDetails) {
        doctorSpecialization = appointment.doctorDetails.specialization || 'General';
      }
      
      // Extract patient information
      let patientName = 'Unknown Patient';
      let patientEmail = '';
      
      if (appointment.patient) {
        try {
          // profileData is already an object, no need to parse
          const profileData = appointment.patient.profileData;
          patientName = profileData?.name || 
                       profileData?.fullName || 
                       (profileData?.firstName && profileData?.lastName 
                         ? `${profileData.firstName} ${profileData.lastName}` 
                         : profileData?.firstName || 'Unknown Patient');
        } catch (e) {
          console.error('Error extracting patient name:', e);
          patientName = 'Unknown Patient';
        }
        patientEmail = appointment.patient.email || '';
      }
      
      // Add clear appointment information
      return {
        ...appointmentData,
        // Clear appointment information
        appointedWith: {
          name: doctorName,
          specialization: doctorSpecialization,
          email: doctorEmail,
          walletAddress: appointment.doctorWalletAddress
        },
        patientInfo: {
          name: patientName,
          email: patientEmail,
          walletAddress: appointment.patientWalletAddress
        },
        // Formatted display strings
        displayDoctor: `${doctorName} (${doctorSpecialization})`,
        displayPatient: patientName,
        appointmentSummary: `Appointment with ${doctorName} (${doctorSpecialization}) on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
      };
    });

    res.json({
      success: true,
      data: formattedAppointments,
      count: formattedAppointments.length,
      userRole,
      userId
    });
  } catch (error) {
    console.error('❌ Get appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching appointment:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          attributes: ['walletAddress']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          attributes: ['walletAddress', 'specialization']
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

    console.log('✅ Appointment found');

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('❌ Get appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment',
      message: error.message
    });
  }
};

/**
 * Create a new appointment
 */
export const createAppointment = async (req, res) => {
  try {
    const {
      patientWalletAddress,
      doctorWalletAddress,
      appointmentDate,
      reason,
      duration,
      fee
    } = req.body;

    console.log('📝 Creating appointment for patient:', patientWalletAddress);

    // Validate required fields
    if (!patientWalletAddress || !doctorWalletAddress || !appointmentDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'patientWalletAddress, doctorWalletAddress, and appointmentDate are required'
      });
    }

    // Verify patient exists (auto-create if user exists but patient record missing)
    const patient = await ensurePatientExists(patientWalletAddress);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: `No patient user found with wallet: ${patientWalletAddress}. User must register first.`
      });
    }

    // Verify doctor exists (auto-create if user exists but doctor record missing)
    const doctor = await ensureDoctorExists(doctorWalletAddress);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found',
        message: `No doctor user found with wallet: ${doctorWalletAddress}. Doctor must be registered first.`
      });
    }

    // Calculate reschedule deadline (24 hours before appointment)
    const rescheduleDeadline = new Date(new Date(appointmentDate).getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    const canReschedule = rescheduleDeadline > now;

    // Create appointment
    const appointment = await Appointment.create({
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      appointmentDate,
      reason,
      duration: duration || 30,
      fee: fee || 0,
      status: 'scheduled',
      paymentStatus: 'pending',
      // 🆕 Save new fields
      serviceType: req.body.serviceType || 'inPerson',
      requiresApproval: req.body.requiresApproval || false,
      approvalStatus: req.body.approvalStatus || 'pending',
      // 🆕 NO-CANCEL SYSTEM: Set reschedule deadline
      rescheduleDeadline,
      canReschedule,
      rescheduleCount: 0,
      isRescheduled: false
    });

    // 🔔 Send notification to doctor
    try {
      const { sendNotification } = await import('../services/socketService.js');
      
      if (appointment.requiresApproval) {
        // Premium service - requires approval
        await sendNotification(
          appointment.doctorWalletAddress,
          'new_appointment_request',
          {
            title: 'New Premium Appointment Request',
            message: `New ${appointment.serviceType} appointment request from patient. Fee: ${appointment.fee} Birr`,
            relatedId: appointment.id,
            priority: 'high'
          }
        );
        console.log('🔔 Sent premium appointment notification to doctor');
      } else {
        // Free in-person - just notify
        await sendNotification(
          appointment.doctorWalletAddress,
          'new_appointment_request',
          {
            title: 'New Appointment Scheduled',
            message: `New in-person appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleString()}`,
            relatedId: appointment.id,
            priority: 'medium'
          }
        );
        console.log('🔔 Sent appointment notification to doctor');
      }
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
      // Don't fail the appointment creation if notification fails
    }

    console.log('✅ Appointment created:', {
      id: appointment.id,
      patient: appointment.patientWalletAddress,
      doctor: appointment.doctorWalletAddress,
      date: appointment.appointmentDate,
      requiresApproval: appointment.requiresApproval,
      status: appointment.status
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });
  } catch (error) {
    console.error('❌ Create appointment error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    if (error.parent) {
      console.error('❌ Database error:', error.parent.message);
    }
    if (error.errors) {
      console.error('❌ Validation errors:', error.errors.map(e => e.message));
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error.message,
      details: error.parent?.message || error.errors?.map(e => e.message) || null
    });
  }
};

/**
 * Update an appointment
 */
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🔄 Updating appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        message: `No appointment found with id: ${id}`
      });
    }

    await appointment.update(updates);

    console.log('✅ Appointment updated');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (error) {
    console.error('❌ Update appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment',
      message: error.message
    });
  }
};

/**
 * 🚫 REMOVED: Cancel appointment - replaced with note system
 * Patients can no longer cancel appointments, only leave notes
 */

/**
 * 📝 NEW: Patient leaves note (instead of canceling) - SIMPLIFIED VERSION
 */
export const leavePatientNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, patientWallet } = req.body;

    console.log('📝 Patient leaving note for appointment:', id);

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note is required',
        message: 'Please provide a reason for not attending'
      });
    }

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify patient owns this appointment
    if (appointment.patientWalletAddress.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only leave notes for your own appointments'
      });
    }

    // Update appointment using existing fields - store note in 'notes' field and update status
    const noteWithTimestamp = `[PATIENT NOTE - ${new Date().toISOString()}]: ${note.trim()}`;
    const existingNotes = appointment.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${noteWithTimestamp}` : noteWithTimestamp;

    await appointment.update({
      notes: updatedNotes,
      status: 'cancelled' // Use existing status - patient left note explaining absence
    });

    // 🔔 Notify doctor about patient note
    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        appointment.doctorWalletAddress,
        'patient_note',
        {
          title: 'Patient Left Note',
          message: `Patient left a note about their appointment: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}"`,
          relatedId: appointment.id,
          priority: 'medium'
        }
      );
      console.log('🔔 Notified doctor about patient note');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Patient note saved');

    res.json({
      success: true,
      message: 'Note saved successfully. Doctor has been notified.',
      data: {
        id: appointment.id,
        notes: appointment.notes,
        status: appointment.status,
        patientNote: note.trim(), // Return the note for frontend
        patientNoteDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Leave patient note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save note',
      message: error.message
    });
  }
};

/**
 * ⏰ NEW: Check if appointment can be rescheduled (24-hour rule)
 */
export const checkRescheduleEligibility = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('⏰ Checking reschedule eligibility for appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    const canReschedule = hoursUntilAppointment > 24;
    const rescheduleDeadline = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));

    // Update the appointment with calculated deadline
    await appointment.update({
      canReschedule,
      rescheduleDeadline
    });

    console.log(`✅ Reschedule check: ${canReschedule ? 'ALLOWED' : 'BLOCKED'} (${hoursUntilAppointment.toFixed(1)}h remaining)`);

    res.json({
      success: true,
      data: {
        canReschedule,
        hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10,
        rescheduleDeadline,
        appointmentDate: appointment.appointmentDate,
        message: canReschedule 
          ? `You can reschedule until ${rescheduleDeadline.toLocaleString()}`
          : 'Reschedule deadline has passed (24 hours before appointment). You can leave a note instead.'
      }
    });
  } catch (error) {
    console.error('❌ Check reschedule eligibility error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check reschedule eligibility',
      message: error.message
    });
  }
};

/**
 * 🔄 NEW: Reschedule appointment (with 24-hour restriction)
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, reason, patientWallet } = req.body;

    console.log('🔄 Attempting to reschedule appointment:', id);

    if (!newDate) {
      return res.status(400).json({
        success: false,
        error: 'New appointment date is required'
      });
    }

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify patient owns this appointment
    if (appointment.patientWalletAddress.toLowerCase() !== patientWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only reschedule your own appointments'
      });
    }

    // Check 24-hour rule
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment <= 24) {
      return res.status(400).json({
        success: false,
        error: 'Reschedule deadline passed',
        message: 'Appointments cannot be rescheduled within 24 hours. You can leave a note instead.',
        canReschedule: false,
        hoursRemaining: Math.round(hoursUntilAppointment * 10) / 10
      });
    }

    // Store original date if this is the first reschedule
    const originalDate = appointment.originalAppointmentDate || appointment.appointmentDate;

    // Update appointment
    await appointment.update({
      appointmentDate: new Date(newDate),
      originalAppointmentDate: originalDate,
      isRescheduled: true,
      rescheduleCount: appointment.rescheduleCount + 1,
      lastRescheduleDate: new Date(),
      rescheduleReason: reason || 'Patient requested reschedule',
      rescheduleDeadline: new Date(new Date(newDate).getTime() - (24 * 60 * 60 * 1000)),
      canReschedule: true,
      status: 'rescheduled'
    });

    // 🔔 Notify doctor about reschedule
    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        appointment.doctorWalletAddress,
        'appointment_rescheduled',
        {
          title: 'Appointment Rescheduled',
          message: `Patient rescheduled appointment to ${new Date(newDate).toLocaleString()}`,
          relatedId: appointment.id,
          priority: 'high'
        }
      );
      console.log('🔔 Notified doctor about reschedule');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Appointment rescheduled successfully');

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        id: appointment.id,
        oldDate: originalDate,
        newDate: appointment.appointmentDate,
        rescheduleCount: appointment.rescheduleCount,
        rescheduleDeadline: appointment.rescheduleDeadline
      }
    });
  } catch (error) {
    console.error('❌ Reschedule appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule appointment',
      message: error.message
    });
  }
};

/**
 * Delete an appointment
 */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    await appointment.destroy();

    console.log('✅ Appointment deleted');

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete appointment',
      message: error.message
    });
  }
};

/**
 * 👨‍⚕️ NEW: Get doctor's schedule/appointments
 */
export const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    const { date, status } = req.query;

    console.log('📋 Fetching doctor schedule for:', doctorWallet);

    const where = {
      doctorWalletAddress: doctorWallet.toLowerCase()
    };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      where.appointmentDate = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    if (status) {
      where.status = status;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress'],
          include: [
            {
              model: db.User,
              as: 'user',
              required: false,
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['appointmentDate', 'ASC']]
    });

    console.log(`✅ Found ${appointments.length} appointments in doctor's schedule`);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
      doctorWallet
    });

  } catch (error) {
    console.error('❌ Get doctor schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor schedule',
      message: error.message
    });
  }
};

/**
 * 👨‍⚕️ NEW: Doctor creates appointment slot
 */
export const createDoctorSlot = async (req, res) => {
  try {
    const {
      doctorWalletAddress,
      slotDate,
      startTime,
      endTime,
      consultationType,
      fee,
      notes
    } = req.body;

    console.log('📅 Doctor creating appointment slot:', doctorWalletAddress);

    // Verify doctor exists
    const doctor = await Doctor.findOne({
      where: { walletAddress: doctorWalletAddress.toLowerCase() }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Create appointment slot (without patient initially)
    const appointmentSlot = await Appointment.create({
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      appointmentDate: new Date(`${slotDate} ${startTime}`),
      endTime: new Date(`${slotDate} ${endTime}`),
      consultationType: consultationType || 'in-person',
      fee: fee || 0,
      status: 'available',
      notes,
      reason: 'Available slot'
    });

    console.log('✅ Doctor appointment slot created:', appointmentSlot.id);

    res.status(201).json({
      success: true,
      message: 'Appointment slot created successfully',
      data: appointmentSlot
    });

  } catch (error) {
    console.error('❌ Create doctor slot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment slot',
      message: error.message
    });
  }
};

/**
 * 👨‍⚕️ NEW: Get available appointment slots
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorWallet, date } = req.query;

    console.log('🔍 Fetching available appointment slots...');

    const where = {
      status: 'available'
    };

    if (doctorWallet) {
      where.doctorWalletAddress = doctorWallet.toLowerCase();
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      where.appointmentDate = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const availableSlots = await Appointment.findAll({
      where,
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'specialization'],
          include: [
            {
              model: db.User,
              as: 'user',
              required: false,
              attributes: ['email', 'profileData']
            }
          ]
        }
      ],
      order: [['appointmentDate', 'ASC']]
    });

    console.log(`✅ Found ${availableSlots.length} available slots`);

    res.json({
      success: true,
      data: availableSlots,
      count: availableSlots.length
    });

  } catch (error) {
    console.error('❌ Get available slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available slots',
      message: error.message
    });
  }
};

/**
 * 👤 NEW: Patient books available slot - TRUE WEB3 INTEGRATION
 */
export const bookAppointmentSlot = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { slotId } = req.params;
    const { patientWalletAddress, reason, notes, appointmentFee } = req.body;

    console.log('📅 ========== BOOKING APPOINTMENT WITH BLOCKCHAIN PAYMENT ==========');
    console.log('📅 Slot ID:', slotId);
    console.log('📅 Patient Wallet:', patientWalletAddress);
    console.log('📅 Appointment Fee:', appointmentFee, 'ETH');

    // Find the available slot
    const slot = await Appointment.findByPk(slotId, { transaction });

    if (!slot) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Appointment slot not found'
      });
    }

    if (slot.status !== 'available') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Appointment slot not available'
      });
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { walletAddress: patientWalletAddress.toLowerCase() },
      transaction
    });

    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // ========== BLOCKCHAIN PAYMENT FIRST ==========
    if (appointmentFee && parseFloat(appointmentFee) > 0) {
      console.log('🔗 Step 1: Processing blockchain payment...');
      
      // Import blockchain service
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const blockchainService = require('../../services/blockchain.cjs');

      // Convert fee to Wei
      const { ethers } = require('ethers');
      const feeInWei = ethers.parseEther(appointmentFee.toString());

      // Book appointment with payment on blockchain
      const blockchainResult = await blockchainService.bookAppointment(
        patientWalletAddress.toLowerCase(),
        slot.doctorWalletAddress.toLowerCase(),
        feeInWei
      );

      if (!blockchainResult.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Blockchain payment failed',
          message: blockchainResult.error,
          details: 'Appointment payment must be processed on blockchain first',
          blockchain: false
        });
      }

      console.log('✅ Step 1 Complete: Blockchain payment processed:', blockchainResult.transactionHash);

      // Update slot with blockchain payment info
      await slot.update({
        patientWalletAddress: patientWalletAddress.toLowerCase(),
        status: 'scheduled',
        reason: reason || 'Consultation',
        notes: notes || slot.notes,
        bookedAt: new Date(),
        paymentStatus: 'paid',
        fee: appointmentFee,
        // Blockchain metadata
        blockchainTxHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        gasUsed: blockchainResult.gasUsed,
        onBlockchain: true
      }, { transaction });

      await transaction.commit();

      console.log('✅ Step 2 Complete: Appointment booked with blockchain payment');
      console.log('🎉 TRUE WEB3: Appointment payment processed on blockchain');
      console.log('📅 ========== BLOCKCHAIN APPOINTMENT BOOKING COMPLETE ==========');

      res.json({
        success: true,
        message: 'Appointment booked successfully with blockchain payment',
        data: {
          ...slot.toJSON(),
          blockchain: {
            transactionHash: blockchainResult.transactionHash,
            blockNumber: blockchainResult.blockNumber,
            gasUsed: blockchainResult.gasUsed,
            appointmentFee: blockchainResult.appointmentFee,
            paid: true,
            network: 'sepolia'
          }
        }
      });
    } else {
      // Free appointment - no blockchain payment needed
      await slot.update({
        patientWalletAddress: patientWalletAddress.toLowerCase(),
        status: 'scheduled',
        reason: reason || 'Consultation',
        notes: notes || slot.notes,
        bookedAt: new Date(),
        paymentStatus: 'free',
        fee: 0
      }, { transaction });

      await transaction.commit();

      console.log('✅ Free appointment booked successfully');

      res.json({
        success: true,
        message: 'Free appointment booked successfully',
        data: slot
      });
    }

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Book appointment slot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment',
      message: error.message,
      blockchain: false
    });
  }
};





/**
 * Get patient appointments (SIMPLIFIED)
 */
export const getPatientAppointments = async (req, res) => {
  try {
    const { patientWallet } = req.params;
    
    console.log('🔍 Fetching appointments for patient:', patientWallet);
    
    const appointments = await Appointment.findAll({
      where: {
        patientWalletAddress: patientWallet.toLowerCase()
      },
      order: [['appointmentDate', 'DESC']],
      limit: 50
    });
    
    console.log(`✅ Found ${appointments.length} appointments`);
    
    res.json({
      success: true,
      appointments: appointments || [],
      count: appointments.length
    });
    
  } catch (error) {
    console.error('❌ Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
};



