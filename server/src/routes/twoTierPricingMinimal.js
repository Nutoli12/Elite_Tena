import express from 'express';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Two-tier pricing routes are working! Updated.',
    timestamp: new Date().toISOString()
  });
});

// System config route
router.get('/system/config', (req, res) => {
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
});

// Enhanced doctor listing
router.get('/doctors/enhanced-listing', (req, res) => {
  try {
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
});

// Market insights
router.get('/market-insights', (req, res) => {
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
});

// Market rates
router.get('/market-rates', (req, res) => {
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
});

// Get pricing for a specific doctor by wallet address
router.get('/doctor/:doctorWallet/pricing', async (req, res) => {
  try {
    const { doctorWallet } = req.params;
    
    console.log('💰 Fetching pricing for doctor:', doctorWallet);
    
    // Get from DoctorServicePricing table (where premium pricing is saved)
    const db = (await import('../models/index.js')).default;
    
    // Query with case-insensitive wallet address
    let pricing = await db.DoctorServicePricing?.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('doctor_wallet')),
        doctorWallet.toLowerCase()
      )
    });

    console.log('📋 Found pricing record:', pricing ? 'Yes' : 'No');

    // Get doctor info - use walletAddress (model field name, not database column)
    const doctor = await db.Doctor?.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('Doctor.walletAddress')),
        doctorWallet.toLowerCase()
      ),
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['name', 'email', 'profileData']
      }]
    });

    // Default pricing if not found
    const defaultPricing = {
      inPerson: { fee: 400, setBy: 'system', autoApprove: true },
      videoCall: { fee: 500, setBy: 'default', autoApprove: false },
      chat: { fee: 300, setBy: 'default', autoApprove: false }
    };

    // Build response using DoctorServicePricing fields
    const videoCallFee = pricing?.videoCallFee ? parseFloat(pricing.videoCallFee) : 0;
    const chatFee = pricing?.chatFee ? parseFloat(pricing.chatFee) : 0;
    
    const response = {
      doctorWallet,
      doctorName: doctor?.user?.profileData?.name || doctor?.user?.name || 'Doctor',
      specialization: doctor?.specialization || 'General',
      services: {
        inPerson: {
          fee: 400, // Always system rate for in-person
          setBy: 'system',
          autoApprove: true,
          description: 'In-person consultation at the clinic'
        },
        videoCall: {
          fee: videoCallFee > 0 ? videoCallFee : defaultPricing.videoCall.fee,
          setBy: videoCallFee > 0 ? 'doctor' : 'default',
          autoApprove: videoCallFee > 0, // Auto-approve if doctor set a price
          description: 'Video call consultation from anywhere'
        },
        chat: {
          fee: chatFee > 0 ? chatFee : defaultPricing.chat.fee,
          setBy: chatFee > 0 ? 'doctor' : 'default',
          autoApprove: chatFee > 0, // Auto-approve if doctor set a price
          description: 'Text-based chat consultation'
        }
      },
      platformFee: 0,
      lastUpdated: pricing?.updated_at || new Date().toISOString()
    };

    console.log('✅ Returning pricing:', {
      inPerson: response.services.inPerson.fee,
      videoCall: response.services.videoCall.fee,
      chat: response.services.chat.fee
    });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get doctor pricing error:', error);
    // Return default pricing on error
    res.json({
      success: true,
      data: {
        doctorWallet: req.params.doctorWallet,
        services: {
          inPerson: { fee: 400, setBy: 'system', autoApprove: true },
          videoCall: { fee: 500, setBy: 'default', autoApprove: false },
          chat: { fee: 300, setBy: 'default', autoApprove: false }
        },
        platformFee: 0
      }
    });
  }
});

// Calculate total price with platform fees
router.post('/calculate-price', (req, res) => {
  try {
    const { serviceType, baseFee, isPremium } = req.body;
    
    const platformFeePercent = isPremium ? 5 : 0; // 5% for premium services
    const platformFee = (baseFee * platformFeePercent) / 100;
    const totalAmount = baseFee + platformFee;

    res.json({
      success: true,
      data: {
        baseFee,
        platformFeePercent,
        platformFee,
        totalAmount,
        breakdown: {
          doctorFee: baseFee,
          platformFee: platformFee,
          total: totalAmount
        }
      }
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate price'
    });
  }
});

// Doctor pricing routes - use database
router.get('/doctor/current-pricing', async (req, res) => {
  try {
    // Get wallet from auth header or query
    const doctorWallet = req.headers['x-wallet-address'] || req.query.wallet || req.user?.walletAddress;
    
    if (!doctorWallet) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - wallet address not found'
      });
    }

    console.log('📋 Fetching current pricing for doctor:', doctorWallet);

    const db = (await import('../models/index.js')).default;
    
    // Query actual pricing from database
    let pricingRecord = await db.DoctorServicePricing?.findOne({
      where: { doctorWallet: doctorWallet.toLowerCase() }
    });

    // If no record exists, create default
    if (!pricingRecord) {
      try {
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
      } catch (createError) {
        console.log('⚠️ Could not create pricing record:', createError.message);
      }
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
      last_updated: pricingRecord?.updated_at || new Date().toISOString()
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
});

router.put('/doctor/premium-pricing', async (req, res) => {
  try {
    const { video_call_fee, chat_fee } = req.body;
    const doctorWallet = req.headers['x-wallet-address'] || req.query.wallet || req.user?.walletAddress;

    if (!doctorWallet) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - wallet address not found'
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

    const db = (await import('../models/index.js')).default;

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
});

router.post('/validate-pricing', (req, res) => {
  try {
    const { service_type, proposed_fee } = req.body;

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
});

// Mock dashboard routes
router.get('/doctor/pricing-history', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

router.get('/doctor/revenue-analytics', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

router.get('/doctor/market-comparison', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

router.get('/doctor/pricing-analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      total_bookings: 45,
      total_revenue: 185000,
      average_booking_value: 4111,
      conversion_rate: 0.72,
      price_sensitivity_score: 68,
      optimal_pricing_suggestions: []
    }
  });
});

export default router;