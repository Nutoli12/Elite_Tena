import db from '../models/index.js';
const { Appointment, Patient, Doctor, User, MedicalRecord, Prescription } = db;

/**
 * 🩺 CONSULTATION CONTROLLER
 * Handles the complete consultation workflow
 */

/**
 * Start a consultation
 */
export const startConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorWalletAddress } = req.body;

    console.log('🩺 Starting consultation for appointment:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    if (appointment.doctorWalletAddress.toLowerCase() !== doctorWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Not your appointment'
      });
    }

    // Update appointment status
    await appointment.update({
      status: 'in_progress',
      checkInStatus: 'in_progress',
      consultationStartedAt: new Date()
    });

    console.log('✅ Consultation started');

    res.json({
      success: true,
      message: 'Consultation started',
      data: appointment
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

/**
 * Update consultation notes (auto-save)
 */
export const updateConsultationNotes = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      consultationNotes,
      chiefComplaint,
      historyPresentIllness,
      examFindings,
      vitalSigns,
      provisionalDiagnosis
    } = req.body;

    console.log('📝 Updating consultation notes for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Update notes
    await appointment.update({
      consultationNotes,
      chiefComplaint,
      historyPresentIllness,
      examFindings,
      vitalSigns,
      provisionalDiagnosis
    });

    console.log('✅ Notes updated');

    res.json({
      success: true,
      message: 'Notes saved',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Update notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notes',
      message: error.message
    });
  }
};

/**
 * Complete consultation
 */
export const completeConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      doctorWalletAddress,
      finalDiagnosis,
      icd10Codes,
      treatmentPlan,
      prescriptions,
      followUpRequired,
      followUpDate
    } = req.body;

    console.log('✅ Completing consultation for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Patient,
          as: 'patientDetails'
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Calculate duration
    const startTime = new Date(appointment.consultationStartedAt);
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 60000); // minutes

    // Update appointment
    await appointment.update({
      status: 'completed',
      checkInStatus: 'completed',
      consultationEndedAt: endTime,
      consultationDuration: duration,
      finalDiagnosis,
      icd10Codes,
      treatmentPlan
    });

    // Create medical record
    const medicalRecord = await MedicalRecord.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: doctorWalletAddress,
      recordType: 'consultation',
      diagnosis: finalDiagnosis,
      symptoms: appointment.chiefComplaint ? [appointment.chiefComplaint] : [],
      treatment: treatmentPlan,
      notes: appointment.consultationNotes,
      vitalSigns: appointment.vitalSigns,
      recordDate: new Date(),
      ipfsHash: null // Will be uploaded later if needed
    });

    // Create prescriptions if provided
    if (prescriptions && prescriptions.length > 0) {
      await Promise.all(prescriptions.map(rx =>
        Prescription.create({
          patientWalletAddress: appointment.patientWalletAddress,
          doctorWalletAddress: doctorWalletAddress,
          medication: rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions,
          status: 'active',
          prescribedDate: new Date()
        })
      ));
    }

    // Create follow-up if required
    if (followUpRequired && followUpDate) {
      await Appointment.create({
        patientWalletAddress: appointment.patientWalletAddress,
        doctorWalletAddress: doctorWalletAddress,
        appointmentDate: followUpDate,
        reason: `Follow-up for: ${finalDiagnosis}`,
        serviceType: 'inPerson',
        status: 'scheduled',
        fee: 0
      });
    }

    console.log('✅ Consultation completed successfully');

    res.json({
      success: true,
      message: 'Consultation completed',
      data: {
        appointment,
        medicalRecord,
        duration
      }
    });

  } catch (error) {
    console.error('❌ Complete consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete consultation',
      message: error.message
    });
  }
};

/**
 * Get consultation details
 */
/**
 * Get consultation details
 */

/**
 * Get consultation details (SIMPLIFIED VERSION)
 */
