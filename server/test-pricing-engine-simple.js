/**
 * Simple test for PricingEngine to verify it loads correctly
 */

const PricingEngine = require('./src/services/PricingEngine');

async function testPricingEngine() {
  try {
    console.log('Testing PricingEngine instantiation...');
    const pricingEngine = new PricingEngine();
    
    console.log('✅ PricingEngine created successfully');
    console.log('Cache timeout:', pricingEngine.cacheTimeout);
    
    // Test percentile calculation
    const marketRates = {
      min_rate: 2000,
      max_rate: 8000,
      doctor_count: 10
    };
    
    const percentile = pricingEngine.calculatePercentileRank(marketRates, 5000);
    console.log('✅ Percentile calculation works:', percentile);
    
    // Test market data freshness
    const now = new Date();
    const recentDate = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    const isFresh = pricingEngine.isMarketDataFresh(recentDate, 24);
    console.log('✅ Market data freshness check works:', isFresh);
    
    console.log('🎉 All basic PricingEngine tests passed!');
  } catch (error) {
    console.error('❌ PricingEngine test failed:', error);
    process.exit(1);
  }
}

testPricingEngine();