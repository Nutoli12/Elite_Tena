/**
 * Doctor Pricing Dashboard Component
 * 
 * **Feature: enhanced-two-tier-pricing**
 * **Task 6.2: DoctorPricingDashboard component**
 * **Requirements: 2.5, 10.5**
 * 
 * Provides comprehensive pricing management interface with pricing history,
 * analytics views, market comparison tools, and revenue projections.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Users,
  Star,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import axios from '@/lib/axios';
import { useNotification } from '@/contexts/NotificationContext';

interface PricingHistory {
  id: string;
  service_type: string;
  old_price: number;
  new_price: number;
  change_reason: string;
  changed_at: string;
  market_position_before: string;
  market_position_after: string;
}

interface RevenueData {
  period: string;
  total_revenue: number;
  platform_fees: number;
  net_earnings: number;
  appointment_count: number;
  average_fee: number;
}

interface MarketComparison {
  service_type: string;
  your_price: number;
  market_average: number;
  specialty_average: number;
  percentile_rank: number;
  competitive_advantage: 'price_leader' | 'market_rate' | 'premium_positioned' | 'underpriced';
  booking_impact: number;
}

interface PricingAnalytics {
  total_bookings: number;
  total_revenue: number;
  average_booking_value: number;
  conversion_rate: number;
  price_sensitivity_score: number;
  optimal_pricing_suggestions: {
    service_type: string;
    current_price: number;
    suggested_price: number;
    projected_revenue_impact: number;
  }[];
}

const DoctorPricingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [pricingHistory, setPricingHistory] = useState<PricingHistory[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [marketComparison, setMarketComparison] = useState<MarketComparison[]>([]);
  const [analytics, setAnalytics] = useState<PricingAnalytics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [historyRes, revenueRes, marketRes, analyticsRes] = await Promise.all([
        axios.get(`/two-tier-pricing/doctor/pricing-history?period=${timeRange}`),
        axios.get(`/two-tier-pricing/doctor/revenue-analytics?period=${timeRange}`),
        axios.get(`/two-tier-pricing/doctor/market-comparison`),
        axios.get(`/two-tier-pricing/doctor/pricing-analytics?period=${timeRange}`)
      ]);

      setPricingHistory(historyRes.data.data);
      setRevenueData(revenueRes.data.data);
      setMarketComparison(marketRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    showNotification('Dashboard data refreshed', 'success');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getCompetitiveAdvantageColor = (advantage: string) => {
    switch (advantage) {
      case 'price_leader': return 'text-green-600 bg-green-50';
      case 'market_rate': return 'text-blue-600 bg-blue-50';
      case 'premium_positioned': return 'text-purple-600 bg-purple-50';
      case 'underpriced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCompetitiveAdvantageLabel = (advantage: string) => {
    switch (advantage) {
      case 'price_leader': return 'Price Leader';
      case 'market_rate': return 'Market Rate';
      case 'premium_positioned': return 'Premium';
      case 'underpriced': return 'Underpriced';
      default: return 'Unknown';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? formatPrice(analytics.total_revenue) : '---'}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12.5% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.total_bookings || '---'}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8.3% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Booking Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? formatPrice(analytics.average_booking_value) : '---'}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-600">-2.1% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? formatPercentage(analytics.conversion_rate) : '---'}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+5.7% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatPrice(Number(value))} />
                <Area 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="net_earnings" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Optimization Suggestions */}
      {analytics?.optimal_pricing_suggestions && analytics.optimal_pricing_suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Pricing Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.optimal_pricing_suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {suggestion.service_type.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Current: {formatPrice(suggestion.current_price)} → 
                      Suggested: {formatPrice(suggestion.suggested_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      <span className="font-medium">
                        +{formatPrice(suggestion.projected_revenue_impact)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Projected monthly impact</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderMarketAnalysisTab = () => (
    <div className="space-y-6">
      {/* Market Position Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {marketComparison.map((comparison, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg capitalize flex items-center justify-between">
                {comparison.service_type.replace('_', ' ')}
                <Badge className={getCompetitiveAdvantageColor(comparison.competitive_advantage)}>
                  {getCompetitiveAdvantageLabel(comparison.competitive_advantage)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Your Price:</span>
                  <span className="font-medium">{formatPrice(comparison.your_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Market Average:</span>
                  <span className="font-medium">{formatPrice(comparison.market_average)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Specialty Average:</span>
                  <span className="font-medium">{formatPrice(comparison.specialty_average)}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Percentile Rank:</span>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{comparison.percentile_rank}th</span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{ width: `${comparison.percentile_rank}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Booking Impact:</span>
                  <div className="flex items-center">
                    {comparison.booking_impact > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`font-medium ${
                      comparison.booking_impact > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparison.booking_impact > 0 ? '+' : ''}{comparison.booking_impact}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Position Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service_type" />
                <YAxis />
                <Tooltip formatter={(value) => formatPrice(Number(value))} />
                <Bar dataKey="your_price" fill="#8884d8" name="Your Price" />
                <Bar dataKey="market_average" fill="#82ca9d" name="Market Average" />
                <Bar dataKey="specialty_average" fill="#ffc658" name="Specialty Average" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPricingHistoryTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pricingHistory.length > 0 ? (
              pricingHistory.map((change, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium capitalize">
                        {change.service_type.replace('_', ' ')}
                      </h4>
                      <Badge variant="outline">
                        {change.market_position_after}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {change.change_reason}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(change.changed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {formatPrice(change.old_price)}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {formatPrice(change.new_price)}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      {change.new_price > change.old_price ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        change.new_price > change.old_price ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.new_price > change.old_price ? '+' : ''}
                        {formatPrice(change.new_price - change.old_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No pricing changes recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Dashboard</h1>
          <p className="text-gray-600">
            Monitor your pricing performance and market position
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market Analysis</TabsTrigger>
          <TabsTrigger value="history">Pricing History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="market" className="mt-6">
          {renderMarketAnalysisTab()}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {renderPricingHistoryTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorPricingDashboard;