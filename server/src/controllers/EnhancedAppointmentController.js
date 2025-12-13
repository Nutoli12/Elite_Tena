import db from '../models/index.js';
import SmartApprovalEngine from '../services/SmartApprovalEngine.js';

const { EnhancedAppointment, DoctorServicePricing } = db;

class EnhancedAppointmentController {

  /**
   * Get doctor's service pricing
   */
  static async getDoctorPricing(req, res) {
    try {
      const { doctorWallet } = req.params;
      
      let pricing = await DoctorServicePricing.findOne({
        where: { doctorWallet }
      });

      if (!pricing) {
        // Create default pricing for new doctor
        pricing = await DoctorServicePricing.create({
          doctorWallet,
          inPersonFee: 400.00,
          videoCallFee: 2000.00,
          chatFee: 1000.00
        });
      }

      res.json({
        success: true,
        data: pricing.toJSON()
      });
      
    } catch (error) {
      console.error('Get doctor pricing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update doctor's service pricing
   */
  static async updateDoctorPricing(req, res) {
    try {
      const { doctorWallet } = req.params;
      const { videoCallFee, chatFee, acceptsInPerson, acceptsVideoCalls, acceptsChat, autoApproveExactPayments } = req.body;

      // Validate doctor ownership
      if (req.user.wallet_address !== doctorWallet) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Can only update your own pricing'
        });
      }

      let pricing = await DoctorServicePricing.findOne({
        where: { doctorWallet }
      });

      if (!pricing) {
        pricing = await DoctorServicePricing.create({
          doctorWallet,
          doctorId: req.user.id
        });
      }

      // Update pricing (in-person fee is fixed by admin)
      if (videoCallFee !== undefined) pricing.videoCallFee = videoCallFee;
      if (chatFee !== undefined) pricing.chatFee = chatFee;
      if (acceptsInPerson !== undefined) pricing.acceptsInPerson = acceptsInPerson;
      if (acceptsVideoCalls !== undefined) pricing.acceptsVideoCalls = acceptsVideoCalls;
      if (acceptsChat !== undefined) pricing.acceptsChat = acceptsChat;
      if (autoApproveExactPayments !== undefined) pricing.autoApproveExactPayments = autoApproveExactPayments;

      await pricing.save();

      res.json({
        success: true,
        data: pricing.toJSON(),
        message: 'Pricing updated successfully'
      });
      
    } catch (error) {
      console.error('Update doctor pricing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create new appointment (Step 1-3: Department → Doctor → Schedule)
   */
  static async createAppointment(req, res) {
    console.log('🚀 ENHANCED APPOINTMENT CONTROLLER CALLED!');
    try {
      console.log('🔍 Create appointment request:', {
        user: req.user,
        body: req.body,
        headers: req.headers.authorization
      });
      
      const { 
        doctorWallet, 
        appointmentDate, 
        serviceType, 
        duration, 
        reason 
      } = req.body;

      // Get doctor's pricing
      const doctorPricing = await DoctorServicePricing.findOne({
        where: { doctorWallet }
      });

      console.log('🔍 Doctor pricing found:', {
        doctorWallet,
        found: !!doctorPricing,
        acceptsInPerson: doctorPricing?.acceptsInPerson,
        raw: doctorPricing?.dataValues
      });

      if (!doctorPricing) {
        return res.status(404).json({
          success: false,
          error: 'Doctor pricing not found'
        });
      }

      // Check if doctor accepts this service type - DIRECT CHECK
      let acceptsService = false;
      switch (serviceType) {
        case 'in_person':
        case 'inPerson':
        case 'in-person':
          acceptsService = doctorPricing.acceptsInPerson;
          break;
        case 'video_call':
        case 'videoCall':
        case 'video-call':
          acceptsService = doctorPricing.acceptsVideoCalls;
          break;
        case 'chat':
          acceptsService = doctorPricing.acceptsChat;
          break;
        default:
          acceptsService = false;
      }
      
      console.log('🔍 Direct service acceptance check:', {
        serviceType,
        acceptsInPerson: doctorPricing.acceptsInPerson,
        acceptsVideoCalls: doctorPricing.acceptsVideoCalls,
        acceptsChat: doctorPricing.acceptsChat,
        acceptsService
      });
      
      if (!acceptsService) {
        return res.status(400).json({
          success: false,
          error: `Doctor does not accept ${serviceType.replace('_', ' ')} appointments`
        });
      }

      // Get expected fee for service
      const expectedFee = doctorPricing.getFeeForService(serviceType);

      // Create appointment
      const appointment = await EnhancedAppointment.create({
        patientWallet: req.user.wallet_address,
        doctorWallet,
        patientId: req.user.id,
        doctorId: doctorPricing.doctorId,
        appointmentDate,
        serviceType,
        duration: duration || 30,
        reason,
        expectedFee,
        paymentStatus: 'pending',
        approvalStatus: 'pending'
      });

      res.json({
        success: true,
        data: {
          appointment: appointment.toJSON(),
          paymentRequired: {
            amount: expectedFee,
            serviceType,
            doctorWallet,
            message: `Payment required: ${expectedFee} ETB for ${serviceType.replace('_', ' ')} consultation`
          }
        },
        message: 'Appointment created. Please proceed to payment.'
      });
      
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process payment (Step 4: Payment)
   */
  static async processPayment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { amount, paymentReference, paymentMethod } = req.body;

      const appointment = await EnhancedAppointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }

      // Validate patient ownership
      if (appointment.patientId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Not your appointment'
        });
      }

      // Process payment through Smart Approval Engine
      const result = await SmartApprovalEngine.processPayment(appointmentId, {
        amount,
        reference: paymentReference,
        method: paymentMethod || 'chapa'
      });

      res.json({
        success: true,
        data: result,
        message: result.type === 'auto_approved' ? 
          'Payment successful! Appointment automatically confirmed.' :
          'Payment successful! Appointment sent to doctor for review.'
      });
      
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get appointments for doctor review
   */
  static async getDoctorAppointments(req, res) {
    try {
      const { status } = req.query;
      const doctorWallet = req.user.wallet_address;

      let whereCondition = { doctorWallet };
      
      if (status) {
        whereCondition.approvalStatus = status;
      }

      const appointments = await EnhancedAppointment.findAll({
        where: whereCondition,
        order: [['created_at', 'DESC']],
        limit: 50
      });

      // Get approval stats
      const stats = await SmartApprovalEngine.getApprovalStats(doctorWallet);

      res.json({
        success: true,
        data: {
          appointments: appointments.map(apt => apt.toJSON()),
          stats: stats.stats,
          total: appointments.length
        }
      });
      
    } catch (error) {
      console.error('Get doctor appointments error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Manually approve appointment
   */
  static async approveAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { notes } = req.body;

      const result = await SmartApprovalEngine.manualApprove(
        appointmentId, 
        req.user.id, 
        notes
      );

      res.json({
        success: true,
        data: result,
        message: 'Appointment approved successfully'
      });
      
    } catch (error) {
      console.error('Approve appointment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reject appointment
   */
  static async rejectAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      const result = await SmartApprovalEngine.rejectAppointment(
        appointmentId, 
        req.user.id, 
        reason
      );

      res.json({
        success: true,
        data: result,
        message: 'Appointment rejected. Refund will be processed if applicable.'
      });
      
    } catch (error) {
      console.error('Reject appointment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get patient appointments
   */
  static async getPatientAppointments(req, res) {
    try {
      const patientWallet = req.user.wallet_address;

      const appointments = await EnhancedAppointment.findAll({
        where: { patientWallet },
        order: [['created_at', 'DESC']],
        limit: 50
      });

      res.json({
        success: true,
        data: {
          appointments: appointments.map(apt => apt.toJSON()),
          total: appointments.length
        }
      });
      
    } catch (error) {
      console.error('Get patient appointments error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get appointment details
   */
  static async getAppointmentDetails(req, res) {
    try {
      const { appointmentId } = req.params;

      const appointment = await EnhancedAppointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }

      // Check access permissions
      const hasAccess = appointment.patientId === req.user.id || 
                       appointment.doctorId === req.user.id;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Access denied'
        });
      }

      res.json({
        success: true,
        data: appointment.toJSON()
      });
      
    } catch (error) {
      console.error('Get appointment details error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all doctors with their pricing
   */
  static async getDoctorsWithPricing(req, res) {
    try {
      const { department } = req.query;
      
      // This would typically join with a users table to get doctor info
      // For now, returning pricing data
      let whereCondition = {};
      
      const doctorPricings = await DoctorServicePricing.findAll({
        where: whereCondition,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          doctors: doctorPricings.map(pricing => pricing.toJSON()),
          total: doctorPricings.length
        }
      });
      
    } catch (error) {
      console.error('Get doctors with pricing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default EnhancedAppointmentController;