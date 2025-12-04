import db from '../models/index.js';
import crypto from 'crypto';
const { Appointment, Patient, Doctor, User, Notification } = db;

/**
 * 🆕 PHASE 4: Generate QR code data for appointment
 */
export const generateQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Generate QR code data (JSON string)
    const qrData = {
      appointmentId: appointment.id,
      patientWallet: appointment.patientWalletAddress,
      doctorWallet: appointment.doctorWalletAddress,
      date: appointment.appointmentDate,
      checksum: crypto
        .createHash('sha256')
        .update(`${appointment.id}-${appointment.patientWalletAddress}`)
        .digest('hex')
        .substring(0, 16)
    };

    const qrCodeData = JSON.stringify(qrData);

    // Save QR code data to appointment
    await appointment.update({ qrCodeData });

    console.log('✅ QR code generated for appointment:', id);

    res.json({
      success: true,
      data: {
        qrCodeData,
        qrDataObject: qrData
      }
    });

  } catch (error) {
    console.error('❌ Generate QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Check in patient (scan QR or manual)
 */
export const checkInPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { receptionStaff, qrData } = req.body;

    console.log('✅ Checking in patient for appointment:', id);

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'profileData']
          }]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify QR code if provided
    if (qrData) {
      try {
        const scannedData = JSON.parse(qrData);
        if (scannedData.appointmentId !== appointment.id) {
          return res.status(400).json({
            success: false,
            error: 'Invalid QR code for this appointment'
          });
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format'
        });
      }
    }

    // Get today's queue number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.count({
      where: {
        doctorWalletAddress: appointment.doctorWalletAddress,
        checkedInAt: {
          [db.Sequelize.Op.between]: [today, tomorrow]
        }
      }
    });

    const queueNumber = todayAppointments + 1;

    // Check in patient
    await appointment.update({
      checkInStatus: 'checked_in',
      checkedInAt: new Date(),
      checkedInBy: receptionStaff || 'reception',
      queueNumber,
      status: 'checked_in'
    });

    // Notify doctor
    await Notification.create({
      userId: appointment.doctorWalletAddress,
      title: 'Patient Checked In',
      message: `Patient ${appointment.patientDetails?.user?.profileData?.fullName || 'Unknown'} has checked in. Queue #${queueNumber}`,
      type: 'patient_checked_in',
      relatedId: appointment.id
    });

    console.log(`✅ Patient checked in. Queue number: ${queueNumber}`);

    res.json({
      success: true,
      message: 'Patient checked in successfully',
      data: {
        ...appointment.toJSON(),
        queueNumber
      }
    });

  } catch (error) {
    console.error('❌ Check in error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in patient',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Scan QR code and check in
 */
export const scanQRAndCheckIn = async (req, res) => {
  try {
    const { qrData, receptionStaff } = req.body;

    console.log('📱 Scanning QR code for check-in');

    // Parse QR data
    let scannedData;
    try {
      scannedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format'
      });
    }

    const { appointmentId, checksum } = scannedData;

    // Find appointment
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify checksum
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(`${appointment.id}-${appointment.patientWalletAddress}`)
      .digest('hex')
      .substring(0, 16);

    if (checksum !== expectedChecksum) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code - checksum mismatch'
      });
    }

    // Check in using the existing function logic
    return checkInPatient(
      { params: { id: appointmentId }, body: { receptionStaff, qrData } },
      res
    );

  } catch (error) {
    console.error('❌ Scan QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan QR code',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Get checked-in patients
 */
export const getCheckedInPatients = async (req, res) => {
  try {
    const { doctorWallet } = req.query;

    console.log('🔍 Fetching checked-in patients');

    const where = {
      checkInStatus: {
        [db.Sequelize.Op.in]: ['checked_in', 'waiting']
      }
    };

    if (doctorWallet) {
      where.doctorWalletAddress = doctorWallet.toLowerCase();
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'profileData']
          }]
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'profileData']
          }]
        }
      ],
      order: [['queueNumber', 'ASC']]
    });

    console.log(`✅ Found ${appointments.length} checked-in patients`);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('❌ Get checked-in patients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checked-in patients',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Get waiting room queue
 */
export const getWaitingRoom = async (req, res) => {
  try {
    const { doctorWallet } = req.query;

    console.log('🔍 Fetching waiting room queue');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      checkInStatus: {
        [db.Sequelize.Op.in]: ['checked_in', 'waiting', 'in_progress']
      },
      checkedInAt: {
        [db.Sequelize.Op.between]: [today, tomorrow]
      }
    };

    if (doctorWallet) {
      where.doctorWalletAddress = doctorWallet.toLowerCase();
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['profileData']
          }]
        }
      ],
      order: [['queueNumber', 'ASC']],
      attributes: ['id', 'queueNumber', 'checkInStatus', 'checkedInAt', 'estimatedWaitTime']
    });

    console.log(`✅ Found ${appointments.length} patients in waiting room`);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('❌ Get waiting room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waiting room',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Doctor calls patient (start consultation)
 */
export const callPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorWallet } = req.body;

    console.log('📞 Doctor calling patient for appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Update status to in progress
    await appointment.update({
      checkInStatus: 'in_progress',
      consultationStartedAt: new Date(),
      status: 'in_progress'
    });

    // Notify patient (if they have a mobile app)
    await Notification.create({
      userId: appointment.patientWalletAddress,
      title: 'Doctor Ready',
      message: 'The doctor is ready to see you now. Please proceed to consultation room.',
      type: 'doctor_ready',
      relatedId: appointment.id
    });

    console.log('✅ Patient called for consultation');

    res.json({
      success: true,
      message: 'Patient called successfully',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Call patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to call patient',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Complete appointment
 */
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, prescriptions, labOrders } = req.body;

    console.log('✅ Completing appointment:', id);

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Complete appointment
    await appointment.update({
      checkInStatus: 'completed',
      consultationEndedAt: new Date(),
      status: 'completed',
      notes: notes || appointment.notes
    });

    // Notify patient
    await Notification.create({
      userId: appointment.patientWalletAddress,
      title: 'Consultation Complete',
      message: 'Your consultation is complete. Check your prescriptions and lab orders.',
      type: 'consultation_complete',
      relatedId: appointment.id
    });

    console.log('✅ Appointment completed');

    res.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment,
        prescriptions: prescriptions || [],
        labOrders: labOrders || []
      }
    });

  } catch (error) {
    console.error('❌ Complete appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete appointment',
      message: error.message
    });
  }
};

/**
 * 🆕 PHASE 4: Get patient queue for doctor
 */
export const getDoctorQueue = async (req, res) => {
  try {
    const { doctorWallet } = req.params;

    console.log('🔍 Fetching queue for doctor:', doctorWallet);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.findAll({
      where: {
        doctorWalletAddress: doctorWallet.toLowerCase(),
        checkedInAt: {
          [db.Sequelize.Op.between]: [today, tomorrow]
        },
        checkInStatus: {
          [db.Sequelize.Op.ne]: 'completed'
        }
      },
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email', 'profileData']
          }]
        }
      ],
      order: [['queueNumber', 'ASC']]
    });

    console.log(`✅ Found ${appointments.length} patients in queue`);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('❌ Get doctor queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor queue',
      message: error.message
    });
  }
};
