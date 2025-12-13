/**
 * Two-Tier Pricing Controller - Simplified Version
 * 
 * Basic implementation to get the enhanced pricing system working
 */

import db from '../models/index.js';

/**
 * Get system pricing configuration
 * GET /api/two-tier-pricing/system/config
 */
export const getSystemPricingConfig = async (req, res) => {
  try {
    const config = {
      standard_tier: {
        in_person_fee: 400,
        description: "Fixed fee for in-person consultations",
        approval_type: "manual"
      },
      premium_tier: {
        min_fee: 2000,
        max_fee: 20000,
        description: "Doctor-set pricing for video calls and chat",
        approval_type: "automatic"
      },
      supported_services: ["in_person", "video_call", "chat"],
      payment_methods: ["chapa", "telebirr", "cbe_birr"]
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system configuration'
    });
  }
};

/**
 * Get enhanced doctor listing for patients
 * GET /api/two-tier-pricing/doctors/enhanced-listing
 */
export const getEnhancedDoctorListing = async (req, res) => {
  try {
    // Mock data for now - in production this would query the database
    const doctors = [
      {
        doctor_id: "doc_001",
        doctor_name: "Dr. Sarah Johnson",
        specialization: "Cardiology",
        experience: "10+ years",
        rating: 4.8,
        total_reviews: 156,
        location: "Addis Ababa",
        verified: true,
        services: {
          in_person: { 
            fee: 400, 
            set_by: "system", 
            auto_approve: false,
            market_position: "at_market",
            next_available: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          video_call: { 
            fee: 5000, 
            set_by: "doctor", 
            auto_approve: true,
            market_position: "above_market",
            next_available: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          },
          chat: { 
            fee: 3000, 
            set_by: "doctor", 
            auto_approve: true,
            market_position: "at_market",
            next_available: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        },
        availability_status: "available",
        response_time: "< 2 hours",
        success_rate: 0.95
      },
      {
        doctor_id: "doc_002",
        doctor_name: "Dr. Michael Chen",
        specialization: "Dermatology",
        experience: "8+ years",
        rating: 4.6,
        total_reviews: 89,
        location: "Addis Ababa",
        verified: true,
        services: {
          in_person: { 
            fee: 400, 
            set_by: "system", 
            auto_approve: false,
            market_position: "at_market",
            next_available: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          },
          video_call: { 
            fee: 4500, 
            set_by: "doctor", 
            auto_approve: true,
            market_position: "at_market",
            next_available: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          }
        },
        availability_status: "available",
        response_time: "< 1 hour",
        success_rate: 0.92
      }
    ];

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page: 1,
        limit: 20,
        total: doctors.length,
        total_pages: 1
      }
    });
  } catch (error) {
    console.error('Get enhanced doctor listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve doctor listing'
    });
  }
};

/**
 * Get market insights for patient interface
 * GET /api/two-tier-pricing/market-insights
 */
export const getMarketInsights = async (req, res) => {
  try {
    const insights = [
      {
        service_type: "video_call",
        average_price: 4750,
        price_range: { min: 2000, max: 8000 },
        total_doctors: 45,
        availability_rate: 0.78
      },
      {
        service_type: "chat",
        average_price: 3200,
        price_range: { min: 2000, max: 5000 },
        total_doctors: 32,
        availability_rate: 0.85
      },
      {
        service_type: "in_person",
        average_price: 400,
        price_range: { min: 400, max: 400 },
        total_doctors: 67,
        availability_rate: 0.65
      }
    ];

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
};

/**
 * Get market rates for pricing settings
 * GET /api/two-tier-pricing/market-rates
 */
export const getMarketRates = async (req, res) => {
  try {
    const rates = [
      {
        service_type: "video_call",
        market_average: 4750,
        specialty_average: 5200,
        percentile_25: 3500,
        percentile_75: 6000,
        percentile_90: 7500,
        total_doctors: 45,
        suggested_range: {
          min: 3500,
          max: 6500,
          optimal: 5000
        }
      },
      {
        service_type: "chat",
        market_average: 3200,
        specialty_average: 3500,
        percentile_25: 2500,
        percentile_75: 4000,
        percentile_90: 5000,
        total_doctors: 32,
        suggested_range: {
          min: 2500,
          max: 4500,
          optimal: 3500
        }
      }
    ];

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Get market rates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve market rates'
    });
  }
};

