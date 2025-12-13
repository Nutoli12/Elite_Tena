import express from 'express';
import {
  getSystemPricingConfig,
  getEnhancedDoctorListing,
  getMarketInsights,
  getMarketRates,
  getDoctorCurrentPricing,
  setDoctorPremiumPricing,
  validatePricing,
  getDoctorPricingHistory,
  getDoctorRevenueAnalytics,
  getDoctorMarketComparison,
  getDoctorPricingAnalytics
} from '../controllers/twoTierPricingControllerSimple.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Two-tier pricing routes are working!' });
});

// Public routes - Get pricing information
router.get('/system/config', getSystemPricingConfig);

// Enhanced routes for new frontend components
router.get('/doctors/enhanced-listing', getEnhancedDoctorListing);
router.get('/market-insights', getMarketInsights);
router.get('/market-rates', getMarketRates);

// Doctor routes - Set premium pricing
router.put('/doctor/premium-pricing', 
  authenticateToken, 
  requireRole(['doctor']), 
  setDoctorPremiumPricing
);

// Doctor dashboard routes
router.get('/doctor/pricing-history', 
  authenticateToken, 
  requireRole(['doctor']), 
  getDoctorPricingHistory
);

router.get('/doctor/revenue-analytics', 
  authenticateToken, 
  requireRole(['doctor']), 
  getDoctorRevenueAnalytics
);

router.get('/doctor/market-comparison', 
  authenticateToken, 
  requireRole(['doctor']), 
  getDoctorMarketComparison
);

router.get('/doctor/pricing-analytics', 
  authenticateToken, 
  requireRole(['doctor']), 
  getDoctorPricingAnalytics
);

router.get('/doctor/current-pricing', 
  authenticateToken, 
  requireRole(['doctor']), 
  getDoctorCurrentPricing
);

router.post('/validate-pricing', 
  authenticateToken, 
  requireRole(['doctor']), 
  validatePricing
);

export default router;