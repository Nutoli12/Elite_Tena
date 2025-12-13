import db from '../models/index.js';
import { calculateAge, formatAge } from '../utils/ageCalculator.js';
const { Appointment, Patient, Doctor, User, Consent, Sequelize } = db;

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

    // 🔧 SANITIZE: Remove any :1, :2, etc. suffixes that might be added by browser tools
    const sanitizeWallet = (wallet) => {
      if (!wallet) return wallet;
      return wallet.split(':')[0]; // Remove everything after first colon
    };

    const sanitizedUserId = sanitizeWallet(userId);
    const sanitizedPatientWallet = sanitizeWallet(finalPatientWallet);
    const sanitizedDoctorWallet = sanitizeWallet(finalDoctorWallet);

    console.log('🔍 Fetching appointments...', { 
      userRole, 
      originalUserId: userId, 
      sanitizedUserId,
      originalPatientWallet: finalPatientWallet,
      sanitizedPatientWallet,
      originalDoctorWallet: finalDoctorWallet,
      sanitizedDoctorWallet
    });

    const where = {};

    // 👨‍⚕️ FIXED: Use correct field names based on model mapping
    if (userRole && sanitizedUserId) {
      if (userRole === 'doctor') {
        // Model maps doctorWalletAddress to 'doctorWallet' field
        where.doctorWalletAddress = sanitizedUserId.toLowerCase();
        console.log('📋 Fetching doctor schedule for:', sanitizedUserId);
      } else if (userRole === 'patient') {
        // Model maps patientWalletAddress to 'patientWallet' field  
        where.patientWalletAddress = sanitizedUserId.toLowerCase();
        console.log('👤 Fetching patient appointments for:', sanitizedUserId);
      }
    } else {
      // Legacy filtering
      if (sanitizedPatientWallet) {
        where.patientWalletAddress = sanitizedPatientWallet.toLowerCase();
      }
      if (sanitizedDoctorWallet) {
        where.doctorWalletAddress = sanitizedDoctorWallet.toLowerCase();
      }
    }

    if (status) {
      where.status = status;
    }

    // 🔒 PAYMENT-FIRST POLICY: Filter out payment_pending appointments unless specifically requested
    if (!status || status !== 'payment_pending') {
      // Only show confirmed appointments (exclude payment_pending)
      where.status = where.status ? where.status : {
        [Sequelize.Op.ne]: 'payment_pending'
      };
      
      // For paid appointments, ensure payment is completed
      where[Sequelize.Op.or] = [
        { fee: 0 }, // Free appointments
        { 
          fee: { [Sequelize.Op.gt]: 0 },
          paymentStatus: 'paid' // Only paid appointments for fee > 0
        }
      ];
    }

    // 🔍 DEBUG: Log the where clause
    console.log('🔍 Query WHERE clause:', JSON.stringify(where, null, 2));

    // ENHANCED QUERY - Include user data through separate queries to avoid conflicts
    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress', 'name', 'dateOfBirth', 'bloodType', 'allergies', 'currentMedications', 'medicalHistory']
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'specialization', 'name']
        }
      ],
      order: [['appointmentDate', 'ASC']]
    });

    // Manually fetch user data to avoid association conflicts
    for (let appointment of appointments) {
      if (appointment.patientWalletAddress) {
        const patientUser = await User.findOne({
          where: { walletAddress: appointment.patientWalletAddress },
          attributes: ['email', 'profileData', 'role']
        });
        appointment.dataValues.patientUser = patientUser;

      }
      
      if (appointment.doctorWalletAddress) {
        const doctorUser = await User.findOne({
          where: { walletAddress: appointment.doctorWalletAddress },
          attributes: ['email', 'profileData', 'role']
        });
        appointment.dataValues.doctorUser = doctorUser;
      }
    }

    console.log(`✅ Found ${appointments.length} appointments`);
    
    // 🔍 DEBUG: Log first appointment if found
    if (appointments.length > 0) {
      console.log('🔍 First appointment sample:', {
        id: appointments[0].id,
        patientWallet: appointments[0].patientWalletAddress || appointments[0].patientWallet,
        doctorWallet: appointments[0].doctorWalletAddress || appointments[0].doctorWallet,
        date: appointments[0].appointmentDate,
        status: appointments[0].status
      });
    } else {
      console.log('⚠️  No appointments found with current query');
      
      // Try a broader query to see if any appointments exist at all
      const totalAppointments = await Appointment.count();
      console.log(`📊 Total appointments in database: ${totalAppointments}`);
      
      if (totalAppointments > 0) {
        console.log('⚠️  Appointments exist but query filters are not matching');
        // Sample a few appointments to see their structure
        const sampleAppointments = await Appointment.findAll({ limit: 3 });
        console.log('📋 Sample appointments:');
        sampleAppointments.forEach((apt, index) => {
          console.log(`   ${index + 1}. Patient: ${apt.patientWalletAddress || apt.patientWallet}`);
          console.log(`      Doctor: ${apt.doctorWalletAddress || apt.doctorWallet}`);
          console.log(`      Date: ${apt.appointmentDate}`);
        });
      }
    }

    // Format appointments with clear "appointedWith" information
    const formattedAppointments = appointments.map(appointment => {
      const appointmentData = appointment.toJSON();
      
      // Extract doctor information - FIXED: Use doctor table name first
      let doctorName = 'Unknown Doctor';
      let doctorSpecialization = 'General';
      let doctorEmail = '';
      
      // 🔧 PRIORITY 1: Use doctor table name if available (we just fixed this!)
      if (appointment.doctorDetails && appointment.doctorDetails.name) {
        doctorName = appointment.doctorDetails.name;
        doctorSpecialization = appointment.doctorDetails.specialization || 'General';
      }
      
      // 🔧 PRIORITY 2: Fallback to user profileData if doctor table name is missing
      if (doctorName === 'Unknown Doctor' && appointment.doctorUser) {
        try {
          // profileData is already an object, no need to parse
          const profileData = appointment.doctorUser.profileData;
          doctorName = profileData?.name || 
                      profileData?.fullName || 
                      (profileData?.firstName && profileData?.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}` 
                        : profileData?.firstName || 'Unknown Doctor');
        } catch (e) {
          console.error('Error extracting doctor name:', e);
          doctorName = 'Unknown Doctor';
        }
        doctorEmail = appointment.doctorUser.email || '';
      }
      
      // 🔧 PRIORITY 3: Get specialization from doctor details
      if (appointment.doctorDetails) {
        doctorSpecialization = appointment.doctorDetails.specialization || 'General';
        doctorEmail = appointment.doctorUser?.email || '';
      }
      
      // Extract patient information
      let patientName = 'Unknown Patient';
      let patientEmail = '';
      let patientAge = null;
      let patientAgeFormatted = 'Age unknown';
      let patientDateOfBirth = null;
      
      // 🔧 PRIORITY 1: Use Patient table name first (from enhanced registration)

      
      if (appointment.patientDetails && appointment.patientDetails.name) {
        patientName = appointment.patientDetails.name;

      }
      
      // 🔧 PRIORITY 2: Fallback to User profileData if Patient table name is missing
      if (patientName === 'Unknown Patient' && appointment.dataValues.patientUser) {
        try {
          // profileData is already an object, no need to parse
          const profileData = appointment.dataValues.patientUser.profileData;
          patientName = profileData?.name || 
                       profileData?.fullName || 
                       (profileData?.firstName && profileData?.lastName 
                         ? `${profileData.firstName} ${profileData.lastName}` 
                         : profileData?.firstName || 'Unknown Patient');

        } catch (e) {
          console.error('Error extracting patient name from User profileData:', e);
          patientName = 'Unknown Patient';
        }
      }
      
      // Get patient email
      if (appointment.dataValues.patientUser) {
        patientEmail = appointment.dataValues.patientUser.email || '';
      }
      
      // 🔧 PRIORITY 3: Try patientDetails.user if both above methods fail
      if (patientName === 'Unknown Patient' && appointment.patientDetails?.user) {
        try {
          const profileData = appointment.patientDetails.user.profileData;
          patientName = profileData?.name || 
                       profileData?.fullName || 
                       (profileData?.firstName && profileData?.lastName 
                         ? `${profileData.firstName} ${profileData.lastName}` 
                         : profileData?.firstName || 'Unknown Patient');
          patientEmail = appointment.patientDetails.user.email || '';

        } catch (e) {
          console.error('Error extracting patient name from patientDetails.user:', e);
        }
      }
      
      // 🎂 CALCULATE AGE from date of birth
      if (appointment.patientDetails?.dateOfBirth) {
        patientDateOfBirth = appointment.patientDetails.dateOfBirth;
        patientAge = calculateAge(patientDateOfBirth);
        patientAgeFormatted = formatAge(patientDateOfBirth);
      } else if (appointment.dataValues.patientUser?.profileData?.dateOfBirth) {
        patientDateOfBirth = appointment.dataValues.patientUser.profileData.dateOfBirth;
        patientAge = calculateAge(patientDateOfBirth);
        patientAgeFormatted = formatAge(patientDateOfBirth);
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
          walletAddress: appointment.patientWalletAddress,
          age: patientAge,
          ageFormatted: patientAgeFormatted,
          dateOfBirth: patientDateOfBirth
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
      userId: sanitizedUserId || userId
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

    console.log('📝 Creating appointment with data:', {
      patientWalletAddress,
      doctorWalletAddress,
      appointmentDate,
      reason,
      duration,
      fee,
      serviceType: req.body.serviceType,
      paymentStatus: req.body.paymentStatus
    });

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

    // 💳 PAYMENT-FIRST POLICY ENFORCEMENT
    const appointmentFee = parseFloat(fee || 0);
    const serviceType = req.body.serviceType || 'inPerson';
    const paymentStatus = req.body.paymentStatus || 'pending';
    
    console.log('💳 Payment-first check:', { 
      originalFee: fee, 
      appointmentFee, 
      serviceType, 
      paymentStatus,
      feeType: typeof fee,
      appointmentFeeType: typeof appointmentFee
    });
    
    // 🔒 PREVENT BYPASS ATTEMPTS: If fee > 0 but trying to set as paid without actual payment
    if (appointmentFee > 0 && paymentStatus === 'paid' && !req.body.paymentConfirmedAt) {
      console.log('🚫 Blocking bypass attempt: Fee > 0 but no payment confirmation');
      return res.status(400).json({
        success: false,
        error: 'Payment required',
        message: `This appointment requires ${appointmentFee} ETB payment. Please complete payment first.`
      });
    }
    
    // Determine initial status based on payment requirement
    let initialStatus;
    let requiresApproval;
    let approvalStatus;
    
    console.log('💳 Checking fee condition:', { appointmentFee, condition: appointmentFee > 0 });
    
    if (appointmentFee > 0) {
      console.log('💰 Fee > 0 detected, checking payment status:', paymentStatus);
      // PAID APPOINTMENTS: Must be paid first
      if (paymentStatus === 'paid') {
        // Payment completed - ready for approval/scheduling
        initialStatus = 'scheduled';
        requiresApproval = serviceType !== 'inPerson'; // In-person auto-approved after payment
        approvalStatus = serviceType === 'inPerson' ? 'approved' : 'pending';
        console.log('✅ Paid appointment - creating as scheduled');
      } else {
        // Payment pending - appointment in holding state
        initialStatus = 'payment_pending';
        requiresApproval = true;
        approvalStatus = 'pending';
        console.log('🔒 Payment pending - creating as payment_pending');
      }
    } else {
      // FREE APPOINTMENTS: Can be scheduled immediately but need approval
      initialStatus = 'scheduled';
      requiresApproval = true;
      approvalStatus = 'pending';
      console.log('🆓 Free appointment - creating as scheduled');
    }
    
    console.log('💳 Final status decision:', { initialStatus, requiresApproval, approvalStatus });

    // Create appointment with payment-first enforcement
    const appointment = await Appointment.create({
      patientWalletAddress: patientWalletAddress.toLowerCase(),
      doctorWalletAddress: doctorWalletAddress.toLowerCase(),
      appointmentDate,
      reason,
      duration: duration || 30,
      fee: appointmentFee,
      status: initialStatus, // 🔒 PAYMENT-FIRST: Status depends on payment
      paymentStatus: paymentStatus,
      serviceType: serviceType,
      requiresApproval: requiresApproval,
      approvalStatus: approvalStatus,
      paymentMethod: req.body.paymentMethod || (appointmentFee > 0 ? 'chapa' : 'free'),
      // 🆕 NO-CANCEL SYSTEM: Set reschedule deadline
      rescheduleDeadline,
      canReschedule,
      rescheduleCount: 0,
      isRescheduled: false
    });

    // 🔔 Send notification based on payment-first policy
    try {
      const { sendNotification } = await import('../services/socketService.js');
      
      let notificationTitle, notificationMessage, notificationPriority;
      
      if (appointment.fee > 0) {
        if (appointment.paymentStatus === 'paid') {
          // Payment completed - notify doctor of confirmed appointment
          notificationTitle = 'New Paid Appointment Confirmed';
          notificationMessage = `Payment of ${appointment.fee} ETB confirmed. ${appointment.serviceType} appointment ready for ${appointment.approvalStatus === 'approved' ? 'consultation' : 'approval'}.`;
          notificationPriority = 'high';
        } else {
          // Payment pending - notify doctor but appointment not active yet
          notificationTitle = 'Appointment Pending Payment';
          notificationMessage = `New ${appointment.serviceType} appointment request. Waiting for ${appointment.fee} ETB payment completion.`;
          notificationPriority = 'medium';
        }
      } else {
        // Free appointment
        notificationTitle = 'New Free Appointment Request';
        notificationMessage = `New ${appointment.serviceType} appointment request. No payment required.`;
        notificationPriority = 'medium';
      }
      
      await sendNotification(
        appointment.doctorWalletAddress,
        appointment.paymentStatus === 'paid' ? 'appointment_confirmed' : 'appointment_pending_payment',
        {
          title: notificationTitle,
          message: notificationMessage,
          relatedId: appointment.id,
          priority: notificationPriority
        }
      );
      console.log(`🔔 Sent ${appointment.paymentStatus === 'paid' ? 'confirmation' : 'pending payment'} notification to doctor`);
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
      doctorWalletAddress: doctorWallet.toLowerCase(),
      // 🔒 PAYMENT-FIRST POLICY: Only show confirmed appointments
      status: {
        [Sequelize.Op.ne]: 'payment_pending' // Exclude payment pending appointments
      }
    };

    // For paid appointments, ensure payment is completed
    if (!status || status !== 'payment_pending') {
      where[Sequelize.Op.or] = [
        { fee: 0 }, // Free appointments
        { 
          fee: { [Sequelize.Op.gt]: 0 },
          paymentStatus: 'paid' // Only paid appointments for fee > 0
        }
      ];
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      where.appointmentDate = {
        [Sequelize.Op.between]: [startDate, endDate]
      };
    }

    if (status) {
      // Override the default filter if specific status requested
      delete where.status;
      delete where[Sequelize.Op.or];
      where.status = status;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          required: false,
          attributes: ['walletAddress']
        },
        {
          model: User,
          as: 'patientUser',
          required: false,
          attributes: ['email', 'profileData']
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
        [Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const availableSlots = await Appointment.findAll({
      where,
      include: [
        {
          model: Doctor,
          as: 'doctorDetails',
          required: false,
          attributes: ['walletAddress', 'specialization']
        },
        {
          model: User,
          as: 'doctorUser',
          required: false,
          attributes: ['email', 'profileData']
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

// ========== CONSENT-FIRST CONSULTATION WORKFLOW ENDPOINTS ==========

/**
 * 👨‍⚕️ Doctor requests consent from patient for consultation
 * POST /api/appointments/:id/request-consent
 */
export const requestConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      doctorWallet, 
      permissions = {
        canVideoCall: false,
        canChat: false,
        canViewHistory: true,
        canWritePrescriptions: false,
        canOrderTests: false
      },
      purpose = 'Medical consultation access',
      durationType = 'appointment_only'
    } = req.body;

    console.log('🔒 Doctor requesting consent for appointment:', id);

    // Get appointment
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
        },
        {
          model: User,
          as: 'patientUser',
          attributes: ['email', 'profileData']
        },
        {
          model: User,
          as: 'doctorUser',
          attributes: ['email', 'profileData']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify doctor owns this appointment
    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only request consent for your own appointments'
      });
    }

    // Check if appointment is paid (for premium services)
    if (appointment.paymentStatus !== 'paid' && appointment.fee > 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment required',
        message: 'Appointment payment must be confirmed before requesting consent'
      });
    }

    // Check if consent already exists
    const existingConsent = await Consent.findOne({
      where: {
        appointmentId: appointment.id,
        status: ['active', 'pending']
      }
    });

    if (existingConsent) {
      return res.status(400).json({
        success: false,
        error: 'Consent already exists',
        message: 'Consent request already exists for this appointment',
        consent: existingConsent
      });
    }

    // Create consent request
    const consent = await Consent.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      appointmentId: appointment.id,
      permissions,
      purpose,
      status: 'pending',
      scope: durationType,
      requestedAt: new Date(),
      durationType,
      durationValue: durationType === 'appointment_only' ? 1 : 24
    });

    // Update appointment workflow state
    await appointment.update({
      workflowState: 'awaiting_consent'
    });

    // 🔔 Send notification to patient
    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        appointment.patientWalletAddress,
        'consent_request',
        {
          title: 'Doctor Requests Consultation Access',
          message: `Dr. ${appointment.doctorDetails?.user?.profileData?.name || 'Unknown'} is requesting access for your consultation`,
          relatedId: appointment.id,
          consentId: consent.id,
          priority: 'high'
        }
      );
      console.log('🔔 Sent consent request notification to patient');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Consent request created');

    res.json({
      success: true,
      message: 'Consent request sent to patient',
      data: {
        consent,
        appointment: {
          id: appointment.id,
          workflowState: appointment.workflowState
        }
      }
    });
  } catch (error) {
    console.error('❌ Request consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request consent',
      message: error.message
    });
  }
};

/**
 * 👤 Patient grants consent for consultation
 * POST /api/appointments/:id/grant-consent
 */
export const grantConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      patientWallet, 
      consentId,
      permissions = null // Patient can modify permissions
    } = req.body;

    console.log('✅ Patient granting consent for appointment:', id);

    // Get appointment
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
        message: 'You can only grant consent for your own appointments'
      });
    }

    // Get consent request
    const consent = await Consent.findOne({
      where: {
        id: consentId,
        appointmentId: appointment.id,
        patientWalletAddress: patientWallet.toLowerCase(),
        status: 'pending'
      }
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        error: 'Consent request not found',
        message: 'No pending consent request found for this appointment'
      });
    }

    // Update consent with patient's permissions (if provided)
    const finalPermissions = permissions || consent.permissions;

    await consent.update({
      status: 'active',
      grantedAt: new Date(),
      permissions: finalPermissions,
      // Set expiration based on scope
      expiresAt: consent.scope === 'appointment_only' 
        ? new Date(appointment.appointmentDate.getTime() + (2 * 60 * 60 * 1000)) // 2 hours after appointment
        : new Date(Date.now() + (consent.durationValue * 60 * 60 * 1000)) // Hours from now
    });

    // Update appointment workflow state
    await appointment.update({
      workflowState: 'consent_granted'
    });

    // 🔔 Send notification to doctor
    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        appointment.doctorWalletAddress,
        'consent_granted',
        {
          title: 'Patient Granted Consultation Access',
          message: 'Patient has granted consent. Consultation can now begin.',
          relatedId: appointment.id,
          consentId: consent.id,
          priority: 'high'
        }
      );
      console.log('🔔 Sent consent granted notification to doctor');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Consent granted successfully');

    res.json({
      success: true,
      message: 'Consent granted successfully. Doctor can now start consultation.',
      data: {
        consent,
        appointment: {
          id: appointment.id,
          workflowState: appointment.workflowState
        }
      }
    });
  } catch (error) {
    console.error('❌ Grant consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant consent',
      message: error.message
    });
  }
};

/**
 * 🔍 Get consent status for appointment
 * GET /api/appointments/:id/consent-status
 */
export const getConsentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Checking consent status for appointment:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [{
        model: Consent,
        as: 'consent',
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const consentStatus = {
      appointmentId: appointment.id,
      workflowState: appointment.workflowState,
      requiresConsent: appointment.requiresConsent,
      hasConsent: !!appointment.consent,
      consent: appointment.consent ? {
        id: appointment.consent.id,
        status: appointment.consent.status,
        permissions: appointment.consent.permissions,
        grantedAt: appointment.consent.grantedAt,
        expiresAt: appointment.consent.expiresAt,
        isExpired: appointment.consent.isExpired()
      } : null
    };

    console.log('✅ Consent status retrieved');

    res.json({
      success: true,
      data: consentStatus
    });
  } catch (error) {
    console.error('❌ Get consent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consent status',
      message: error.message
    });
  }
};

/**
 * 🚫 Revoke consent (patient or doctor can revoke)
 * POST /api/appointments/:id/revoke-consent
 */
export const revokeConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { userWallet, reason = 'User requested revocation' } = req.body;

    console.log('🚫 Revoking consent for appointment:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [{
        model: Consent,
        as: 'consent',
        where: { status: 'active' },
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (!appointment.consent) {
      return res.status(404).json({
        success: false,
        error: 'No active consent found',
        message: 'No active consent exists for this appointment'
      });
    }

    // Verify user can revoke (patient or doctor)
    const canRevoke = 
      appointment.patientWalletAddress.toLowerCase() === userWallet.toLowerCase() ||
      appointment.doctorWalletAddress.toLowerCase() === userWallet.toLowerCase();

    if (!canRevoke) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only the patient or doctor can revoke consent'
      });
    }

    // Revoke consent
    await appointment.consent.update({
      status: appointment.patientWalletAddress.toLowerCase() === userWallet.toLowerCase() 
        ? 'patient_revoked' 
        : 'doctor_revoked',
      revokedAt: new Date(),
      revocationReason: reason,
      revokedBy: userWallet
    });

    // Update appointment workflow state
    await appointment.update({
      workflowState: 'scheduled' // Reset to scheduled state
    });

    // 🔔 Send notification to other party
    const notifyWallet = appointment.patientWalletAddress.toLowerCase() === userWallet.toLowerCase()
      ? appointment.doctorWalletAddress
      : appointment.patientWalletAddress;

    try {
      const { sendNotification } = await import('../services/socketService.js');
      await sendNotification(
        notifyWallet,
        'consent_revoked',
        {
          title: 'Consultation Access Revoked',
          message: 'Consent for consultation has been revoked',
          relatedId: appointment.id,
          priority: 'high'
        }
      );
      console.log('🔔 Sent consent revocation notification');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    console.log('✅ Consent revoked successfully');

    res.json({
      success: true,
      message: 'Consent revoked successfully. Consultation access has been terminated.',
      data: {
        appointmentId: appointment.id,
        workflowState: appointment.workflowState,
        revokedAt: appointment.consent.revokedAt
      }
    });
  } catch (error) {
    console.error('❌ Revoke consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke consent',
      message: error.message
    });
  }
};

/**
 * 🏥 Start consultation (checks consent first)
 * POST /api/appointments/:id/start-consultation
 */
export const startConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.body;

    console.log('🏥 Starting consultation for appointment:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [{
        model: Consent,
        as: 'consent',
        where: { 
          status: 'active',
          expiresAt: {
            [Sequelize.Op.gt]: new Date()
          }
        },
        required: false
      }]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify doctor owns this appointment
    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWallet.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only start consultations for your own appointments'
      });
    }

    // Check consent requirement
    if (appointment.requiresConsent && appointment.workflowState !== 'consent_granted') {
      return res.status(403).json({
        success: false,
        error: 'Consent required',
        message: 'Patient consent is required before starting consultation',
        workflowState: appointment.workflowState,
        action: 'request_consent'
      });
    }

    // Update appointment to consultation started
    await appointment.update({
      workflowState: 'consultation_started',
      consultationStartedAt: new Date()
    });

    console.log('✅ Consultation started successfully');

    res.json({
      success: true,
      message: 'Consultation started successfully',
      data: {
        appointmentId: appointment.id,
        workflowState: appointment.workflowState,
        consultationStartedAt: appointment.consultationStartedAt,
        permissions: appointment.consent?.permissions || {}
      }
    });
  } catch (error) {
    console.error('❌ Start consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start consultation',
      message: error.message
    });
  }
};