/**
 * Get doctor's current pricing
 * GET /api/two-tier-pricing/doctor/current-pricing
 */
export const getDoctorCurrentPricing = async (req, res) => {
  try {
    const doctorWallet = req.user?.walletAddress || req.user?.id;

    if (!doctorWallet) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('📋 Fetching current pricing for doctor:', doctorWallet);

    // Query actual pricing from database
    let pricingRecord = await db.DoctorServicePricing?.findOne({
      where: { doctorWallet: doctorWallet.toLowerCase() }
    });

    // If no record exists, create default
    if (!pricingRecord) {
      pricingRecord = await db.DoctorServicePricing?.create({
        doctorWallet: doctorWallet.toLowerCase(),
        inPersonFee: 400,
        videoCallFee: 0,
        chatFee: 0,
        acceptsInPerson: true,
        acceptsVideoCalls: false,
        acceptsChat: false
      });
      console.log('✅ Created default pricing record');
    }

    const pricing = {
      doctor_id: doctorWallet,
      services: {
        in_person: { 
          fee: parseFloat(pricingRecord?.inPersonFee || 400), 
          set_by: "system", 
          auto_approve: false 
        }
      },
      last_updated: pricingRecord?.updatedAt || new Date().toISOString()
    };

    // Only include video_call if fee is set
    if (pricingRecord?.videoCallFee > 0) {
      pricing.services.video_call = { 
        fee: parseFloat(pricingRecord.videoCallFee), 
        set_by: "doctor", 
        auto_approve: true 
      };
    }

    // Only include chat if fee is set
    if (pricingRecord?.chatFee > 0) {
      pricing.services.chat = { 
        fee: parseFloat(pricingRecord.chatFee), 
        set_by: "doctor", 
        auto_approve: true 
      };
    }

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Get doctor current pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current pricing',
      message: error.message
    });
  }
};

/**
 * Update doctor's premium pricing
 * PUT /api/two-tier-pricing/doctor/premium-pricing
 */
export const setDoctorPremiumPricing = async (req, res) => {
  try {
    const { video_call_fee, chat_fee } = req.body;
    const doctorWallet = req.user?.walletAddress || req.user?.id;

    if (!doctorWallet) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate fees
    if (video_call_fee && (video_call_fee < 2000 || video_call_fee > 20000)) {
      return res.status(400).json({
        success: false,
        error: 'Video call fee must be between 2,000 and 20,000 ETB'
      });
    }

    if (chat_fee && (chat_fee < 2000 || chat_fee > 20000)) {
      return res.status(400).json({
        success: false,
        error: 'Chat fee must be between 2,000 and 20,000 ETB'
      });
    }

    console.log(`💰 Updating premium pricing for doctor ${doctorWallet}:`, { video_call_fee, chat_fee });

    // Find or create pricing record
    let pricing = await db.DoctorServicePricing?.findOne({
      where: { doctorWallet: doctorWallet.toLowerCase() }
    });

    const updateData = {};
    if (video_call_fee !== undefined) {
      updateData.videoCallFee = video_call_fee;
      updateData.acceptsVideoCalls = video_call_fee > 0;
    }
    if (chat_fee !== undefined) {
      updateData.chatFee = chat_fee;
      updateData.acceptsChat = chat_fee > 0;
    }

    if (pricing) {
      // Update existing record
      await pricing.update(updateData);
      console.log('✅ Updated existing pricing record');
    } else {
      // Create new record
      pricing = await db.DoctorServicePricing?.create({
        doctorWallet: doctorWallet.toLowerCase(),
        inPersonFee: 400, // System fixed rate
        ...updateData
      });
      console.log('✅ Created new pricing record');
    }

    res.json({
      success: true,
      message: 'Premium pricing updated successfully',
      data: {
        doctor_wallet: doctorWallet,
        video_call_fee: pricing?.videoCallFee || video_call_fee,
        chat_fee: pricing?.chatFee || chat_fee,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Set doctor premium pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update premium pricing',
      message: error.message
    });
  }
};

/**
 * Validate pricing
 * POST /api/two-tier-pricing/validate-pricing
 */
export const validatePricing = async (req, res) => {
  try {
    const { service_type, proposed_fee } = req.body;

    if (!service_type || !proposed_fee) {
      return res.status(400).json({
        success: false,
        error: 'Service type and proposed fee are required'
      });
    }

    // Mock validation logic
    const validation = {
      is_valid: proposed_fee >= 2000 && proposed_fee <= 20000,
      warnings: [],
      suggestions: [],
      market_position: 'at_market',
      competitiveness_score: 75
    };

    if (proposed_fee < 2000) {
      validation.warnings.push('Fee is below minimum allowed (2,000 ETB)');
    }
    if (proposed_fee > 20000) {
      validation.warnings.push('Fee is above maximum allowed (20,000 ETB)');
    }
    if (proposed_fee > 6000) {
      validation.suggestions.push('Consider lowering fee to increase booking rate');
    }

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Validate pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate pricing'
    });
  }
};

