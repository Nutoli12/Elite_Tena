import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Video, 
  MessageCircle, 
  DollarSign, 
  Info, 
  CheckCircle,
  AlertTriangle,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  BarChart3,
  HelpCircle,
  Star,
  Users
} from 'lucide-react';
import axios from '@/lib/axios';
import { useNotification } from '@/contexts/NotificationContext';

interface PricingData {
  in_person?: { fee: number; set_by: string; auto_approve: boolean };
  video_call?: { fee: number; set_by: string; auto_approve: boolean };
  chat?: { fee: number; set_by: string; auto_approve: boolean };
}

interface MarketRateData {
  service_type: string;
  market_average: number;
  specialty_average: number;
  percentile_25: number;
  percentile_75: number;
  percentile_90: number;
  total_doctors: number;
  your_position?: 'below_market' | 'at_market' | 'above_market' | 'premium';
  suggested_range: {
    min: number;
    max: number;
    optimal: number;
  };
}

interface PricingValidation {
  is_valid: boolean;
  warnings: string[];
  suggestions: string[];
  market_position: string;
  competitiveness_score: number;
}

const PremiumPricingSettings: React.FC = () => {
  const [pricing, setPricing] = useState<PricingData>({});
  const [videoCallFee, setVideoCallFee] = useState<string>('');
  const [chatFee, setChatFee] = useState<string>('');
  const [videoCallEnabled, setVideoCallEnabled] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketRates, setMarketRates] = useState<Record<string, MarketRateData>>({});
  const [pricingValidation, setPricingValidation] = useState<Record<string, PricingValidation>>({});
  const [showMarketInsights, setShowMarketInsights] = useState(false);
  
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchCurrentPricing();
    fetchMarketRates();
  }, []);

  useEffect(() => {
    // Validate pricing when fees change
    if (videoCallFee) {
      validatePricing('video_call', parseFloat(videoCallFee));
    }
    if (chatFee) {
      validatePricing('chat', parseFloat(chatFee));
    }
  }, [videoCallFee, chatFee, marketRates]);

  const fetchCurrentPricing = async () => {
    try {
      const response = await axios.get('/two-tier-pricing/doctor/current-pricing');
      const data = response.data.data.services;
      setPricing(data);
      
      // Set form values
      if (data.video_call) {
        setVideoCallFee(data.video_call.fee.toString());
        setVideoCallEnabled(true);
      }
      if (data.chat) {
        setChatFee(data.chat.fee.toString());
        setChatEnabled(true);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketRates = async () => {
    try {
      const response = await axios.get('/two-tier-pricing/market-rates');
      const marketData = response.data.data;
      
      const ratesMap: Record<string, MarketRateData> = {};
      marketData.forEach((rate: MarketRateData) => {
        ratesMap[rate.service_type] = rate;
      });
      
      setMarketRates(ratesMap);
    } catch (error) {
      console.error('Error fetching market rates:', error);
    }
  };

  const validatePricing = async (serviceType: string, fee: number) => {
    if (!fee || !marketRates[serviceType]) return;

    try {
      const response = await axios.post('/two-tier-pricing/validate-pricing', {
        service_type: serviceType,
        proposed_fee: fee
      });
      
      setPricingValidation(prev => ({
        ...prev,
        [serviceType]: response.data.data
      }));
    } catch (error) {
      console.error('Error validating pricing:', error);
    }
  };

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      const updateData: any = {};
      
      if (videoCallEnabled && videoCallFee) {
        const fee = parseFloat(videoCallFee);
        if (fee < 2000 || fee > 20000) {
          showNotification('Video call fee must be between 2,000 and 20,000 ETB', 'error');
          setSaving(false);
          return;
        }
        updateData.video_call_fee = fee;
      }
      
      if (chatEnabled && chatFee) {
        const fee = parseFloat(chatFee);
        if (fee < 2000 || fee > 20000) {
          showNotification('Chat fee must be between 2,000 and 20,000 ETB', 'error');
          setSaving(false);
          return;
        }
        updateData.chat_fee = fee;
      }

      await axios.put('/two-tier-pricing/doctor/premium-pricing', updateData);
      
      showNotification('Premium pricing updated successfully', 'success');
      fetchCurrentPricing(); // Refresh data
    } catch (error: any) {
      console.error('Error updating pricing:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update pricing', 
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getMarketPositionColor = (position?: string) => {
    switch (position) {
      case 'below_market': return 'text-red-600';
      case 'at_market': return 'text-green-600';
      case 'above_market': return 'text-blue-600';
      case 'premium': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getMarketPositionIcon = (position?: string) => {
    switch (position) {
      case 'below_market': return <TrendingDown className="w-4 h-4" />;
      case 'at_market': return <BarChart3 className="w-4 h-4" />;
      case 'above_market': return <TrendingUp className="w-4 h-4" />;
      case 'premium': return <Star className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const renderMarketInsights = (serviceType: string) => {
    const marketData = marketRates[serviceType];
    const validation = pricingValidation[serviceType];
    
    if (!marketData) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Market Insights
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Based on {marketData.total_doctors} doctors in your specialty</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          {/* Market Position */}
          {validation && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Position:</span>
              <div className={`flex items-center ${getMarketPositionColor(marketData.your_position)}`}>
                {getMarketPositionIcon(marketData.your_position)}
                <span className="ml-1 text-sm font-medium capitalize">
                  {marketData.your_position?.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          {/* Competitiveness Score */}
          {validation && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Competitiveness:</span>
                <span className="text-sm font-medium">
                  {validation.competitiveness_score}/100
                </span>
              </div>
              <Progress 
                value={validation.competitiveness_score} 
                className="h-2"
              />
            </div>
          )}

          {/* Market Ranges */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Market Average:</span>
              <div className="font-medium">{formatPrice(marketData.market_average)}</div>
            </div>
            <div>
              <span className="text-gray-500">Specialty Average:</span>
              <div className="font-medium">{formatPrice(marketData.specialty_average)}</div>
            </div>
            <div>
              <span className="text-gray-500">Suggested Range:</span>
              <div className="font-medium">
                {formatPrice(marketData.suggested_range.min)} - {formatPrice(marketData.suggested_range.max)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Optimal Price:</span>
              <div className="font-medium text-green-600">
                {formatPrice(marketData.suggested_range.optimal)}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (serviceType === 'video_call') {
                  setVideoCallFee(marketData.suggested_range.optimal.toString());
                } else {
                  setChatFee(marketData.suggested_range.optimal.toString());
                }
              }}
              className="text-xs"
            >
              Use Optimal
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (serviceType === 'video_call') {
                  setVideoCallFee(marketData.market_average.toString());
                } else {
                  setChatFee(marketData.market_average.toString());
                }
              }}
              className="text-xs"
            >
              Use Market Avg
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPricingValidation = (serviceType: string) => {
    const validation = pricingValidation[serviceType];
    if (!validation) return null;

    return (
      <div className="mt-2 space-y-2">
        {/* Warnings */}
        {validation.warnings.map((warning, index) => (
          <div key={index} className="flex items-start space-x-2 text-sm text-orange-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        ))}

        {/* Suggestions */}
        {validation.suggestions.map((suggestion, index) => (
          <div key={index} className="flex items-start space-x-2 text-sm text-blue-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{suggestion}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Premium Service Pricing
        </h2>
        <p className="text-gray-600">
          Set your own pricing for premium services. Patients pay your exact fee and get instant confirmation.
        </p>
      </div>

      {/* Pricing System Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            Two-Tier Pricing System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Standard Tier */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Stethoscope className="w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Standard In-Person</h3>
                  <Badge variant="secondary">Fixed by System</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(400)} - All doctors, requires manual approval
                </p>
                {pricing.in_person && (
                  <div className="flex items-center mt-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-xs text-orange-600">
                      Manual approval required
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Services */}
            <div className="space-y-6">
              {/* Market Insights Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Premium Services</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMarketInsights(!showMarketInsights)}
                  className="flex items-center"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showMarketInsights ? 'Hide' : 'Show'} Market Insights
                </Button>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Video Call */}
                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Video className="w-5 h-5 text-purple-600 mr-2" />
                        <CardTitle className="text-lg">Video Call</CardTitle>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                    </div>
                    {marketRates.video_call && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {marketRates.video_call.total_doctors} doctors offering this service
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={videoCallEnabled}
                        onCheckedChange={setVideoCallEnabled}
                      />
                      <Label className="text-sm">Enable video consultations</Label>
                    </div>
                    
                    {videoCallEnabled && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="video-fee" className="text-sm font-medium">
                              Your Fee (2,000 - 20,000 ETB)
                            </Label>
                            {marketRates.video_call && (
                              <span className="text-xs text-gray-500">
                                Market: {formatPrice(marketRates.video_call.market_average)}
                              </span>
                            )}
                          </div>
                          <Input
                            id="video-fee"
                            type="number"
                            min="2000"
                            max="20000"
                            value={videoCallFee}
                            onChange={(e) => setVideoCallFee(e.target.value)}
                            placeholder="e.g., 5000"
                            className={`${
                              pricingValidation.video_call?.is_valid === false 
                                ? 'border-red-300 focus:border-red-500' 
                                : ''
                            }`}
                          />
                        </div>

                        {renderPricingValidation('video_call')}
                        
                        {showMarketInsights && renderMarketInsights('video_call')}
                      </div>
                    )}
                    
                    {pricing.video_call && (
                      <div className="flex items-center p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800">
                            Current: {formatPrice(pricing.video_call.fee)}
                          </div>
                          <div className="text-green-600">Auto-approval enabled</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chat */}
                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageCircle className="w-5 h-5 text-purple-600 mr-2" />
                        <CardTitle className="text-lg">Chat Consultation</CardTitle>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                    </div>
                    {marketRates.chat && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {marketRates.chat.total_doctors} doctors offering this service
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={chatEnabled}
                        onCheckedChange={setChatEnabled}
                      />
                      <Label className="text-sm">Enable chat consultations</Label>
                    </div>
                    
                    {chatEnabled && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="chat-fee" className="text-sm font-medium">
                              Your Fee (2,000 - 20,000 ETB)
                            </Label>
                            {marketRates.chat && (
                              <span className="text-xs text-gray-500">
                                Market: {formatPrice(marketRates.chat.market_average)}
                              </span>
                            )}
                          </div>
                          <Input
                            id="chat-fee"
                            type="number"
                            min="2000"
                            max="20000"
                            value={chatFee}
                            onChange={(e) => setChatFee(e.target.value)}
                            placeholder="e.g., 3000"
                            className={`${
                              pricingValidation.chat?.is_valid === false 
                                ? 'border-red-300 focus:border-red-500' 
                                : ''
                            }`}
                          />
                        </div>

                        {renderPricingValidation('chat')}
                        
                        {showMarketInsights && renderMarketInsights('chat')}
                      </div>
                    )}
                    
                    {pricing.chat && (
                      <div className="flex items-center p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800">
                            Current: {formatPrice(pricing.chat.fee)}
                          </div>
                          <div className="text-green-600">Auto-approval enabled</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <DollarSign className="w-5 h-5 mr-2 text-green-500" />
            Premium Service Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">For You:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Set your own pricing based on expertise</li>
                <li>• Instant payment when patients book</li>
                <li>• No approval delays for premium services</li>
                <li>• Higher income potential</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">For Patients:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Instant confirmation when paying your fee</li>
                <li>• Clear pricing upfront</li>
                <li>• Premium service quality</li>
                <li>• Flexible consultation options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSavePricing}
          disabled={saving || (!videoCallEnabled && !chatEnabled)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? 'Saving...' : 'Save Premium Pricing'}
        </Button>
      </div>
    </div>
  );
};

export default PremiumPricingSettings;