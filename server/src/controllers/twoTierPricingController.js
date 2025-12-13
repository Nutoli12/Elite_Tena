/**
 * Two-Tier Pricing Controller
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 8.1: TwoTierPricingController**
 * **Requirements: 1.1, 1.2, 2.5**
 * 
 * Handles enhanced functionality for two-tier pricing system including
 * pricing CRUD operations, market rate API endpoints, and pricing analytics.
 */

import { Op } from 'sequelize';
import { PricingEngine } from '../services/PricingEngine.js';
import { AuditService } from '../services/AuditService.js';
import db from '../models/index.js';

// Initialize services
const pricingEngine = new PricingEngine(db);
const auditService = new AuditService(db, null); // Will be initialized with notification service later

/**
 * Get doctor's current pricing settings
 * GET /api/two-tier-pricing/doctor/pricing
 */
export const getDoctorPricing = async (req, res) => {
    try {
      const { doctorId } = req.params;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const pricingData = await this.pricingEngine.getDoctorPricing(doctorId);
      
      if (!pricingData) {
        return res.status(404).json({
          success: false,
          error: 'Pricing data not found'
        });
      }

      // Get market context
      const marketContext = await this.pricingEngine.getMarketContext(doctorId);

      res.json({
        success: true,
        data: {
          ...pricingData,
          market_context: marketContext
        }
      });
    } catch (error) {
      console.error('Get doctor pricing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pricing data'
      });
    }
  }

  /**
   * Update doctor's pricing settings
   * PUT /api/two-tier-pricing/doctor/pricing
   */
  async updateDoctorPricing(req, res) {
    try {
      const { doctorId } = req.params;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;
      const { video_call_fee, chat_fee, reason } = req.body;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get current pricing for audit trail
      const currentPricing = await this.pricingEngine.getDoctorPricing(doctorId);

      // Validate pricing ranges
      const validationResult = await this.pricingEngine.validatePricingUpdate({
        doctorId,
        video_call_fee,
        chat_fee,
        currentPricing
      });

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: validationResult.error,
          validation_details: validationResult.details
        });
      }

      // Update pricing
      const updateResult = await this.pricingEngine.updateDoctorPricing({
        doctorId,
        video_call_fee,
        chat_fee,
        updated_by: requestingDoctorId,
        reason,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      // Log pricing change for audit
      await this.auditService.logPricingChange({
        doctor_id: doctorId,
        changed_by: requestingDoctorId,
        action: 'update',
        old_values: currentPricing,
        new_values: {
          video_call_fee,
          chat_fee
        },
        reason,
        market_context: validationResult.market_context,
        approval_status: 'approved',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });

      // Send notification to doctor
      if (this.notificationService) {
        await this.notificationService.sendNotification({
          user_id: doctorId,
          type: 'pricing_updated',
          title: 'Pricing Updated',
          message: 'Your premium service pricing has been updated successfully',
          data: {
            video_call_fee,
            chat_fee,
            updated_at: new Date()
          }
        });
      }

      res.json({
        success: true,
        data: updateResult,
        message: 'Pricing updated successfully'
      });
    } catch (error) {
      console.error('Update doctor pricing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pricing'
      });
    }
  }

  /**
   * Get market rate analytics
   * GET /api/two-tier-pricing/market-rates
   */
  async getMarketRates(req, res) {
    try {
      const { 
        specialization, 
        service_type, 
        experience_level,
        location 
      } = req.query;

      const marketRates = await this.pricingEngine.getMarketRateAnalytics({
        specialization,
        service_type,
        experience_level,
        location
      });

      res.json({
        success: true,
        data: marketRates
      });
    } catch (error) {
      console.error('Get market rates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve market rates'
      });
    }
  }

  /**
   * Get pricing analytics for doctor dashboard
   * GET /api/two-tier-pricing/doctor/analytics
   */
  async getDoctorPricingAnalytics(req, res) {
    try {
      const { doctorId } = req.params;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;
      const { period = '30d' } = req.query;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const analytics = await this.pricingEngine.getDoctorPricingAnalytics({
        doctorId,
        period
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get doctor pricing analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pricing analytics'
      });
    }
  }

  /**
   * Get enhanced doctor listing for patients
   * GET /api/two-tier-pricing/doctors/enhanced-listing
   */
  async getEnhancedDoctorListing(req, res) {
    try {
      const {
        specialization,
        service_type,
        min_rating,
        max_price,
        min_price,
        availability,
        sort_by = 'rating',
        sort_order = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        specialization,
        service_type,
        min_rating: min_rating ? parseFloat(min_rating) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        min_price: min_price ? parseFloat(min_price) : undefined,
        availability,
        sort_by,
        sort_order,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const doctorListing = await this.pricingEngine.getEnhancedDoctorListing(filters);

      res.json({
        success: true,
        data: doctorListing.doctors,
        pagination: doctorListing.pagination,
        filters_applied: filters
      });
    } catch (error) {
      console.error('Get enhanced doctor listing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve doctor listing'
      });
    }
  }

  /**
   * Get market insights for patient interface
   * GET /api/two-tier-pricing/market-insights
   */
  async getMarketInsights(req, res) {
    try {
      const { specialization } = req.query;

      const insights = await this.pricingEngine.getMarketInsights({
        specialization
      });

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Get market insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve market insights'
      });
    }
  }

  /**
   * Get pricing history for doctor
   * GET /api/two-tier-pricing/doctor/pricing-history
   */
  async getDoctorPricingHistory(req, res) {
    try {
      const { doctorId } = req.params;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;
      const { limit = 50, offset = 0 } = req.query;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const history = await this.pricingEngine.getDoctorPricingHistory({
        doctorId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get doctor pricing history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pricing history'
      });
    }
  }

  /**
   * Validate pricing before update
   * POST /api/two-tier-pricing/validate-pricing
   */
  async validatePricing(req, res) {
    try {
      const { doctorId, video_call_fee, chat_fee } = req.body;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const validationResult = await this.pricingEngine.validatePricingUpdate({
        doctorId,
        video_call_fee,
        chat_fee
      });

      res.json({
        success: true,
        validation: validationResult
      });
    } catch (error) {
      console.error('Validate pricing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate pricing'
      });
    }
  }

  /**
   * Get pricing recommendations for doctor
   * GET /api/two-tier-pricing/doctor/recommendations
   */
  async getPricingRecommendations(req, res) {
    try {
      const { doctorId } = req.params;
      const requestingDoctorId = req.user?.id || req.body?.doctorId;

      // Verify doctor access
      if (doctorId !== requestingDoctorId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const recommendations = await this.pricingEngine.getPricingRecommendations({
        doctorId
      });

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Get pricing recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pricing recommendations'
      });
    }
  }

  /**
   * Admin: Get system-wide pricing analytics
   * GET /api/two-tier-pricing/admin/system-analytics
   */
  async getSystemPricingAnalytics(req, res) {
    try {
      // Verify admin access
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { period = '30d' } = req.query;

      const systemAnalytics = await this.pricingEngine.getSystemPricingAnalytics({
        period
      });

      res.json({
        success: true,
        data: systemAnalytics
      });
    } catch (error) {
      console.error('Get system pricing analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system analytics'
      });
    }
  }

  /**
   * Admin: Update standard tier pricing
   * PUT /api/two-tier-pricing/admin/standard-pricing
   */
  async updateStandardPricing(req, res) {
    try {
      // Verify admin access
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { in_person_fee, reason } = req.body;
      const adminId = req.user?.id;

      // Validate fee
      if (!in_person_fee || in_person_fee < 100 || in_person_fee > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Standard fee must be between 100 and 1000 ETB'
        });
      }

      // Get current standard pricing for audit
      const currentStandardPricing = await this.pricingEngine.getStandardPricing();

      // Update standard pricing
      const updateResult = await this.pricingEngine.updateStandardPricing({
        in_person_fee,
        updated_by: adminId,
        reason,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      // Log pricing change for audit
      await this.auditService.logPricingChange({
        doctor_id: 'system',
        changed_by: adminId,
        action: 'update_standard',
        old_values: currentStandardPricing,
        new_values: { in_person_fee },
        reason,
        approval_status: 'approved',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });

      // Notify all doctors of the change
      if (this.notificationService) {
        await this.notificationService.broadcastToRole({
          role: 'doctor',
          type: 'standard_pricing_updated',
          title: 'Standard Pricing Updated',
          message: `Standard consultation fee updated to ${in_person_fee} ETB`,
          data: {
            new_fee: in_person_fee,
            effective_date: new Date(),
            reason
          }
        });
      }

      res.json({
        success: true,
        data: updateResult,
        message: 'Standard pricing updated successfully'
      });
    } catch (error) {
      console.error('Update standard pricing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update standard pricing'
      });
    }
  }
}

export default TwoTierPricingController;