/**
 * Get doctor pricing history
 * GET /api/two-tier-pricing/doctor/pricing-history
 */
export const getDoctorPricingHistory = async (req, res) => {
  try {
    // Mock data
    const history = [
      {
        id: "hist_001",
        service_type: "video_call",
        old_price: 4500,
        new_price: 5000,
        change_reason: "Market rate adjustment",
        changed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        market_position_before: "at_market",
        market_position_after: "above_market"
      }
    ];

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get pricing history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing history'
    });
  }
};

/**
 * Get doctor revenue analytics
 * GET /api/two-tier-pricing/doctor/revenue-analytics
 */
export const getDoctorRevenueAnalytics = async (req, res) => {
  try {
    // Mock data
    const analytics = [
      {
        period: "Week 1",
        total_revenue: 25000,
        platform_fees: 2500,
        net_earnings: 22500,
        appointment_count: 8,
        average_fee: 3125
      },
      {
        period: "Week 2",
        total_revenue: 32000,
        platform_fees: 3200,
        net_earnings: 28800,
        appointment_count: 10,
        average_fee: 3200
      }
    ];

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve revenue analytics'
    });
  }
};

/**
 * Get doctor market comparison
 * GET /api/two-tier-pricing/doctor/market-comparison
 */
export const getDoctorMarketComparison = async (req, res) => {
  try {
    // Mock data
    const comparison = [
      {
        service_type: "video_call",
        your_price: 5000,
        market_average: 4750,
        specialty_average: 5200,
        percentile_rank: 65,
        competitive_advantage: "above_market",
        booking_impact: -5
      },
      {
        service_type: "chat",
        your_price: 3000,
        market_average: 3200,
        specialty_average: 3500,
        percentile_rank: 45,
        competitive_advantage: "below_market",
        booking_impact: 8
      }
    ];

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Get market comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve market comparison'
    });
  }
};

/**
 * Get doctor pricing analytics
 * GET /api/two-tier-pricing/doctor/pricing-analytics
 */
export const getDoctorPricingAnalytics = async (req, res) => {
  try {
    // Mock data
    const analytics = {
      total_bookings: 45,
      total_revenue: 185000,
      average_booking_value: 4111,
      conversion_rate: 0.72,
      price_sensitivity_score: 68,
      optimal_pricing_suggestions: [
        {
          service_type: "video_call",
          current_price: 5000,
          suggested_price: 4800,
          projected_revenue_impact: 3200
        }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get pricing analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing analytics'
    });
  }
};