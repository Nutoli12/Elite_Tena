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
export const getConsultationDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    console.log('🔍 Fetching consultation details for:', appointmentId);

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Patient,
          as: 'patientDetails',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        },
        {
          model: Doctor,
          as: 'doctorDetails',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email', 'profileData']
            }
          ]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Get patient's medical history
    const medicalHistory = await MedicalRecord.findAll({
      where: { patientWalletAddress: appointment.patientWalletAddress },
      order: [['recordDate', 'DESC']],
      limit: 5
    });

    // Get active prescriptions
    const activePrescriptions = await Prescription.findAll({
      where: {
        patientWalletAddress: appointment.patientWalletAddress,
        status: 'active'
      }
    });

    console.log('✅ Consultation details retrieved');

    res.json({
      success: true,
      data: {
        appointment,
        medicalHistory,
        activePrescriptions
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
};

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

    // Update all comprehensive fields
    await appointment.update({
      // History
      chiefComplaint: consultationData.chiefComplaint,
      historyPresentIllness: consultationData.historyPresentIllness,
      past_medical_history: consultationData.pastMedicalHistory,
      surgeries: consultationData.surgeries,
      hospitalizations: consultationData.hospitalizations,
      immunizations: consultationData.immunizations,
      family_history: consultationData.familyHistory,
      allergies: consultationData.allergies,
      current_medications: consultationData.currentMedications,
      review_of_systems: consultationData.reviewOfSystems,
      
      // Physical Exam
      vitalSigns: consultationData.vitalSigns,
      physical_exam_detailed: consultationData.physicalExamDetailed,
      
      // Tests
      test_results: consultationData.testResults,
      imaging_results: consultationData.imagingResults,
      lab_interpretation: consultationData.labInterpretation,
      
      // Diagnosis
      primary_diagnosis: consultationData.primaryDiagnosis,
      secondary_diagnoses: consultationData.secondaryDiagnoses,
      differential_diagnoses: consultationData.differentialDiagnoses,
      clinical_impression: consultationData.clinicalImpression,
      icd10_codes: consultationData.icd10Codes,
      
      // Treatment
      immediate_management: consultationData.immediateManagement,
      procedures_planned: consultationData.proceduresPlanned,
      prescriptions_issued: consultationData.prescriptionsIssued,
      treatmentPlan: consultationData.treatmentPlan,
      
      // Admission
      admission_required: consultationData.admissionRequired,
      admission_details: consultationData.admissionDetails,
      consultations_requested: consultationData.consultationsRequested,
      dietary_orders: consultationData.dietaryOrders,
      activity_orders: consultationData.activityOrders,
      
      // Follow-up
      follow_up_schedule: consultationData.followUpSchedule,
      patient_education: consultationData.patientEducation,
      education_materials_provided: consultationData.educationMaterialsProvided,
      
      // Final
      assessment_summary: consultationData.assessmentSummary,
      disposition: consultationData.disposition,
      prognosis: consultationData.prognosis,
      additional_notes: consultationData.additionalNotes,
      
      // Metadata
      consultation_phase: consultationData.consultationPhase,
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
      ...consultationData,
      status: 'completed',
      checkInStatus: 'completed',
      consultationEndedAt: endTime,
      consultation_duration: duration,
      consultation_phase: 'completed',
      record_locked: true,
      signed_at: new Date(),
      digital_signature: `DR_${appointment.doctorWalletAddress}_${Date.now()}`
    });

    // Create comprehensive medical record
    const medicalRecord = await MedicalRecord.create({
      patientWalletAddress: appointment.patientWalletAddress,
      doctorWalletAddress: appointment.doctorWalletAddress,
      recordType: 'comprehensive_consultation',
      title: `Consultation - ${new Date().toLocaleDateString()}`,
      diagnosis: consultationData.primaryDiagnosis?.description || 'See full record',
      treatment: consultationData.treatmentPlan || 'See full record',
      symptoms: consultationData.chiefComplaint ? [consultationData.chiefComplaint] : [],
      notes: consultationData.assessmentSummary,
      visitDate: new Date(),
      recordDate: new Date(),
      metadata: {
        consultationDuration: duration,
        icd10Codes: consultationData.icd10Codes,
        vitalSigns: consultationData.vitalSigns,
        testResults: consultationData.testResults,
        prescriptions: consultationData.prescriptionsIssued,
        admissionRequired: consultationData.admissionRequired,
        disposition: consultationData.disposition
      }
    });

    // Create prescriptions in database
    if (consultationData.prescriptionsIssued && consultationData.prescriptionsIssued.length > 0) {
      await Promise.all(consultationData.prescriptionsIssued.map(rx => 
        Prescription.create({
          patientWalletAddress: appointment.patientWalletAddress,
          doctorWalletAddress: appointment.doctorWalletAddress,
          medication: rx.name,
          dosage: rx.dose,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: `${rx.name} ${rx.dose} ${rx.frequency}`,
          status: 'active',
          prescribedDate: new Date()
        })
      ));
    }

    // Create follow-up appointment if scheduled
    if (consultationData.followUpSchedule?.postDischarge) {
      // Parse follow-up schedule and create appointment
      // This is a simplified version - you can enhance it
      console.log('📅 Follow-up scheduled:', consultationData.followUpSchedule.postDischarge);
    }

    console.log('✅ Consultation finalized and medical record created');

    res.json({
      success: true,
      message: 'Consultation completed and signed',
      data: {
        appointment,
        medicalRecord,
        duration,
        prescriptionsCreated: consultationData.prescriptionsIssued?.length || 0
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