export const getConsultationDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    console.log('🔍 Fetching consultation details for:', appointmentId);

    // Simple query without complex associations
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Get basic patient info
    let patient = null;
    try {
      patient = await Patient.findOne({
        where: { walletAddress: appointment.patientWalletAddress }
      });
    } catch (error) {
      console.log('⚠️ Could not fetch patient details');
    }

    // Get basic doctor info
    let doctor = null;
    try {
      doctor = await Doctor.findOne({
        where: { walletAddress: appointment.doctorWalletAddress }
      });
    } catch (error) {
      console.log('⚠️ Could not fetch doctor details');
    }

    // Get recent medical records (simplified)
    let medicalHistory = [];
    try {
      medicalHistory = await MedicalRecord.findAll({
        where: { patientWalletAddress: appointment.patientWalletAddress },
        order: [['recordDate', 'DESC']],
        limit: 3
      });
    } catch (error) {
      console.log('⚠️ Could not fetch medical history');
    }

    console.log('✅ Successfully fetched consultation details');

    res.json({
      success: true,
      data: {
        appointment,
        patient: patient ? {
          walletAddress: patient.walletAddress,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone
        } : null,
        doctor: doctor ? {
          walletAddress: doctor.walletAddress,
          name: doctor.name,
          specialization: doctor.specialization
        } : null,
        medicalHistory: medicalHistory || [],
        activePrescriptions: [], // Simplified for now
        consultationStarted: !!appointment.consultationStartedAt,
        consultationNotes: appointment.consultationNotes || ''
      }
    });

  } catch (error) {
    console.error('❌ Get consultation details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultation details',
      message: error.message
    });
  }
};;

/**
 * Update comprehensive consultation data (auto-save)
 */
/**
 * Update comprehensive consultation data (auto-save)
 */
export const updateComprehensiveConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const consultationData = req.body;

    console.log('📝 Updating comprehensive consultation for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Update consultation details JSON
    await appointment.update({
      consultationDetails: consultationData,
      consultationNotes: consultationData.finalNotes, // Sync specific fields if needed
      last_auto_save: new Date()
    });

    console.log('✅ Comprehensive consultation updated');

    res.json({
      success: true,
      message: 'Consultation data saved',
      data: appointment
    });

  } catch (error) {
    console.error('❌ Update comprehensive consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consultation',
      message: error.message
    });
  }
};

/**
 * Finalize and sign comprehensive consultation
 */
/**
 * Finalize and sign comprehensive consultation
 */
export const finalizeComprehensiveConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const consultationData = req.body;

    console.log('✅ Finalizing comprehensive consultation for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [{ model: User, as: 'user' }]
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Calculate duration
    const startTime = new Date(appointment.consultationStartedAt);
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000); // seconds

    // Update appointment with final data
    await appointment.update({
      consultationDetails: consultationData, // Save final state
      status: 'completed',
      checkInStatus: 'completed',
      consultationEndedAt: endTime,
      consultationDuration: duration, // Fixed field name
      consultationNotes: consultationData.finalNotes,
      finalDiagnosis: consultationData.diagnosis?.primary,
      treatmentPlan: consultationData.treatment?.immediate
    });

    // Create comprehensive medical record
    const medicalRecord = await MedicalRecord.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      recordType: 'comprehensive_consultation',
      title: `Consultation - ${new Date().toLocaleDateString()}`,
      description: `Comprehensive consultation with ${appointment.doctorDetails?.user?.profileData?.fullName || 'Doctor'}`,
      diagnosis: consultationData.diagnosis?.primary || 'See details',
      symptoms: consultationData.chiefComplaint ? [consultationData.chiefComplaint] : [],
      visitDate: new Date(),
      metadata: consultationData // Store the full structured data here
    });

    // Create prescriptions in database (optional, if you want separate records)
    // ... (Prescription creation logic can remain if needed)

    console.log('✅ Consultation finalized and medical record created');

    res.json({
      success: true,
      message: 'Consultation completed and signed',
      data: {
        appointment,
        medicalRecord,
        duration
      }
    });

  } catch (error) {
    console.error('❌ Finalize consultation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize consultation',
      message: error.message
    });
  }
};
